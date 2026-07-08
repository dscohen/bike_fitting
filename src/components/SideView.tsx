// Scale 2D side-view of the fit: frame, seat tube + saddle (nose/clamp), spacers,
// stem, bar, hoods, with the rider's hand target overlaid. Redraws whenever
// inputs change. Everything is in BB-origin mm; we flip Y (SVG is y-down) and fit.
//
// Each component (spacers, stem, bar, seat tube, setback, rail-to-nose) also
// gets a Fusion360-style sketch-dimension breakdown: dotted horizontal/vertical
// construction legs with tick-capped ends and a Δx/Δy mm label, so it's easy to
// see exactly how much each part contributes in each direction.

import type { Bike, FitTarget, Permutation, Vec2, SaddleSolution } from "../lib/types";
import { frontEndGeometry } from "../lib/geometry";

const W = 720;
const H = 560;
const PAD = 48;
const DEG = Math.PI / 180;
const DIM_COLOR = "#7c3aed";

interface Props {
  bike: Bike;
  target: FitTarget;
  permutation?: Permutation;
  saddle?: SaddleSolution;
}

export default function SideView({ bike, target, permutation, saddle }: Props) {
  // Front-end chain from the selected permutation (or a neutral default so the
  // frame still draws before a permutation is chosen).
  const fe = frontEndGeometry(bike, {
    spacers: permutation?.spacers ?? 20,
    stemLength: permutation?.stem.length ?? 100,
    stemAngle: permutation?.stem.angle ?? -6,
    barReach: permutation?.bar?.reach ?? (target.handMode === "hood" ? 80 : 0),
    barHoodRise: permutation?.bar?.hoodRise,
  });

  const achieved = target.handMode === "clamp" ? fe.barClamp : fe.hood;

  const BB: Vec2 = { x: 0, y: 0 };
  const nose = saddle?.nose ?? { x: -60, y: 690 };
  const clamp = saddle?.clampPoint ?? { x: -180, y: 690 };
  // Saddle tail a bit behind the clamp, for drawing the saddle top line.
  const tail: Vec2 = { x: clamp.x - 45, y: clamp.y };

  // Reference point on the seat-tube axis (before setback is applied) — used
  // purely to split the seatpost's contribution into "seat tube" + "setback".
  const sta = bike.seatTubeAngle * DEG;
  const axisPoint: Vec2 = {
    x: -Math.cos(sta) * target.saddle.saddleHeight,
    y: Math.sin(sta) * target.saddle.saddleHeight,
  };

  const pts = [BB, fe.headTubeTop, fe.stemBase, fe.barClamp, fe.hood, target.hand, nose, tail, axisPoint];

  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y), 0);
  const maxY = Math.max(...pts.map((p) => p.y));
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);

  const sx = (p: Vec2) => PAD + (p.x - minX) * scale;
  const sy = (p: Vec2) => H - PAD - (p.y - minY) * scale;

  const miss = permutation ? permutation.error > 4 : false;
  const seatBad = saddle ? !saddle.feasible : false;
  const railWarn = saddle?.flags.some((f) => f.code === "rail-clamp-off-usable");

  // Dimension breakdown for each component: (from, to) in world mm.
  const dims: { from: Vec2; to: Vec2 }[] = [
    { from: fe.headTubeTop, to: fe.stemBase }, // spacers
    { from: fe.stemBase, to: fe.barClamp }, // stem
    ...(target.handMode === "hood" ? [{ from: fe.barClamp, to: fe.hood }] : []), // bar
    { from: BB, to: axisPoint }, // seat tube
    { from: axisPoint, to: clamp }, // seatpost setback
    { from: clamp, to: nose }, // rail-to-nose
  ];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full rounded-lg bg-slate-50"
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1={0} y1={sy(BB)} x2={W} y2={sy(BB)} stroke="#e2e8f0" strokeDasharray="4 4" />

      {/* seat tube (BB -> clamp) */}
      <line x1={sx(BB)} y1={sy(BB)} x2={sx(clamp)} y2={sy(clamp)} stroke="#94a3b8" strokeWidth={3} />
      {/* front-bottom (BB -> head tube top) */}
      <line x1={sx(BB)} y1={sy(BB)} x2={sx(fe.headTubeTop)} y2={sy(fe.headTubeTop)} stroke="#94a3b8" strokeWidth={3} />

      {/* spacers */}
      <line x1={sx(fe.headTubeTop)} y1={sy(fe.headTubeTop)} x2={sx(fe.stemBase)} y2={sy(fe.stemBase)} stroke="#0ea5e9" strokeWidth={5} strokeLinecap="round" />
      {/* stem */}
      <line x1={sx(fe.stemBase)} y1={sy(fe.stemBase)} x2={sx(fe.barClamp)} y2={sy(fe.barClamp)} stroke="#0f172a" strokeWidth={4} strokeLinecap="round" />
      {/* bar reach to hoods (hood mode) */}
      {target.handMode === "hood" && (
        <line x1={sx(fe.barClamp)} y1={sy(fe.barClamp)} x2={sx(fe.hood)} y2={sy(fe.hood)} stroke="#334155" strokeWidth={3} strokeLinecap="round" />
      )}

      {/* saddle top surface (tail -> nose) */}
      <line x1={sx(tail)} y1={sy(tail)} x2={sx(nose)} y2={sy(nose)} stroke={seatBad ? "#dc2626" : railWarn ? "#d97706" : "#0f172a"} strokeWidth={5} strokeLinecap="round" />
      {/* clamp tick under the saddle */}
      <line x1={sx(clamp)} y1={sy(clamp)} x2={sx(clamp)} y2={sy(clamp) + 12} stroke={seatBad ? "#dc2626" : "#64748b"} strokeWidth={3} />
      {/* nose marker */}
      <circle cx={sx(nose)} cy={sy(nose)} r={3} fill="#0f172a" />

      {/* per-component Δx/Δy sketch-dimension breakdown */}
      {dims.map((d, i) => (
        <Dim key={i} from={d.from} to={d.to} sx={sx} sy={sy} />
      ))}

      {/* achieved hand point */}
      <circle cx={sx(achieved)} cy={sy(achieved)} r={6} fill={miss ? "#dc2626" : "#0ea5e9"} />
      {/* target hand crosshair */}
      <Crosshair x={sx(target.hand)} y={sy(target.hand)} color="#f59e0b" />
      {miss && (
        <line x1={sx(achieved)} y1={sy(achieved)} x2={sx(target.hand)} y2={sy(target.hand)} stroke="#dc2626" strokeDasharray="3 3" />
      )}

      {/* BB */}
      <circle cx={sx(BB)} cy={sy(BB)} r={7} fill="#0f172a" />
      <circle cx={sx(BB)} cy={sy(BB)} r={3} fill="#f8fafc" />
      <text x={sx(BB) + 10} y={sy(BB) + 18} fontSize={11} fill="#64748b">BB</text>

      {/* legend */}
      <g fontSize={11} fill="#64748b">
        <circle cx={PAD} cy={20} r={5} fill="#0ea5e9" />
        <text x={PAD + 10} y={24}>
          {target.handMode === "clamp" ? "clamp (achieved)" : "hoods (achieved)"}
        </text>
        <g transform={`translate(${PAD + 150},20)`}>
          <Crosshair x={0} y={0} color="#f59e0b" />
          <text x={10} y={4}>target</text>
        </g>
        <g transform={`translate(${PAD + 230},20)`}>
          <line x1={-6} y1={0} x2={6} y2={0} stroke={DIM_COLOR} strokeDasharray="2 3" />
          <text x={10} y={4}>Δx / Δy per part</text>
        </g>
      </g>
    </svg>
  );
}

function Crosshair({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g stroke={color} strokeWidth={2}>
      <line x1={x - 7} y1={y} x2={x + 7} y2={y} />
      <line x1={x} y1={y - 7} x2={x} y2={y + 7} />
    </g>
  );
}

/**
 * Sketch-dimension-style breakdown of one component's contribution: a dotted
 * horizontal leg (Δx) then a dotted vertical leg (Δy), each with tick-capped
 * ends and a small mm label — the same idea as splitting an aligned dimension
 * into its horizontal + vertical linear dimensions in a CAD sketch.
 */
function Dim({
  from,
  to,
  sx,
  sy,
}: {
  from: Vec2;
  to: Vec2;
  sx: (p: Vec2) => number;
  sy: (p: Vec2) => number;
}) {
  const dxWorld = to.x - from.x;
  const dyWorld = to.y - from.y;
  const showX = Math.abs(dxWorld) >= 1;
  const showY = Math.abs(dyWorld) >= 1;
  if (!showX && !showY) return null;

  const a = { x: sx(from), y: sy(from) };
  const b = { x: sx(to), y: sy(to) };
  const corner = { x: b.x, y: a.y };

  return (
    <g stroke={DIM_COLOR} strokeWidth={1} fill="none">
      {showX && (
        <>
          <line x1={a.x} y1={a.y} x2={corner.x} y2={corner.y} strokeDasharray="2 3" />
          <Tick x={a.x} y={a.y} vertical />
          <Tick x={corner.x} y={corner.y} vertical />
          <DimLabel x={(a.x + corner.x) / 2} y={a.y} dy={-5} text={`${Math.abs(dxWorld).toFixed(0)}`} />
        </>
      )}
      {showY && (
        <>
          <line x1={corner.x} y1={corner.y} x2={b.x} y2={b.y} strokeDasharray="2 3" />
          <Tick x={corner.x} y={corner.y} />
          <Tick x={b.x} y={b.y} />
          <DimLabel x={corner.x} y={(corner.y + b.y) / 2} dx={9} text={`${Math.abs(dyWorld).toFixed(0)}`} />
        </>
      )}
    </g>
  );
}

function Tick({ x, y, vertical }: { x: number; y: number; vertical?: boolean }) {
  return vertical ? (
    <line x1={x} y1={y - 4} x2={x} y2={y + 4} />
  ) : (
    <line x1={x - 4} y1={y} x2={x + 4} y2={y} />
  );
}

function DimLabel({
  x,
  y,
  dx = 0,
  dy = 0,
  text,
}: {
  x: number;
  y: number;
  dx?: number;
  dy?: number;
  text: string;
}) {
  const w = text.length * 5.5 + 8;
  return (
    <g transform={`translate(${x + dx},${y + dy})`}>
      <rect x={-w / 2} y={-7.5} width={w} height={11} rx={2} fill="white" opacity={0.85} stroke="none" />
      <text x={0} y={2} fontSize={9} textAnchor="middle" fill="#6d28d9">
        {text}
      </text>
    </g>
  );
}
