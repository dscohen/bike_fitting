import type { Stem } from "../lib/types";

// Default stem catalog: common road stem lengths crossed with common angles.
// Angle is quoted relative to perpendicular-to-steerer (negative = "drop"/slam).
// These are the sizes/angles that are actually mass-produced.

const LENGTHS = [70, 80, 90, 100, 110, 120, 130, 140];
const ANGLES = [-17, -7, -6, 6, 7, 17];

export const DEFAULT_STEMS: Stem[] = LENGTHS.flatMap((length) =>
  ANGLES.map((angle) => ({
    id: `stem-${length}-${angle}`,
    length,
    angle,
    clampStandard: "31.8" as const,
  }))
);
