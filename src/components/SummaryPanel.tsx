// At-a-glance fit numbers and seatpost/rail feasibility for the active scenario.

import type { FitTarget, SaddleSolution, SeatpostInsertionCheck } from "../lib/types";
import { computedDrop, computedReach } from "../lib/scenario";
import { Section } from "./ui";
import { FlagList } from "./Flags";

export default function SummaryPanel({
  target,
  saddle,
  seatpostInsertion,
}: {
  target: FitTarget;
  saddle?: SaddleSolution;
  seatpostInsertion?: SeatpostInsertionCheck;
}) {
  return (
    <Section title="Fit summary">
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <Stat
          label={target.handMode === "clamp" ? "Clamp X" : "Hood X"}
          value={`${target.hand.x.toFixed(0)} mm`}
        />
        <Stat
          label={target.handMode === "clamp" ? "Clamp Y" : "Hood Y"}
          value={`${target.hand.y.toFixed(0)} mm`}
        />
        {saddle && (
          <>
            <Stat label="Nose→hand reach" value={`${computedReach(saddle, target.hand).toFixed(0)} mm`} />
            <Stat label="Saddle→hand drop" value={`${computedDrop(saddle, target.hand).toFixed(0)} mm`} />
          </>
        )}
        <Stat label="Setback to nose" value={`${target.saddle.setbackToNose.toFixed(0)} mm`} />
        <Stat label="Saddle height" value={`${target.saddle.saddleHeight.toFixed(0)} mm`} />
      </dl>

      {saddle && (
        <div className="mt-3 rounded border border-slate-100 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Seatpost / rails
            </span>
            <span
              className={`text-[10px] font-medium ${
                saddle.feasible
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {saddle.feasible ? "feasible" : "not feasible"}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Needs ~{saddle.requiredOffset.toFixed(0)}mm setback.
            {saddle.recommended
              ? ` Use ${saddle.recommended.name}` +
                (saddle.railClampOffset != null
                  ? ` — clamp ${saddle.railClampOffset.toFixed(0)}mm along the usable rail.`
                  : ".")
              : ""}
          </p>
          <div className="mt-1">
            <FlagList flags={saddle.flags} />
          </div>
        </div>
      )}

      {seatpostInsertion && (
        <div className="mt-3 rounded border border-slate-100 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Seatpost insertion
            </span>
            <span
              className={`text-[10px] font-medium ${
                seatpostInsertion.feasible
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {seatpostInsertion.feasible ? "feasible" : "not feasible"}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Needs {seatpostInsertion.requiredExposedLength.toFixed(0)}mm of post
            exposed above the frame
            {seatpostInsertion.maxSafeExposure != null && seatpostInsertion.post
              ? ` — ${seatpostInsertion.post.name} allows up to ${seatpostInsertion.maxSafeExposure.toFixed(
                  0
                )}mm safely.`
              : "."}
          </p>
          <div className="mt-1">
            <FlagList flags={seatpostInsertion.flags} />
          </div>
        </div>
      )}
    </Section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-mono text-slate-800 dark:text-slate-100">{value}</dd>
    </>
  );
}
