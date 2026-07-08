// Reduce a flexible RiderFitInput (the several equivalent ways a fitter can
// describe a fit) into the canonical FitTarget the solver consumes.

import type { RiderFitInput, FitTarget } from "./types";

export class FitInputError extends Error {}

export const SADDLE_DEFAULTS = {
  noseToRailStart: 90, // mm, nose -> start of usable rail markings
  railUsableLength: 65, // mm
  clampWidth: 25, // mm
};

/**
 * Resolve whatever the user provided into { hand, handMode, saddle }.
 *
 * The hand target is a fixed point in space (the rider wants their hands there
 * regardless of frame); it is either the hoods or the stem/bar clamp. The saddle
 * is kept as scalars — its actual XY depends on the frame's seat-tube angle and
 * is solved per-bike (see solveSaddle).
 */
export function resolveFitTarget(input: RiderFitInput): FitTarget {
  const SH = input.saddleHeight;
  if (!(SH > 0)) {
    throw new FitInputError("Saddle height is required and must be positive.");
  }

  // --- Hand target mode ----------------------------------------------------
  const handMode: "hood" | "clamp" =
    input.handRef ??
    (input.barTopX != null || input.barTopY != null ? "clamp" : "hood");

  // Horizontal saddle nose reference.
  let noseX: number | undefined =
    input.saddleSetback != null ? -input.saddleSetback : undefined;

  // Horizontal hand position, from the field pair matching the mode.
  let handX: number | undefined =
    handMode === "clamp"
      ? input.barTopX ?? input.hoodX
      : input.hoodX ?? input.barTopX;

  // Cross-derive using saddle-to-bar reach (nose -> hand).
  if (input.saddleToBarReach != null) {
    if (handX == null && noseX != null) {
      handX = noseX + input.saddleToBarReach;
    } else if (noseX == null && handX != null) {
      noseX = handX - input.saddleToBarReach;
    }
  }

  if (noseX == null) {
    throw new FitInputError(
      "Provide saddle setback (to the nose), or a hand X with saddle-to-bar reach."
    );
  }
  if (handX == null) {
    throw new FitInputError(
      "Provide a hand X (hood or bar-top), or saddle-to-bar reach with a setback."
    );
  }

  // Vertical hand position.
  let handY: number | undefined =
    handMode === "clamp"
      ? input.barTopY ?? input.hoodY
      : input.hoodY ?? input.barTopY;
  if (handY == null && input.saddleToBarDrop != null) {
    // Approx saddle-top vertical for the drop cross-derive (bike-independent
    // fallback; the per-bike solve refines the drawn saddle height).
    const approxSaddleTopY = Math.sqrt(Math.max(SH * SH - noseX * noseX, 0));
    handY = approxSaddleTopY - input.saddleToBarDrop;
  }
  if (handY == null) {
    throw new FitInputError(
      "Provide a hand Y (hood or bar-top), or a saddle-to-bar drop."
    );
  }

  return {
    hand: { x: handX, y: handY },
    handMode,
    saddle: {
      saddleHeight: SH,
      setbackToNose: -noseX,
      noseToRailStart:
        input.saddleNoseToRailStart ?? SADDLE_DEFAULTS.noseToRailStart,
      railUsableLength:
        input.railUsableLength ?? SADDLE_DEFAULTS.railUsableLength,
      clampWidth: input.clampWidth ?? SADDLE_DEFAULTS.clampWidth,
    },
  };
}
