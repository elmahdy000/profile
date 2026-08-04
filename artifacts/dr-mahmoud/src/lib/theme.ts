import { useSyncExternalStore } from "react";

export type AppTheme = "light" | "dark";
const STORAGE_KEY = "app-theme";
const LEGACY_STORAGE_KEY = "dr_mahmoud_theme";
const listeners = new Set<() => void>();

function preferredTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

let currentTheme: AppTheme = preferredTheme();

export function applyTheme(theme: AppTheme) {
  currentTheme = theme;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  root.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  listeners.forEach((listener) => listener());
}

export function initializeTheme() { applyTheme(preferredTheme()); }
export function toggleTheme() { applyTheme(currentTheme === "dark" ? "light" : "dark"); }

export function useAppTheme() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => currentTheme,
    () => "light" as AppTheme,
  );
}
