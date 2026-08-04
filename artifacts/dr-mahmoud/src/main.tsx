import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeTheme } from "@/lib/theme";

initializeTheme();
createRoot(document.getElementById("root")!).render(<App />);

// ── PWA Service Worker Registration ─────────────────────────────────────────
if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js?v=5-safe-refresh", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        // Check for updates every time the page loads
        registration.update().catch(() => {});
      })
      .catch(() => {
        // SW registration failed silently — app still works normally
      });
  });
}
