// Pure geometry math for BikeGeo.
//
// All positions in millimetres, BB origin, X+ forward, Y+ up. No dependencies on
// React/state so these functions are trivially unit-testable.

import type {
  Vec2,
  Bike,
  Seatpost,
  SaddleTarget,
  SaddleSolution,
  SeatpostInsertionCheck,
  Flag,
} from "./types";
import { hasError } from "./constraints";

const DEG = Math.PI / 180;

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Rotate a vector CCW by `deg` degrees. */
export function rotate(v: Vec2, deg: number): Vec2 {
  const r = deg * DEG;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

// ---------------------------------------------------------------------------
// Front end: spacers + stem + bar -> hoods
// ---------------------------------------------------------------------------

export interface FrontEndGeometry {
  headTubeTop: Vec2; // top of head tube / steerer at the frame (reach, stack)
  stemBase: Vec2; // top of spacer stack, where the stem clamps the steerer
  barClamp: Vec2; // stem/handlebar clamp center
  hood: Vec2; // hoods (hand position)
}

export interface FrontEndParams {
  spacers: number; // mm of spacers below the stem
  stemLength: number; // mm, clamp center to steerer center
  stemAngle: number; // deg, relative to perpendicular-to-steerer (neg = drop)
  barReach: number; // mm, clamp -> hoods horizontal-ish
  barHoodRise?: number; // mm, clamp -> hoods vertical (usually ~0)
}

/**
 * Build the front-end chain from frame reach/stack up through the hoods.
 *
 * Sanity check: a 0deg stem rises (90 - HTA) from horizontal, so a -17deg stem
 * on a 73deg head tube ends up level -- matching how real cockpits behave.
 */
export function frontEndGeometry(
  bike: Pick<Bike, "reach" | "stack" | "headTubeAngle" | "headsetStack">,
  params: FrontEndParams
): FrontEndGeometry {
  const hta = bike.headTubeAngle * DEG;

  // Up the steerer (moves back and up as the head tube leans back).
  const steererUp: Vec2 = { x: -Math.cos(hta), y: Math.sin(hta) };
  // Forward perpendicular to the steerer (a 0deg stem lies along this).
  const perp: Vec2 = { x: Math.sin(hta), y: Math.cos(hta) };

  const headTubeTop: Vec2 = { x: bike.reach, y: bike.stack };

  const alongSteerer = params.spacers + (bike.headsetStack ?? 0);
  const stemBase = add(headTubeTop, {
    x: steererUp.x * alongSteerer,
    y: steererUp.y * alongSteerer,
  });

  const stemDir = rotate(perp, params.stemAngle);
  const barClamp = add(stemBase, {
    x: stemDir.x * params.stemLength,
    y: stemDir.y * params.stemLength,
  });

  const hood = add(barClamp, {
    x: params.barReach,
    y: params.barHoodRise ?? 0,
  });

  return { headTubeTop, stemBase, barClamp, hood };
}

// ---------------------------------------------------------------------------
// Saddle: seat tube axis + nose reference + seatpost offset + rail clamp
// ---------------------------------------------------------------------------

/**
 * Place the saddle for a bike + rider saddle target.
 *
 * Model (all horizontal, saddle is level):
 *  - Seat axis top at the saddle height: axis.x = -cos(STA) * SH.
 *  - Nose is the horizontal reference: noseX = -setbackToNose.
 *  - The seatpost clamps the rails at clampX = axis.x - offset (setback = back).
 *  - The clamp sits behind the nose by (noseToRailStart + railClampOffset), so
 *    railClampOffset = noseX - clampX - noseToRailStart.
 *  - The clamp must fit within the usable rail: railClampOffset in
 *    [clampWidth/2, railUsableLength - clampWidth/2].
 *
 * Picks the catalog post whose offset best centers the clamp on the usable rail;
 * flags when the fit would need a forward/negative-offset post or more setback
 * than any post provides.
 */
export function solveSaddle(
  bike: Pick<Bike, "seatTubeAngle">,
  saddle: SaddleTarget,
  posts: Seatpost[]
): SaddleSolution {
  const sta = bike.seatTubeAngle * DEG;
  const axisX = -Math.cos(sta) * saddle.saddleHeight;
  const saddleTopY = Math.sin(sta) * saddle.saddleHeight;
  const noseX = -saddle.setbackToNose;

  const railMin = saddle.clampWidth / 2;
  const railMax = saddle.railUsableLength - saddle.clampWidth / 2;
  const railCenter = saddle.railUsableLength / 2;
  const halfRange = (saddle.railUsableLength - saddle.clampWidth) / 2;

  // Post offset that centers the clamp on the usable rail.
  // railClampOffset(O) = (noseX - axisX - noseToRailStart) + O, set = railCenter.
  const requiredOffset =
    railCenter - (noseX - axisX - saddle.noseToRailStart);

  // Best feasible post = offset closest to requiredOffset within +/- halfRange.
  let best: Seatpost | undefined;
  let bestDelta = Infinity;
  for (const post of posts) {
    const delta = Math.abs(post.offset - requiredOffset);
    if (delta <= halfRange + 1e-6 && delta < bestDelta) {
      best = post;
      bestDelta = delta;
    }
  }

  const usedOffset = best?.offset ?? requiredOffset;
  const clampX = axisX - usedOffset;
  const railClampOffset = noseX - clampX - saddle.noseToRailStart;

  const flags: Flag[] = [];
  if (!best) {
    const minOffset = posts.reduce((m, p) => Math.min(m, p.offset), Infinity);
    const maxOffset = posts.reduce((m, p) => Math.max(m, p.offset), -Infinity);
    if (requiredOffset < minOffset - halfRange - 1e-6) {
      flags.push({
        code: "seatpost-negative-offset",
        severity: "error",
        message: `Saddle sits too far forward for the rails — needs ${(
          minOffset - requiredOffset
        ).toFixed(0)}mm of forward (negative) offset beyond an inline post.`,
      });
    } else {
      flags.push({
        code: "seatpost-out-of-range",
        severity: "error",
        message: `Saddle needs ${(requiredOffset - maxOffset).toFixed(
          0
        )}mm more setback than any available post provides.`,
      });
    }
  } else if (railClampOffset < railMin || railClampOffset > railMax) {
    flags.push({
      code: "rail-clamp-off-usable",
      severity: "warning",
      message: `Clamp sits ${railClampOffset.toFixed(
        0
      )}mm along the usable rail (limits ${railMin.toFixed(0)}–${railMax.toFixed(
        0
      )}mm).`,
    });
  }

  return {
    saddleTop: { x: clampX, y: saddleTopY },
    nose: { x: noseX, y: saddleTopY },
    clampPoint: { x: clampX, y: saddleTopY },
    requiredOffset,
    recommended: best,
    railClampOffset: best ? railClampOffset : undefined,
    flags,
    feasible: !!best,
  };
}

// ---------------------------------------------------------------------------
// Seatpost insertion: is there enough seat tube for the post to be inserted
// deep enough to meet its minimum-insertion mark at this saddle height?
// ---------------------------------------------------------------------------

/**
 * Sanity check the exposed seatpost length (frame's seat-tube top -> saddle
 * height) against a post's own length and minimum-insertion marking. Returns
 * undefined when `seatTubeLength` isn't provided (it's an optional bike spec).
 *
 * requiredExposedLength = saddleHeight - seatTubeLength (both measured along
 * the seat tube, BB-origin, matching the app's existing saddleHeight
 * convention). Safe iff requiredExposedLength <= post.length - post.minInsert.
 */
export function checkSeatpostInsertion(
  seatTubeLength: number | undefined,
  saddleHeight: number,
  post: Seatpost | undefined
): SeatpostInsertionCheck | undefined {
  if (seatTubeLength == null) return undefined;

  const requiredExposedLength = saddleHeight - seatTubeLength;
  const flags: Flag[] = [];

  if (requiredExposedLength < 0) {
    flags.push({
      code: "seat-tube-too-long",
      severity: "error",
      message: `Seat tube (${seatTubeLength.toFixed(
        0
      )}mm) is longer than the saddle height (${saddleHeight.toFixed(
        0
      )}mm) — check these numbers.`,
    });
    return { requiredExposedLength, post, flags, feasible: false };
  }

  let maxSafeExposure: number | undefined;
  if (post?.length != null && post?.minInsert != null) {
    maxSafeExposure = post.length - post.minInsert;
    if (requiredExposedLength > maxSafeExposure + 1e-6) {
      flags.push({
        code: "seatpost-insufficient-insertion",
        severity: "error",
        message: `Needs ${requiredExposedLength.toFixed(
          0
        )}mm of post exposed above the frame, but ${post.name} (${post.length}mm, ${
          post.minInsert
        }mm min insert) only allows ${maxSafeExposure.toFixed(
          0
        )}mm safely — use a longer post or one with a lower min-insert mark.`,
      });
    }
  }

  return {
    requiredExposedLength,
    maxSafeExposure,
    post,
    flags,
    feasible: !hasError(flags),
  };
}
