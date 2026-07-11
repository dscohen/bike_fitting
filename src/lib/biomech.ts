// Hip-angle / crank model for BikeGeo.
//
// Sagittal plane, BB origin, mm, X+ forward, Y+ up — same frame as geometry.ts.
// Pure functions, no React/state. The hip angle is evaluated at top-dead-center
// (TDC), the most-closed and therefore limiting part of the pedal stroke.
//
// The rider is a 3-segment sketch: a leg (femur + tibia + foot) from the hip to
// the pedal, and a straight back (torso) + arm from the hip to the hands. See
// the plan / README for the modelling assumptions.

import type {
  Vec2,
  RiderBody,
  ResolvedBody,
  HipModelResult,
  CrankTradeoff,
  Flag,
} from "./types";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// Fallback crank length (mm) when a scenario hasn't set one — a common road size.
export const DEFAULT_CRANK = 172.5;

// Sit surface -> hip-joint (greater trochanter) vertical offset. Constant; it
// shifts absolute hip degrees a little but barely affects the trade-offs, which
// are differences.
const HIP_ABOVE_SADDLE = 70;

// Horizontal nose -> hip-joint offset (the rider sits behind the nose).
// Constant; anchoring the hip to the nose (rather than the seatpost clamp) makes
// it respond continuously to saddle setback. Only shifts absolute degrees.
const SIT_NOSE_TO_HIP_X = 100;

// Height fallback when the rider gives no height: saddle height ~0.415*height.
const HEIGHT_FROM_SADDLE = 2.41;

// Anthropometric ratios (Drillis–Contini / Winter, approximate fractions of
// standing height) for the parts a saddle height can't pin down.
const TORSO_FRAC = 0.3; // hip joint -> shoulder (acromion)
const ARM_FRAC = 0.33; // shoulder -> hand grip

// Leg split of the hip->pedal length, and a constant ankle->spindle foot.
const FEMUR_FRAC = 0.47; // of the auto-fit leg length
const FOOT_DEFAULT = 60; // ankle -> pedal spindle (shoe + cleat stack)

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}
function len(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}
function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Intersections of two circles. Returns 0, 1, or 2 points. Rounding that would
 * make the two circles just barely non-intersecting is tolerated (clamped).
 */
export function intersectTwoCircles(
  c0: Vec2,
  r0: number,
  c1: Vec2,
  r1: number
): Vec2[] {
  const d = dist(c0, c1);
  if (d === 0) return []; // concentric — no distinct solution
  if (d > r0 + r1 + 1e-6) return []; // too far apart
  if (d < Math.abs(r0 - r1) - 1e-6) return []; // one inside the other
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h2 = r0 * r0 - a * a;
  const h = Math.sqrt(Math.max(h2, 0));
  const ux = (c1.x - c0.x) / d;
  const uy = (c1.y - c0.y) / d;
  const mid: Vec2 = { x: c0.x + a * ux, y: c0.y + a * uy };
  if (h === 0) return [mid];
  // perpendicular to the center line
  const ox = -uy * h;
  const oy = ux * h;
  return [
    { x: mid.x + ox, y: mid.y + oy },
    { x: mid.x - ox, y: mid.y - oy },
  ];
}

/** Signed angle of a vector above the horizontal, degrees. */
function angleToHorizontal(v: Vec2): number {
  return Math.atan2(v.y, v.x) * RAD;
}

/** Unsigned angle between two vectors, degrees (0..180). */
function angleBetween(a: Vec2, b: Vec2): number {
  const la = len(a);
  const lb = len(b);
  if (la === 0 || lb === 0) return NaN;
  const c = (a.x * b.x + a.y * b.y) / (la * lb);
  return Math.acos(Math.max(-1, Math.min(1, c))) * RAD;
}

/**
 * Hip joint (BB-origin) for a saddle position. Anchored a fixed offset behind
 * the saddle nose and above the saddle top, so it tracks both saddle height and
 * setback continuously (the seatpost-clamp point moves in discrete post-offset
 * jumps and doesn't track setback, so it's a poor anchor for this model).
 */
export function hipAnchor(
  setbackToNose: number,
  saddleHeight: number,
  staDeg: number
): Vec2 {
  const saddleTopY = Math.sin(staDeg * DEG) * saddleHeight;
  return {
    x: -setbackToNose - SIT_NOSE_TO_HIP_X,
    y: saddleTopY + HIP_ABOVE_SADDLE,
  };
}

/**
 * Resolve the rider's body into concrete segment lengths for the hip model.
 * Leg segments auto-fit the saddle height + crank so the leg reaches the pedal,
 * unless the rider overrode femur/tibia/foot. Torso/arm come from height (given
 * or derived from saddle height). Sized from the rider's saved fit so live
 * adjustments (setback/height sliders) don't change the leg length.
 */
export function resolveBody(
  body: RiderBody | undefined,
  setbackToNose: number,
  saddleHeight: number,
  staDeg: number,
  crank: number
): ResolvedBody {
  const heightMm = body?.heightMm ?? saddleHeight * HEIGHT_FROM_SADDLE;

  // Hip at the saved saddle, and the pedal at bottom-dead-center. The leg is
  // treated as ~straight there, so its length is the hip->bottom-pedal span.
  const hip = hipAnchor(setbackToNose, saddleHeight, staDeg);
  const bottomPedal: Vec2 = { x: 0, y: -crank };
  const legFit = dist(hip, bottomPedal);

  const femur = body?.femur ?? FEMUR_FRAC * legFit;
  const foot = body?.foot ?? FOOT_DEFAULT;
  const tibia = body?.tibia ?? Math.max(legFit - femur - foot, 1);

  const torsoLength = body?.torsoLength ?? TORSO_FRAC * heightMm;
  const armLength = body?.armLength ?? ARM_FRAC * heightMm;

  const measured =
    body?.torsoLength != null ||
    body?.armLength != null ||
    body?.femur != null ||
    body?.tibia != null ||
    body?.foot != null;
  const source: ResolvedBody["source"] = measured
    ? "measured"
    : body?.heightMm != null
    ? "from-height"
    : "estimated";

  return { heightMm, torsoLength, armLength, femur, tibia, foot, source };
}

// Internal: solve the knee at TDC (forward root) and shoulder (upper root).
function solveKneeTop(hip: Vec2, crank: number, body: ResolvedBody): Vec2 | null {
  const pedalTop: Vec2 = { x: 0, y: crank };
  const lower = body.tibia + body.foot;
  const pts = intersectTwoCircles(hip, body.femur, pedalTop, lower);
  if (pts.length === 0) return null;
  // Knee is forward of the hip/pedal line — pick the larger-x solution.
  return pts.reduce((best, p) => (p.x > best.x ? p : best));
}

function solveShoulder(hip: Vec2, hand: Vec2, body: ResolvedBody): Vec2 | null {
  const pts = intersectTwoCircles(hip, body.torsoLength, hand, body.armLength);
  if (pts.length === 0) return null;
  // Shoulder sits above the hip->hand line — pick the larger-y solution.
  return pts.reduce((best, p) => (p.y > best.y ? p : best));
}

/**
 * Hip angle (torso-to-femur, at TDC) for a given hip, hand, crank and body.
 * Returns null when the leg or arms can't physically reach.
 */
export function hipAngleFor(
  hip: Vec2,
  hand: Vec2,
  crank: number,
  body: ResolvedBody
): number | null {
  const knee = solveKneeTop(hip, crank, body);
  const shoulder = solveShoulder(hip, hand, body);
  if (!knee || !shoulder) return null;
  const angle = angleBetween(sub(shoulder, hip), sub(knee, hip));
  return Number.isFinite(angle) ? angle : null;
}

/** Bisection root-find of a monotonic f over [lo, hi] where f(x) = target. */
function solveMonotonic(
  f: (x: number) => number | null,
  target: number,
  lo: number,
  hi: number
): number | null {
  const flo = f(lo);
  const fhi = f(hi);
  if (flo == null || fhi == null) return null;
  const glo = flo - target;
  const ghi = fhi - target;
  if (glo === 0) return lo;
  if (ghi === 0) return hi;
  if (glo > 0 === ghi > 0) return null; // no sign change in range
  let a = lo;
  let b = hi;
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (fm == null) return null;
    const gm = fm - target;
    if (Math.abs(gm) < 1e-4 || b - a < 1e-4) return m;
    if (gm > 0 === glo > 0) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

interface CrankTradeoffInput {
  hip: Vec2; // hip at the current saddle
  hand: Vec2; // current hand target
  body: ResolvedBody;
  crankCurrent: number;
  crankTarget: number;
  staDeg: number;
}

/**
 * Trade-offs of changing crank length while holding the hip angle constant.
 *
 * Shortening the crank by Δc and raising the saddle by Δc preserves bottom-of-
 * stroke extension while lowering the top of the stroke — the TDC hip->pedal gap
 * grows by 2·Δc. That opens the hip angle; the freed angle can be spent by moving
 * the saddle rearward (bars back the same, back angle unchanged) or dropping the
 * bars. Returns the pure-saddle and pure-bar moves plus the iso-angle locus of
 * mixes between them.
 */
export function crankTradeoff(input: CrankTradeoffInput): CrankTradeoff {
  const { hip, hand, body, crankCurrent, crankTarget, staDeg } = input;
  const dc = crankCurrent - crankTarget; // + when the target crank is shorter
  const sta = staDeg * DEG;

  // Raising the saddle leaves the bars where they are (they're set by the
  // frame/stem), so the saddle->bar drop grows by the saddle's vertical rise.
  const implicitDropMm = Math.sin(sta) * dc;

  const empty: CrankTradeoff = {
    crankCurrent,
    crankTarget,
    topOpeningMm: 2 * dc,
    implicitDropMm,
    deltaHipDeg: 0,
    saddleBackMm: 0,
    barDropMm: 0,
    isoCurve: [],
    feasible: false,
  };

  const baseline = hipAngleFor(hip, hand, crankCurrent, body);
  if (baseline == null) return empty;

  // Raise the saddle by Δc (hip shifts up/back along the seat-tube axis) to keep
  // leg extension, and evaluate at the target crank. The bars are FIXED — so the
  // saddle->bar drop and reach implicitly increase, and those changes feed into
  // the hip angle (they partially offset the leg-side opening). We do NOT raise
  // the hand: that would assume the fitter also lifts the cockpit by Δc.
  const hipOpened: Vec2 = {
    x: hip.x - Math.cos(sta) * dc,
    y: hip.y + Math.sin(sta) * dc,
  };
  const handOpened: Vec2 = { x: hand.x, y: hand.y };
  const opened = hipAngleFor(hipOpened, handOpened, crankTarget, body);
  if (opened == null) return { ...empty };

  const deltaHipDeg = opened - baseline;

  // Saddle back by dx (hip and hand back equally) restores the baseline.
  const saddleBackMm =
    solveMonotonic(
      (dx) =>
        hipAngleFor(
          { x: hipOpened.x - dx, y: hipOpened.y },
          { x: handOpened.x - dx, y: handOpened.y },
          crankTarget,
          body
        ),
      baseline,
      -150,
      150
    ) ?? NaN;

  // Bar drop by dy (saddle fixed) restores the baseline.
  const barDropMm =
    solveMonotonic(
      (dy) =>
        hipAngleFor(
          hipOpened,
          { x: handOpened.x, y: handOpened.y - dy },
          crankTarget,
          body
        ),
      baseline,
      -220,
      220
    ) ?? NaN;

  // Iso-angle locus: for each saddle-back dx (0..saddleBackMm), the bar drop dy
  // that keeps the hip at baseline. Bars move back with the saddle by dx too.
  const isoCurve: { dx: number; dy: number }[] = [];
  const feasible = Number.isFinite(saddleBackMm) && Number.isFinite(barDropMm);
  if (feasible) {
    const N = 10;
    for (let i = 0; i <= N; i++) {
      const dx = (saddleBackMm * i) / N;
      const dy = solveMonotonic(
        (d) =>
          hipAngleFor(
            { x: hipOpened.x - dx, y: hipOpened.y },
            { x: handOpened.x - dx, y: handOpened.y - d },
            crankTarget,
            body
          ),
        baseline,
        -220,
        220
      );
      if (dy == null) continue;
      isoCurve.push({ dx, dy });
    }
  }

  return {
    crankCurrent,
    crankTarget,
    topOpeningMm: 2 * dc,
    implicitDropMm,
    deltaHipDeg,
    saddleBackMm,
    barDropMm,
    isoCurve,
    feasible,
  };
}

interface HipModelInput {
  // Saved fit — sizes the (fixed) leg so live sliders don't change it.
  base: { setbackToNose: number; saddleHeight: number };
  // Adjusted fit — where the hip angle is actually evaluated.
  evalAt: { setbackToNose: number; saddleHeight: number };
  hand: Vec2; // hand target (BB-origin), after live adjust
  body: RiderBody | undefined;
  staDeg: number;
  crankCurrent: number;
  crankTarget?: number;
}

/**
 * Evaluate the rider's hip angle at TDC for the current crank, and (when a
 * different target crank is given) the crank trade-offs. The leg is sized from
 * the saved fit; the angle is evaluated at the (possibly live-adjusted) fit.
 */
export function solveHipModel(input: HipModelInput): HipModelResult {
  const { base, evalAt, hand, staDeg, crankCurrent, crankTarget } = input;
  const body = resolveBody(
    input.body,
    base.setbackToNose,
    base.saddleHeight,
    staDeg,
    crankCurrent
  );
  const hip = hipAnchor(evalAt.setbackToNose, evalAt.saddleHeight, staDeg);

  const knee = solveKneeTop(hip, crankCurrent, body);
  const shoulder = solveShoulder(hip, hand, body);
  const flags: Flag[] = [];

  if (!knee) {
    flags.push({
      code: "leg-cannot-reach",
      severity: "error",
      message:
        "The leg segments can't reach the pedal at this saddle height — check the femur/tibia/foot overrides.",
    });
  }
  if (!shoulder) {
    flags.push({
      code: "arms-cannot-reach",
      severity: "error",
      message:
        "The torso + arm can't reach the hands — check the height / torso / arm values.",
    });
  }

  const pedalTop: Vec2 = { x: 0, y: crankCurrent };

  if (!knee || !shoulder) {
    return {
      hip,
      kneeTop: knee ?? hip,
      pedalTop,
      shoulder: shoulder ?? hip,
      hand,
      hipAngleDeg: NaN,
      backAngleDeg: NaN,
      body,
      flags,
      feasible: false,
    };
  }

  const hipAngleDeg = angleBetween(sub(shoulder, hip), sub(knee, hip));
  const backAngleDeg = angleToHorizontal(sub(shoulder, hip));

  let tradeoff: CrankTradeoff | undefined;
  if (crankTarget != null && crankTarget !== crankCurrent) {
    tradeoff = crankTradeoff({
      hip,
      hand,
      body,
      crankCurrent,
      crankTarget,
      staDeg,
    });
  }

  return {
    hip,
    kneeTop: knee,
    pedalTop,
    shoulder,
    hand,
    hipAngleDeg,
    backAngleDeg,
    body,
    tradeoff,
    flags,
    feasible: true,
  };
}
