
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { initPWA } from "./utils/pwa";

  // Initialize PWA features (service worker registration, install prompts)
  initPWA();

  createRoot(document.getElementById("root")!).render(<App />);
  