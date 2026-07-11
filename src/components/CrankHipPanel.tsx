// Crank length as a fit variable. Shows the hip angle at top-dead-center for the
// current crank, and — when a different target crank is entered — how much the
// hip opens and the equivalent saddle-back / bar-drop moves that hold the hip
// angle constant, with an iso-hip-angle trade-off chart.

import { useState } from "react";
import type { HipModelResult, Permutation } from "../lib/types";
import { DEFAULT_CRANK } from "../lib/biomech";
import { Section, NumberField, HelpTip } from "./ui";
import { FlagList } from "./Flags";

interface Props {
  hip?: HipModelResult;
  crankCurrent?: number;
  crankTarget?: number;
  onChange: (patch: { crankCurrent?: number; crankTarget?: number }) => void;
  // Solve the nearest stem+bar combo for a point on the trade-off curve
  // (dx = saddle-back, dy = bar-drop), respecting the scenario's bar constraints.
  comboForPoint?: (dx: number, dy: number) => Permutation | undefined;
}

const bodySourceNote: Record<HipModelResult["body"]["source"], string> = {
  measured: "using your entered body segments",
  "from-height": "derived from rider height",
  estimated: "estimated from saddle height (add rider height for accuracy)",
};

export default function CrankHipPanel({
  hip,
  crankCurrent,
  crankTarget,
  onChange,
  comboForPoint,
}: Props) {
  const t = hip?.tradeoff;

  return (
    <Section title="Cranks & hip angle">
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Current crank"
          value={crankCurrent}
          placeholder={String(DEFAULT_CRANK)}
          step={2.5}
          onChange={(v) => onChange({ crankCurrent: v })}
          help="The rider's present crank length. The hip angle below is evaluated at the top of the pedal stroke for this crank."
        />
        <NumberField
          label="Target crank"
          value={crankTarget}
          placeholder="compare…"
          step={2.5}
          onChange={(v) => onChange({ crankTarget: v })}
          help="A 'what if' crank length. Shortening it (and raising the saddle to keep leg extension) opens the top of the stroke by twice the change, opening the hip — which you can spend on saddle setback or bar drop."
        />
      </div>

      {!hip || !hip.feasible ? (
        <div className="mt-3 text-xs">
          <FlagList flags={hip?.flags ?? []} />
          {(!hip || hip.flags.length === 0) && (
            <p className="text-slate-500 dark:text-slate-400">
              Enter the rider fit to see the hip angle.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <Stat label="Hip angle (top)" value={`${hip.hipAngleDeg.toFixed(1)}°`} />
            <Stat label="Back angle" value={`${hip.backAngleDeg.toFixed(1)}°`} />
          </div>
          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
            {bodySourceNote[hip.body.source]}.
          </p>

          {t && t.feasible ? (
            <div className="mt-3 rounded border border-slate-100 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-medium">
                  {t.crankCurrent} → {t.crankTarget}mm
                </span>{" "}
                {directionWord(t.topOpeningMm, "opens", "closes")} the top by{" "}
                <span className="font-medium">
                  {Math.abs(t.topOpeningMm).toFixed(0)}mm
                </span>
                , {directionWord(t.deltaHipDeg, "opening", "closing")} the hip{" "}
                <span className="font-medium">
                  {Math.abs(t.deltaHipDeg).toFixed(1)}°
                </span>
                .
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {directionWord(t.crankCurrent - t.crankTarget, "Raise", "Lower")}{" "}
                the saddle{" "}
                <span className="font-medium">
                  {Math.abs(t.crankCurrent - t.crankTarget).toFixed(1)}mm
                </span>{" "}
                to keep leg extension — with the bars fixed that also{" "}
                {directionWord(t.implicitDropMm, "adds", "removes")}{" "}
                <span className="font-medium">
                  {Math.abs(t.implicitDropMm).toFixed(1)}mm
                </span>{" "}
                of drop, which the hip figure above already includes.
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                To hold the same hip angle, either:
              </p>
              <ul className="mt-0.5 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                <li>
                  • move the saddle{" "}
                  <span className="font-medium">
                    {Math.abs(t.saddleBackMm).toFixed(0)}mm{" "}
                    {t.saddleBackMm >= 0 ? "back" : "forward"}
                  </span>{" "}
                  (and bars the same, keeping the back angle), or
                </li>
                <li>
                  • drop the bars{" "}
                  <span className="font-medium">
                    {Math.abs(t.barDropMm).toFixed(0)}mm{" "}
                    {t.barDropMm >= 0 ? "lower" : "higher"}
                  </span>
                  , or any mix along the curve.
                </li>
              </ul>
              <IsoChart tradeoff={t} comboForPoint={comboForPoint} />
            </div>
          ) : (
            <p className="mt-3 flex items-center text-[11px] text-slate-500 dark:text-slate-400">
              Enter a different target crank to see the trade-off.
              <HelpTip text="The hip angle above is for the current crank. A shorter target crank opens the hip; the panel then shows how much saddle setback or bar drop restores it." />
            </p>
          )}
        </>
      )}
    </Section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-mono text-slate-800 dark:text-slate-100">
        {value}
      </span>
    </>
  );
}

function directionWord(v: number, pos: string, neg: string): string {
  return v >= 0 ? pos : neg;
}

// One line describing a solved combo (or the miss).
function comboText(p: Permutation | undefined): string {
  if (!p) return "no combo in catalog";
  const stem = `${p.stem.length}mm ${p.stem.angle > 0 ? "+" : ""}${p.stem.angle}°`;
  const bar = p.bar ? ` · ${p.bar.reach}mm bar` : "";
  const sp = ` · ${p.spacers}mm sp`;
  const delta = ` · Δ${p.error.toFixed(0)}mm`;
  return stem + bar + sp + delta;
}

// Iso-hip-angle trade-off chart: added saddle-back (x) vs added bar-drop (y).
// Every point on the curve holds the baseline hip angle at the target crank; the
// endpoints are the pure-saddle and pure-bar moves. Hovering a point solves the
// nearest stem+bar combo for that cockpit position.
function IsoChart({
  tradeoff,
  comboForPoint,
}: {
  tradeoff: NonNullable<HipModelResult["tradeoff"]>;
  comboForPoint?: (dx: number, dy: number) => Permutation | undefined;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 300;
  const H = 170;
  const padL = 38;
  const padR = 12;
  const padT = 12;
  const padB = 30;

  const curve = tradeoff.isoCurve;
  const pts = curve.map((p) => ({ x: Math.abs(p.dx), y: Math.abs(p.dy) }));
  const maxX = Math.max(...pts.map((p) => p.x), 1);
  const maxY = Math.max(...pts.map((p) => p.y), 1);

  const sx = (x: number) => padL + (x / maxX) * (W - padL - padR);
  const sy = (y: number) => H - padB - (y / maxY) * (H - padT - padB);

  const poly = pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
  const saddleDir = tradeoff.saddleBackMm >= 0 ? "back" : "fwd";
  const barDir = tradeoff.barDropMm >= 0 ? "lower" : "higher";

  const hoveredPoint = hover != null ? curve[hover] : undefined;
  const hoveredCombo =
    hoveredPoint && comboForPoint
      ? comboForPoint(hoveredPoint.dx, hoveredPoint.dy)
      : undefined;

  return (
    <div className="mt-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded bg-white dark:bg-slate-900"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* axes */}
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#cbd5e1" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#cbd5e1" />

        {/* iso curve */}
        <polyline points={poly} fill="none" stroke="#0ea5e9" strokeWidth={2} />

        {/* endpoints: pure bar-drop (x=0) and pure saddle-back (y=0) */}
        <circle cx={sx(0)} cy={sy(maxY)} r={4} fill="#7c3aed" />
        <circle cx={sx(maxX)} cy={sy(0)} r={4} fill="#7c3aed" />

        {/* axis labels */}
        <text x={(padL + W - padR) / 2} y={H - 8} fontSize={9} textAnchor="middle" fill="#64748b">
          saddle {saddleDir} (mm) →
        </text>
        <text
          x={12}
          y={(padT + H - padB) / 2}
          fontSize={9}
          textAnchor="middle"
          fill="#64748b"
          transform={`rotate(-90 12 ${(padT + H - padB) / 2})`}
        >
          bars {barDir} (mm) →
        </text>

        {/* endpoint value labels */}
        <text x={sx(0) + 6} y={sy(maxY) + 2} fontSize={9} fill="#7c3aed">
          {maxY.toFixed(0)}mm bars only
        </text>
        <text x={sx(maxX) - 4} y={sy(0) - 6} fontSize={9} textAnchor="end" fill="#7c3aed">
          {maxX.toFixed(0)}mm saddle only
        </text>

        {/* hover targets at each sampled point */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={2.2} fill="#0ea5e9" />
            {hover === i && (
              <circle
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={5}
                fill="none"
                stroke="#0369a1"
                strokeWidth={2}
              />
            )}
            <circle
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={11}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            />
          </g>
        ))}
      </svg>

      {/* combo readout for the hovered point (or a hint) */}
      <div className="mt-1 min-h-[2.4em] text-[11px] leading-snug">
        {hoveredPoint ? (
          <p className="text-slate-600 dark:text-slate-300">
            <span className="font-medium">
              saddle {Math.abs(hoveredPoint.dx).toFixed(0)}mm {saddleDir}
              {Math.abs(hoveredPoint.dy) >= 0.5
                ? ` + bars ${Math.abs(hoveredPoint.dy).toFixed(0)}mm ${barDir}`
                : ""}
            </span>
            <span
              className={`block ${
                hoveredCombo?.feasible
                  ? "text-slate-500 dark:text-slate-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {comboText(hoveredCombo)}
            </span>
          </p>
        ) : (
          <p className="text-slate-400 dark:text-slate-500">
            Hover a point on the curve to solve its nearest stem + bar combo.
          </p>
        )}
      </div>
    </div>
  );
}
