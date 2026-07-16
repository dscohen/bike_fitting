// Feasibility thresholds and flag generation for a front-end permutation.

import type { Flag, Stem } from "./types";

export const CONSTRAINTS = {
  // The matched point must land within this distance of the target to count.
  matchTolerance: 8, // mm — combos worse than this are discarded
  matchWarnTolerance: 4, // mm — warn between this and matchTolerance

  stemMin: 60,
  stemMax: 140,
  // Stem lengths that define the "reasonable fitting range" envelope: the core
  // band is comfortable, the wider band is workable but at the limit.
  fitStemCore: [90, 120] as [number, number],
  fitStemWarn: [80, 130] as [number, number],
  // Height of a stem's steerer clamp when it doesn't specify one. The stem's
  // extension leaves the steerer at half this above the spacers (~typical road
  // stem "stack height" is 40mm).
  defaultStemClampHeight: 40, // mm

  defaultMaxSpacerStack: 70, // mm
  spacerWarn: 60, // mm — approaching the usual limit
};

export interface FrontEndFlagContext {
  error: number; // mm from the matched point to target
  spacers: number;
  maxSpacerStack: number;
  stem: Stem;
}

/** Build the warning/error flags for one front-end permutation. */
export function frontEndFlags(ctx: FrontEndFlagContext): Flag[] {
  const flags: Flag[] = [];
  const { error, spacers, maxSpacerStack, stem } = ctx;

  if (error > CONSTRAINTS.matchWarnTolerance) {
    flags.push({
      code: "match-error",
      severity: "warning",
      message: `Lands ${error.toFixed(1)}mm off target.`,
    });
  }

  if (spacers > maxSpacerStack + 1e-6) {
    flags.push({
      code: "spacer-over-max",
      severity: "error",
      message: `Spacer stack ${spacers}mm exceeds the ${maxSpacerStack}mm limit for this steerer.`,
    });
  } else if (spacers >= CONSTRAINTS.spacerWarn) {
    flags.push({
      code: "spacer-high",
      severity: "warning",
      message: `Spacer stack ${spacers}mm is near the usual limit.`,
    });
  }

  // A stem beyond the sane maximum is a hard error (guards absurd custom stems);
  // we intentionally don't warn on merely long/short stems.
  if (stem.length > CONSTRAINTS.stemMax) {
    flags.push({
      code: "stem-too-long",
      severity: "error",
      message: `Stem ${stem.length}mm exceeds the sane maximum (${CONSTRAINTS.stemMax}mm).`,
    });
  }

  return flags;
}

export const hasError = (flags: Flag[]) =>
  flags.some((f) => f.severity === "error");
