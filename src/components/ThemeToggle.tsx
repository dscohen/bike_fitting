import { useTheme } from "../lib/theme";

export default function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle color theme"
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-slate-300 transition dark:bg-slate-600"
    >
      <span
        className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white text-[10px] leading-none shadow transition-transform ${
          isDark ? "translate-x-5" : "translate-x-0.5"
        }`}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
