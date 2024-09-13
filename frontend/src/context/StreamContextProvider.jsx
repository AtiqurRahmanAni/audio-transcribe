import { createContext, useContext, useRef, useState } from "react";

const StreamContext = createContext();

export const useStreamContext = () => useContext(StreamContext);

export const StreamContextProvider = ({ children }) => {
  const [isGenetating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState([]);
  const [status, setStatus] = useState("Idle");
  const eventSource = useRef(null);

  const uploadFile = async (file) => {
    if (file) {
      const formData = new FormData();
      formData.append("audioFile", file);

      setIsGenerating(true);
      setStreamedText([]);
      setStatus("");
      const response = await fetch(
        import.meta.env.VITE_BACKEND_URL + "/transcribe",
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        const es = new EventSource(
          import.meta.env.VITE_BACKEND_URL + "/transcribe"
        );

        es.onmessage = (event) => {
          // console.log("Event: ", event.data);
          setStreamedText((prev) => [...prev, event.data]);
        };

        es.addEventListener("loadingModel", (event) => {
          setStatus(event.data);
        });

        es.addEventListener("loadingDone", (event) => {
          setStatus(event.data);
        });

        es.addEventListener("generating", (event) => {
          setStatus(event.data);
        });

        es.addEventListener("end", (event) => {
          // console.log("Event: ", event.data);
          es.close();
          setIsGenerating(false);
          setStatus(event.data);
        });

        es.onerror = (error) => {
          console.error("Eventsource error: ", error);
          es.close();
          setIsGenerating(false);
        };

        eventSource.current = es;
      } else {
        console.error("Something went wrong");
        setIsGenerating(false);
      }
    }
  };

  const cancelStreaming = () => {
    if (eventSource.current) {
      eventSource.current.close();
      setStatus("Canceled");
      eventSource.current = null;
    }
    setIsGenerating(false);
  };

  const value = {
    isGenetating,
    streamedText,
    status,
    cancelStreaming,
    uploadFile,
    setIsGenerating,
    setStreamedText,
  };

  return (
    <StreamContext.Provider value={value}>{children}</StreamContext.Provider>
  );
};
