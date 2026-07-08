import type { SpacerStack } from "../lib/types";

// Discrete spacer-stack heights (mm below the stem) the solver will try.
// Real spacers come in 2.5/5/10/15/20mm; these are achievable total stacks.
export const DEFAULT_SPACER_STACKS: SpacerStack[] = [
  0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70,
];

// Constraints (defaults; a bike may override via Bike.maxSpacerStack).
export const DEFAULT_MAX_SPACER_STACK = 70; // mm
