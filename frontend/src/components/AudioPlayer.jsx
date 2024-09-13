import React, { useEffect, useRef, useState } from "react";
import { FaPlayCircle, FaPauseCircle } from "react-icons/fa";

const AudioPlayer = ({ audioFile }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);
  const [audioDuration, setAudioDuration] = useState("");
  const [timePlayed, setTimePlayed] = useState(0);
  const audioPlayer = useRef(null);

  const togglePlay = () => {
    if (isPlaying) {
      audioPlayer.current.pause();
    } else {
      audioPlayer.current.play();
    }
    setIsPlaying((prev) => !prev);
  };

  useEffect(() => {
    if (audioFile) {
      const objectURL = URL.createObjectURL(audioFile);
      setAudioSrc(objectURL);
      return () => URL.revokeObjectURL(objectURL);
    }
  }, [audioFile]);

  // for loading audio total duration
  useEffect(() => {
    const updateAudioDuration = () => {
      const seconds = Math.floor(audioPlayer.current.duration);
      setAudioDuration(seconds);
    };

    const currentAudioPlayer = audioPlayer.current;

    if (currentAudioPlayer) {
      currentAudioPlayer.addEventListener(
        "loadedmetadata",
        updateAudioDuration
      );
    }

    return () => {
      if (currentAudioPlayer) {
        currentAudioPlayer.removeEventListener(
          "loadedmetadata",
          updateAudioDuration
        );
      }
    };
  }, [audioFile]);

  // for tracking current time
  useEffect(() => {
    const updateCurrentTime = () => {
      const time = Math.floor(audioPlayer.current.currentTime);
      setTimePlayed(time);
    };

    const currentAudioPlayer = audioPlayer.current;

    if (currentAudioPlayer) {
      currentAudioPlayer.addEventListener("timeupdate", updateCurrentTime);
    }

    return () => {
      if (currentAudioPlayer) {
        currentAudioPlayer.removeEventListener("timeupdate", updateCurrentTime);
      }
    };
  }, []);

  const calculateTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 50);
    const minuteStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${minuteStr}:${secondsStr}`;
  };

  const seekAudio = (e) => {
    const time = e.target.value;
    setTimePlayed(time);
    audioPlayer.current.currentTime = time;
  };

  return (
    <div>
      <audio ref={audioPlayer} src={audioSrc} preload="metadata"></audio>
      <div className="flex justify-center items-center gap-x-4">
        <div className="w-10">{calculateTime(timePlayed)}</div>
        <div>
          <input
            className="audio-slider h-[10px] min-w-[300px]"
            type="range"
            min={0}
            max={audioDuration}
            step={1}
            onChange={seekAudio}
            value={timePlayed}
          />
        </div>
        <div className="w-10">{calculateTime(audioDuration)}</div>
      </div>
      <div className="flex justify-center mt-4">
        <button onClick={togglePlay} className="text-4xl text-[#7b2cbf]">
          {isPlaying ? <FaPlayCircle /> : <FaPauseCircle />}
        </button>
      </div>
    </div>
  );
};

export default AudioPlayer;
