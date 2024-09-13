import { useEffect, useRef } from "react";
import "./App.css";
import AudioFile from "./components/AudioFile";
import { useStreamContext } from "./context/StreamContextProvider";

const App = () => {
  const { streamedText, status } = useStreamContext();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamedText]);

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row max-w-[1920px]">
      <AudioFile />
      <div className="px-10 lg:px-0 lg:mt-6 flex-1">
        <div className="flex font-semibold">
          <h1>Timestamp</h1>
          <h1 className="ml-56">Text</h1>
          <h1 className="ml-60">Status: {status}</h1>
        </div>
        <div
          className="overflow-y-scroll max-h-[calc(100vh-235px)] lg:max-h-[calc(100vh-50px)]"
          ref={scrollRef}
        >
          <ul className="space-y-1">
            {streamedText.map((item, idx) => (
              <li
                key={idx}
                className="py-2 px-1 bg-gray-100 border border-dashed border-gray-300 rounded-md flex"
              >
                <div className="min-w-[220px]">
                  {item.substring(0, item.indexOf("]") + 1)}
                </div>
                <div className="flex-1">
                  {item.slice(item.indexOf("]") + 1)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;
