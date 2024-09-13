import React, { useState } from "react";
import AudioPlayer from "./AudioPlayer";
import Button from "./Button";

const AudioFile = () => {
  const [audioFile, setAudioFile] = useState(null);
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

  const uploadAudio = () => {};

  return (
    <div className="w-full flex justify-center mt-10">
      {!audioFile ? (
        <div className="w-[420px] py-[30px] px-[20px] rounded-[40px] flex justify-center items-center flex-col">
          <div className="border-2 border-dashed border-[#7b2cbf] rounded-[40px] my-[10px] mb-[15px] px-[40px] py-[30px] w-[350px] text-center">
            <span className="material-icons-outlined upload-icon">
              file_upload
            </span>
            <h3>Drag & drop any audio file here</h3>
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
        </div>
      ) : (
        <div className="shadow-md p-4 rounded-md">
          <AudioPlayer audioFile={audioFile} />
          <div className="mt-6 flex gap-x-2 justify-center">
            <Button btnText="Upload" loading={false} loadingText="Uploading" />
            <Button btnText="Clear" onClick={clearSelection} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioFile;
