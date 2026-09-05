"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";
const eventName = "what-ui-theme-change";
function preference(): Theme {
  const saved = document.documentElement.dataset.themePreference;
  return saved === "dark" || saved === "system" ? saved : "light";
}
function applyTheme(value: Theme) {
  document.documentElement.dataset.themePreference = value;
  document.documentElement.dataset.theme = value === "dark" || (value === "system" && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  window.dispatchEvent(new Event(eventName));
}
function subscribe(callback: () => void) {
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
}

export function ThemeSelect() {
  const value = useSyncExternalStore(subscribe, preference, () => "light");
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const updateSystem = () => { if (preference() === "system") applyTheme("system"); };
    const updateStorage = (event: StorageEvent) => {
      if (event.key === "what-ui-theme" || event.key === null) {
        applyTheme(event.newValue === "dark" || event.newValue === "system" ? event.newValue : "light");
      }
    };
    media.addEventListener("change", updateSystem);
    window.addEventListener("storage", updateStorage);
    return () => {
      media.removeEventListener("change", updateSystem);
      window.removeEventListener("storage", updateStorage);
    };
  }, []);
  return <label className="theme-select">
    <span className="sr-only">配色主题</span>
    <span className="theme-swatch" aria-hidden="true" />
    <select aria-label="配色主题" value={value} onChange={(event) => {
      const next = event.target.value as Theme;
      applyTheme(next);
      try { localStorage.setItem("what-ui-theme", next); } catch { /* Session-only fallback. */ }
    }}>
      <option value="light">亮色</option>
      <option value="dark">深色</option>
      <option value="system">跟随系统</option>
    </select>
  </label>;
}
