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
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        {right}
      </header>
      {children}
    </section>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  unit = "mm",
  step = 1,
  placeholder,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  unit?: string;
  step?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-slate-600">{label}</span>
      <div className="flex items-center rounded border border-slate-300 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500">
        <input
          type="number"
          step={step}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
          className="w-full bg-transparent px-2 py-1 text-sm outline-none"
        />
        <span className="px-2 text-[10px] text-slate-400">{unit}</span>
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
      <span className="text-slate-600">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
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
    default: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    primary: "bg-sky-600 text-white hover:bg-sky-700",
    ghost: "text-slate-500 hover:bg-slate-100",
    danger: "border border-red-300 bg-white text-red-600 hover:bg-red-50",
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
