import React, { useState } from "react";
import AudioPlayer from "./AudioPlayer";
import Button from "./Button";
import { useStreamContext } from "../context/StreamContextProvider";
import { FaUpload } from "react-icons/fa";

const AudioFile = () => {
  const [audioFile, setAudioFile] = useState(null);
  const { uploadFile, isGenetating, cancelStreaming } = useStreamContext();

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const onFileSelect = (e) => {
    const files = e.target.files;

    if (files.length > 0) {
      const file = files[0];

      if (file.size > MAX_FILE_SIZE) {
        console.log("Max 10MB is allowed");
        return;
      }
      setAudioFile(file);
    }
  };

  const clearSelection = () => {
    setAudioFile(null);
  };

  return (
    <div className="mx-4 self-center">
      {!audioFile ? (
        <div className="border-2 border-dashed border-[#7b2cbf] rounded-xl flex justify-center items-center flex-col my-[10px] mb-[15px] px-[40px] pt-[30px] pb-[20px] w-[350px] text-center">
          <div className="text-gray-600 text-xl">
            <FaUpload />
          </div>
          <h3 className="">Drag & drop any audio file here</h3>
          <label className="label">
            or
            <span className="relative -top-[25px]">
              <input
                type="file"
                accept=".mp3"
                className="opacity-0"
                onChange={onFileSelect}
              />
              <span className="text-[#7b2cbf] font-extrabold cursor-pointer">
                browse file
              </span>{" "}
              from device
            </span>
          </label>
        </div>
      ) : (
        <div className="p-4 rounded-xl border-2 border-dashed border-[#7b2cbf] my-4">
          <AudioPlayer audioFile={audioFile} />
          <div className="mt-6 flex gap-x-2 justify-center">
            {!isGenetating ? (
              <>
                <Button
                  btnText="Transcribe"
                  loading={false}
                  loadingText="Uploading"
                  onClick={() => uploadFile(audioFile)}
                />
                <Button btnText="Clear Selection" onClick={clearSelection} />
              </>
            ) : (
              <Button btnText="Cancel" onClick={cancelStreaming} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioFile;
