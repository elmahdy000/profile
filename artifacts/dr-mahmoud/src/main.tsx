import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// ── PWA Service Worker Registration ─────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Check for updates every time the page loads
        registration.update().catch(() => {});
      })
      .catch(() => {
        // SW registration failed silently — app still works normally
      });
  });
}
