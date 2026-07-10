// Light/dark theme: persisted to localStorage, defaulting to the OS
// preference on first visit. index.html applies the initial class before
// React mounts so there's no flash of the wrong theme.

import { useEffect, useState } from "react";

const STORAGE_KEY = "bikegeo-theme";
export type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  try {
    if (typeof window.matchMedia === "function") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
  } catch {
    // matchMedia unavailable/unimplemented (e.g. SSR or some test envs) — default to light.
  }
  return "light";
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return [theme, toggle];
}
