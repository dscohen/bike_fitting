// Small shared UI primitives.

import type { ReactNode } from "react";

export function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title}
        </h2>
        {right}
      </header>
      {children}
    </section>
  );
}

/** Small "?" badge that reveals an explanation on hover (pure CSS, no JS state). */
export function HelpTip({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 inline-flex items-center">
      <span
        tabIndex={0}
        className="flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-slate-300 text-[9px] font-bold leading-none text-slate-400 hover:border-slate-400 hover:text-slate-600 focus:border-slate-400 focus:text-slate-600 focus:outline-none dark:border-slate-600 dark:text-slate-500 dark:hover:border-slate-500 dark:hover:text-slate-300 dark:focus:border-slate-500 dark:focus:text-slate-300"
      >
        ?
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-52 -translate-x-1/2 rounded bg-slate-800 px-2 py-1.5 text-[10px] font-normal normal-case leading-snug text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-slate-700">
        {text}
      </span>
    </span>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  unit = "mm",
  step = 1,
  placeholder,
  help,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  unit?: string;
  step?: number;
  placeholder?: string;
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="flex items-center text-slate-600 dark:text-slate-300">
        {label}
        {help && <HelpTip text={help} />}
      </span>
      <div className="flex items-center rounded border border-slate-300 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 dark:border-slate-600 dark:focus-within:border-sky-400 dark:focus-within:ring-sky-400">
        <input
          type="number"
          step={step}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
          className="w-full bg-transparent px-2 py-1 text-sm text-slate-800 outline-none dark:text-slate-100"
        />
        <span className="px-2 text-[10px] text-slate-400 dark:text-slate-500">{unit}</span>
      </div>
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-400"
      />
    </label>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "ghost" | "danger";
  title?: string;
}) {
  const styles: Record<string, string> = {
    default:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
    primary: "bg-sky-600 text-white hover:bg-sky-700",
    ghost: "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
    danger:
      "border border-red-300 bg-white text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950",
  };
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded px-2.5 py-1 text-xs font-medium transition ${styles[variant]}`}
    >
      {children}
    </button>
  );
}
