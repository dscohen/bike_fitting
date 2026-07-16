// "Reasonable fitting range" for a bike + bar: which hand positions can you
// actually reach with a sensible cockpit?
//
// For a fixed stem angle, the hand position is LINEAR in both stem length and
// spacer height:
//
//   hand = headTubeTop + steererUp*(headset + spacers) + stemDir(angle)*length
//
// so sweeping length ∈ [lo,hi] and spacers ∈ [0,max] traces an exact
// parallelogram. The reachable set is the union of one parallelogram per stem
// angle, and the convex hull of that union is just the hull of their corners —
// so four samples per angle give the exact hull, no point-cloud sampling.

import type {
  Bar,
  Bike,
  FitEnvelope,
  FitRoom,
  FitTarget,
  Stem,
  Vec2,
} from "./types";
import { frontEndGeometry } from "./geometry";
import { CONSTRAINTS } from "./constraints";

/** 2D cross product of (a-o) x (b-o). */
function cross(o: Vec2, a: Vec2, b: Vec2): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** Convex hull (Andrew's monotone chain), returned counter-clockwise. */
export function convexHull(points: Vec2[]): Vec2[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;

  const build = (src: Vec2[]): Vec2[] => {
    const out: Vec2[] = [];
    for (const p of src) {
      while (
        out.length >= 2 &&
        cross(out[out.length - 2], out[out.length - 1], p) <= 0
      ) {
        out.pop();
      }
      out.push(p);
    }
    out.pop();
    return out;
  };

  const lower = build(pts);
  const upper = build([...pts].reverse());
  return lower.concat(upper);
}

/** Is p inside (or on) a counter-clockwise convex polygon? */
export function pointInConvex(poly: Vec2[], p: Vec2): boolean {
  if (poly.length < 3) return false;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) < -1e-9) {
      return false;
    }
  }
  return true;
}

/** Shortest distance from p to segment ab. */
function pointSegDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const ex = b.x - a.x;
  const ey = b.y - a.y;
  const len2 = ex * ex + ey * ey;
  const t =
    len2 === 0
      ? 0
      : Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / len2));
  return Math.hypot(p.x - (a.x + t * ex), p.y - (a.y + t * ey));
}

/** How far p sits outside the polygon (0 when inside or on the edge). */
export function distanceOutside(poly: Vec2[], p: Vec2): number {
  if (poly.length < 3) return Infinity;
  if (pointInConvex(poly, p)) return 0;
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    best = Math.min(
      best,
      pointSegDistance(p, poly[i], poly[(i + 1) % poly.length])
    );
  }
  return best;
}

/**
 * Distance from `p` along unit direction `d` to the polygon boundary, or
 * undefined if the ray never hits it.
 */
export function rayToEdge(poly: Vec2[], p: Vec2, d: Vec2): number | undefined {
  let best: number | undefined;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const denom = d.x * ey - d.y * ex;
    if (Math.abs(denom) < 1e-12) continue; // parallel
    const t = ((a.x - p.x) * ey - (a.y - p.y) * ex) / denom;
    const s = ((a.x - p.x) * d.y - (a.y - p.y) * d.x) / denom;
    if (t >= 0 && s >= -1e-9 && s <= 1 + 1e-9) {
      if (best === undefined || t < best) best = t;
    }
  }
  return best;
}

/** How far `p` can travel each way inside `poly` before hitting its edge. */
function roomIn(poly: Vec2[], p: Vec2): FitRoom | undefined {
  const forward = rayToEdge(poly, p, { x: 1, y: 0 });
  const back = rayToEdge(poly, p, { x: -1, y: 0 });
  const up = rayToEdge(poly, p, { x: 0, y: 1 });
  const down = rayToEdge(poly, p, { x: 0, y: -1 });
  if (forward == null || back == null || up == null || down == null) return undefined;
  return { forward, back, up, down };
}

/** The four corners of one stem angle's reachable parallelogram. */
function cornersForAngle(
  bike: Bike,
  angle: number,
  lengths: [number, number],
  spacerMax: number,
  bar: Bar | undefined,
  handMode: "hood" | "clamp"
): Vec2[] {
  const out: Vec2[] = [];
  for (const stemLength of lengths) {
    for (const spacers of [0, spacerMax]) {
      const g = frontEndGeometry(bike, {
        spacers,
        stemLength,
        stemAngle: angle,
        barReach: bar?.reach ?? 0,
        barHoodRise: bar?.hoodRise,
      });
      out.push(handMode === "clamp" ? g.barClamp : g.hood);
    }
  }
  return out;
}

function hullForBand(
  bike: Bike,
  angles: number[],
  lengths: [number, number],
  spacerMax: number,
  bar: Bar | undefined,
  handMode: "hood" | "clamp"
): Vec2[] {
  const pts = angles.flatMap((a) =>
    cornersForAngle(bike, a, lengths, spacerMax, bar, handMode)
  );
  return convexHull(pts);
}

/**
 * Build the reachable-hand-position envelope for a bike and one bar setup.
 * The caller picks the bar (the rider's own, else whatever is being recommended);
 * it's ignored in clamp mode, where the target IS the stem/bar clamp.
 */
export function buildFitEnvelope(
  bike: Bike,
  target: FitTarget,
  stems: Stem[],
  barSetup: Bar | undefined
): FitEnvelope | undefined {
  const angles = [...new Set(stems.map((s) => s.angle))].sort((a, b) => a - b);
  if (angles.length === 0) return undefined;

  const bar = target.handMode === "clamp" ? undefined : barSetup;
  if (target.handMode === "hood" && !bar) return undefined;

  const spacerMax = bike.maxSpacerStack ?? CONSTRAINTS.defaultMaxSpacerStack;
  const stemCore = CONSTRAINTS.fitStemCore;
  const stemWarn = CONSTRAINTS.fitStemWarn;

  const core = hullForBand(bike, angles, stemCore, spacerMax, bar, target.handMode);
  const warn = hullForBand(bike, angles, stemWarn, spacerMax, bar, target.handMode);

  // Membership is strict — the stem bands are the whole point, so we don't blur
  // them with the solver's match tolerance. The distances let the UI say "3mm
  // outside" instead of a blunt "out of range".
  const coreDistance = distanceOutside(core, target.hand);
  const warnDistance = distanceOutside(warn, target.hand);
  const inCore = coreDistance === 0;
  const inWarn = warnDistance === 0;

  const room = inCore ? roomIn(core, target.hand) : undefined;
  const roomWarn = inWarn ? roomIn(warn, target.hand) : undefined;

  return {
    handMode: target.handMode,
    bar,
    core,
    warn,
    target: target.hand,
    inCore,
    inWarn,
    coreDistance,
    warnDistance,
    room,
    roomWarn,
    stemCore,
    stemWarn,
    spacerMax,
  };
}
