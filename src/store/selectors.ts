// Derived selectors: merge default catalogs with the user's custom parts.

import { useStore } from "./useStore";
import { DEFAULT_STEMS } from "../data/stems";
import { DEFAULT_BARS } from "../data/bars";
import { DEFAULT_SEATPOSTS } from "../data/seatposts";
import { DEFAULT_SPACER_STACKS } from "../data/spacers";
import type { SolverCatalog } from "../lib/solver";
import type { Bar, Seatpost } from "../lib/types";

export function useSolverCatalog(): SolverCatalog {
  const customStems = useStore((s) => s.customStems);
  const customBars = useStore((s) => s.customBars);
  return {
    stems: [...DEFAULT_STEMS, ...customStems],
    bars: [...DEFAULT_BARS, ...customBars],
    spacerStacks: DEFAULT_SPACER_STACKS,
  };
}

/** All bars (default + custom) — for pickers like "rider's current bar". */
export function useBars(): Bar[] {
  const customBars = useStore((s) => s.customBars);
  return [...DEFAULT_BARS, ...customBars];
}

export function useSeatposts(): Seatpost[] {
  const customSeatposts = useStore((s) => s.customSeatposts);
  return [...DEFAULT_SEATPOSTS, ...customSeatposts];
}
