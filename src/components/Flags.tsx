import type { Flag } from "../lib/types";

export function FlagPill({ flag }: { flag: Flag }) {
  const isError = flag.severity === "error";
  return (
    <span
      title={flag.message}
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
        isError
          ? "bg-red-100 text-red-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {flag.message}
    </span>
  );
}

export function FlagList({ flags }: { flags: Flag[] }) {
  if (flags.length === 0)
    return <span className="text-[10px] text-emerald-600">✓ clean</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((f, i) => (
        <FlagPill key={i} flag={f} />
      ))}
    </div>
  );
}
