import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { StreamContextProvider } from "./context/StreamContextProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StreamContextProvider>
      <App />
    </StreamContextProvider>
  </StrictMode>
);
