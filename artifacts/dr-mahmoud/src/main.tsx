import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeTheme } from "@/lib/theme";

initializeTheme();
createRoot(document.getElementById("root")!).render(<App />);

// ── Chunk Load / Dynamic Import Error Recovery ──────────────────────────────
function handleChunkError(error: unknown) {
  const msg = String((error as Error)?.message || error || "");
  if (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Loading chunk")
  ) {
    const key = "last_chunk_reload";
    const lastReload = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - lastReload > 10000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  }
}
window.addEventListener("error", (event) => handleChunkError(event.error || event.message));
window.addEventListener("unhandledrejection", (event) => handleChunkError(event.reason));

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

