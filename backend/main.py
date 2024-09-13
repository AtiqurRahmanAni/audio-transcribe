from fastapi import FastAPI, File, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import whisper
import torch
import os
import warnings
import torch
import gc
import asyncio
from concurrent.futures import ThreadPoolExecutor
from whisper.audio import (
    HOP_LENGTH,
    N_FRAMES,
    N_SAMPLES,
    SAMPLE_RATE,
    log_mel_spectrogram,
    pad_or_trim,
)
from whisper.decoding import DecodingOptions, DecodingResult
from whisper.tokenizer import LANGUAGES, get_tokenizer
from whisper.utils import (
    exact_div,
    format_timestamp,
    make_safe,
)
import subprocess
from utils import deleteFiles

os.environ['HSA_OVERRIDE_GFX_VERSION'] = '10.3.0'
os.environ['HIP_VISIBLE_DEVICES'] = '0'

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)
device = "cuda:0" if torch.cuda.is_available() else "cpu"

UPLOAD_DIR = "./uploaded_files"

html = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stream Example</title>
</head>
<body>
    <h1>Streaming Messages</h1>
    <button id="start-stream">Start Stream</button>
    <ul id="messages"></ul>
    <script>
        let eventSource;

        document.getElementById('start-stream').addEventListener('click', () => {
            if (eventSource) {
                eventSource.close();  // Close any existing connection
            }
            eventSource = new EventSource('http://127.0.0.1:8000/transcribe');
            
            eventSource.onmessage = function(event) {
                const message = document.createElement('li');
                message.textContent = event.data;
                document.getElementById('messages').appendChild(message);
            };
            
            eventSource.onerror = function() {
                console.error('Error occurred');
                eventSource.close();
            };
        });
    </script>
</body>
</html>
"""

executor = ThreadPoolExecutor(max_workers=1)


async def event_stream(audio):
    
    gc.collect()
    torch.cuda.empty_cache()

    yield "event: loadingModel\ndata: Loading model\n\n"

    loop = asyncio.get_running_loop()
    model = await loop.run_in_executor(executor, whisper.load_model, "medium", device)

    yield "event: loadingDone\ndata: Model loaded\n\n"

    # audio = "../../01-audiotrack_01.mp3"
    temperature = 0.25
    compression_ratio_threshold = 2.4
    logprob_threshold = -1.0
    no_speech_threshold = 1
    initial_prompt = None
    decode_options = {}

    dtype = torch.float32
    if model.device == torch.device("cpu"):
        if torch.cuda.is_available():
            warnings.warn("Performing inference on CPU when CUDA is available")
        if dtype == torch.float16:
            warnings.warn("FP16 is not supported on CPU; using FP32 instead")
            dtype = torch.float32

    if dtype == torch.float32:
        decode_options["fp16"] = False

    # Pad 30-seconds of silence to the input audio, for slicing
    # mel = log_mel_spectrogram(audio, model.dims.n_mels, padding=N_SAMPLES)
    mel = await loop.run_in_executor(executor, log_mel_spectrogram, audio, model.dims.n_mels, N_SAMPLES)
    content_frames = mel.shape[-1] - N_FRAMES

    if not model.is_multilingual:
        decode_options["language"] = "en"
    else:
        # print(
        #     "Detecting language using up to the first 30 seconds. Use `--language` to specify the language"
        # )

        mel_segment = await loop.run_in_executor(executor, pad_or_trim, mel, N_FRAMES)
        mel_segment = mel_segment.to(model.device).to(dtype)
        # mel_segment = pad_or_trim(mel, N_FRAMES).to(model.device).to(dtype)
        _, probs = await loop.run_in_executor(executor, model.detect_language, mel_segment)
        # _, probs = model.detect_language(mel_segment)
        decode_options["language"] = max(probs, key=probs.get)
        # print(
        #     f"Detected language: {LANGUAGES[decode_options['language']].title()}"
        # )
        # yield f"data: Detected language: {LANGUAGES[decode_options['language']].title()}\n\n"

    language = None
    task = decode_options.get("task", "transcribe")
    tokenizer = get_tokenizer(
        model.is_multilingual,
        num_languages=model.num_languages,
        language=language,
        task=task,
    )

    def decode_with_fallback(segment: torch.Tensor) -> DecodingResult:
        temperatures = (
            [temperature] if isinstance(
                temperature, (int, float)) else temperature
        )
        decode_result = None

        for t in temperatures:
            kwargs = {**decode_options}
            if t > 0:
                # disable beam_size and patience when t > 0
                kwargs.pop("beam_size", None)
                kwargs.pop("patience", None)
            else:
                # disable best_of when t == 0
                kwargs.pop("best_of", None)

            options = DecodingOptions(**kwargs, temperature=t)
            decode_result = model.decode(segment, options)

            needs_fallback = False
            if (
                compression_ratio_threshold is not None
                and decode_result.compression_ratio > compression_ratio_threshold
            ):
                needs_fallback = True  # too repetitive
            if (
                logprob_threshold is not None
                and decode_result.avg_logprob < logprob_threshold
            ):
                needs_fallback = True  # average log probability is too low
            if (
                no_speech_threshold is not None
                and decode_result.no_speech_prob > no_speech_threshold
            ):
                needs_fallback = False  # silence
            if not needs_fallback:
                break

        return decode_result

    seek = 0
    input_stride = exact_div(
        N_FRAMES, model.dims.n_audio_ctx
    )  # mel frames per output token: 2
    time_precision = (
        input_stride * HOP_LENGTH / SAMPLE_RATE
    )  # time per output token: 0.02 (seconds)
    all_tokens = []
    prompt_reset_since = 0

    if initial_prompt is not None:
        initial_prompt_tokens = tokenizer.encode(" " + initial_prompt.strip())
        all_tokens.extend(initial_prompt_tokens)
    else:
        initial_prompt_tokens = []

    def new_segment(
        *, start: float, end: float, tokens: torch.Tensor, result: DecodingResult
    ):
        tokens = tokens.tolist()
        text_tokens = [token for token in tokens if token < tokenizer.eot]
        return {
            "seek": seek,
            "start": start,
            "end": end,
            "text": tokenizer.decode(text_tokens),
            "tokens": tokens,
            "temperature": result.temperature,
            "avg_logprob": result.avg_logprob,
            "compression_ratio": result.compression_ratio,
            "no_speech_prob": result.no_speech_prob,
        }

    yield "event: generating\ndata: Generating\n\n"

    while seek < content_frames:
        time_offset = float(seek * HOP_LENGTH / SAMPLE_RATE)
        mel_segment = mel[:, seek: seek + N_FRAMES]
        segment_size = min(N_FRAMES, content_frames - seek)
        segment_duration = segment_size * HOP_LENGTH / SAMPLE_RATE
        mel_segment = await loop.run_in_executor(executor, pad_or_trim, mel_segment, N_FRAMES)
        mel_segment = mel_segment.to(model.device).to(dtype)

        decode_options["prompt"] = all_tokens[prompt_reset_since:]
        # result = await loop.run_in_executor(executor, decode_with_fallback, mel_segment)
        result = decode_with_fallback(mel_segment)
        tokens = torch.tensor(result.tokens)

        if no_speech_threshold is not None:
            # no voice activity check
            should_skip = result.no_speech_prob > no_speech_threshold
            if (
                logprob_threshold is not None
                and result.avg_logprob > logprob_threshold
            ):
                # don't skip if the logprob is high enough, despite the no_speech_prob
                should_skip = False

            if should_skip:
                seek += segment_size  # fast-forward to the next segment boundary
                continue

        current_segments = []

        timestamp_tokens = tokens.ge(tokenizer.timestamp_begin)
        single_timestamp_ending = timestamp_tokens[-2:].tolist() == [
            False, True]

        consecutive = torch.where(
            timestamp_tokens[:-1] & timestamp_tokens[1:])[0]
        consecutive.add_(1)
        if len(consecutive) > 0:
            # if the output contains two consecutive timestamp tokens
            slices = consecutive.tolist()
            if single_timestamp_ending:
                slices.append(len(tokens))

            last_slice = 0
            for current_slice in slices:
                sliced_tokens = tokens[last_slice:current_slice]
                start_timestamp_pos = (
                    sliced_tokens[0].item() - tokenizer.timestamp_begin
                )
                end_timestamp_pos = (
                    sliced_tokens[-1].item() - tokenizer.timestamp_begin
                )
                current_segments.append(
                    new_segment(
                        start=time_offset + start_timestamp_pos * time_precision,
                        end=time_offset + end_timestamp_pos * time_precision,
                        tokens=sliced_tokens,
                        result=result,
                    )
                )
                last_slice = current_slice

            if single_timestamp_ending:
                # single timestamp at the end means no speech after the last timestamp.
                seek += segment_size
            else:
                # otherwise, ignore the unfinished segment and seek to the last timestamp
                last_timestamp_pos = (
                    tokens[last_slice - 1].item() - tokenizer.timestamp_begin
                )
                seek += last_timestamp_pos * input_stride
        else:
            duration = segment_duration
            timestamps = tokens[timestamp_tokens.nonzero().flatten()]
            if (
                len(timestamps) > 0
                and timestamps[-1].item() != tokenizer.timestamp_begin
            ):
                # no consecutive timestamps but it has a timestamp; use the last one.
                last_timestamp_pos = (
                    timestamps[-1].item() - tokenizer.timestamp_begin
                )
                duration = last_timestamp_pos * time_precision

            current_segments.append(
                new_segment(
                    start=time_offset,
                    end=time_offset + duration,
                    tokens=tokens,
                    result=result,
                )
            )
            seek += segment_size

        for segment in current_segments:
            start, end, text = segment["start"], segment["end"], segment["text"]
            line = f"[{format_timestamp(start)} --> {format_timestamp(end)}] {text}"
            line = make_safe(line)
            # print(line)
            yield f'data: {line}\n\n'

    yield "event: end\ndata: Done\n\n"
    del model
    gc.collect()
    torch.cuda.empty_cache()


@app.post("/transcribe")
async def upload_file(audioFile: UploadFile):

    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
    else:
        deleteFiles()

    file_path = os.path.join(UPLOAD_DIR, audioFile.filename)

    with open(file_path, "wb") as f:
        contents = await audioFile.read()
        f.write(contents)

    return {"message": "File uploaded successfully"}
    
@app.get("/transcribe")
async def transcribe():
    file_path = os.path.join(UPLOAD_DIR, os.listdir(UPLOAD_DIR)[0])
    return StreamingResponse(event_stream(file_path), media_type="text/event-stream")

@app.get("/")
async def get():
    return HTMLResponse(html)
