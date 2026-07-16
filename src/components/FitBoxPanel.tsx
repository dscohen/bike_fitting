// Bird's-eye view of how much fitting range a bike + bar actually gives you:
// the set of hand positions reachable with a comfortable stem band, nested
// inside the wider workable band, with the rider's target plotted against it.

import type { FitEnvelope } from "../lib/types";
import { Section, HelpTip } from "./ui";
import { EnvelopeChart, CORE, WARN, TARGET } from "./EnvelopeChart";

export default function FitBoxPanel({ envelope }: { envelope: FitEnvelope }) {
  const e = envelope;
  const verdict = e.inCore
    ? { label: "in range", cls: "text-emerald-600 dark:text-emerald-400" }
    : e.inWarn
    ? { label: "at the limit", cls: "text-amber-600 dark:text-amber-400" }
    : { label: "out of range", cls: "text-red-600 dark:text-red-400" };

  return (
    <Section
      title="Fit range"
      right={<span className={`text-[10px] font-medium ${verdict.cls}`}>{verdict.label}</span>}
    >
      <p className="flex items-center text-[10px] text-slate-400 dark:text-slate-500">
        {e.handMode === "clamp"
          ? "Reachable bar/stem clamp positions"
          : `Reachable hood positions with ${e.bar?.name ?? "this bar"}`}
        <HelpTip
          text={`Every hand position this frame can reach, sweeping stems from ${e.stemCore[0]}–${e.stemCore[1]}mm (comfortable) and ${e.stemWarn[0]}–${e.stemWarn[1]}mm (workable) across 0–${e.spacerMax}mm of spacers at every stem angle.`}
        />
      </p>

      <EnvelopeChart envelope={e} />

      <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
        <Swatch color={CORE} label={`${e.stemCore[0]}–${e.stemCore[1]}mm stems`} />
        <Swatch color={WARN} label={`${e.stemWarn[0]}–${e.stemWarn[1]}mm`} dashed />
        <span className="flex items-center gap-1">
          <svg width="9" height="9" aria-hidden>
            <line x1="0" y1="4.5" x2="9" y2="4.5" stroke={TARGET} strokeWidth="1.5" />
            <line x1="4.5" y1="0" x2="4.5" y2="9" stroke={TARGET} strokeWidth="1.5" />
          </svg>
          target
        </span>
      </div>

      <p className="mt-1.5 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
        {e.room ? (
          <>
            Room before leaving the comfortable range:{" "}
            <span className="font-medium">{e.room.forward.toFixed(0)}mm</span> forward,{" "}
            <span className="font-medium">{e.room.back.toFixed(0)}mm</span> back,{" "}
            <span className="font-medium">{e.room.up.toFixed(0)}mm</span> up,{" "}
            <span className="font-medium">{e.room.down.toFixed(0)}mm</span> down.
          </>
        ) : e.inWarn ? (
          <>
            Sits <span className="font-medium">{e.coreDistance.toFixed(0)}mm</span>{" "}
            outside the comfortable range — reachable with a stem near{" "}
            {e.stemWarn[0]}mm or {e.stemWarn[1]}mm, but with no room to spare.
          </>
        ) : (
          <>
            Sits <span className="font-medium">{e.warnDistance.toFixed(0)}mm</span>{" "}
            beyond anything a reasonable stem reaches on this frame — needs a
            different frame size, bar reach, or target.
          </>
        )}
      </p>
    </Section>
  );
}

function Swatch({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="flex items-center gap-1">
      <svg width="12" height="9" aria-hidden>
        <rect
          x="0.5"
          y="0.5"
          width="11"
          height="8"
          fill={color}
          fillOpacity={0.18}
          stroke={color}
          strokeDasharray={dashed ? "2 2" : undefined}
        />
      </svg>
      {label}
    </span>
  );
}
