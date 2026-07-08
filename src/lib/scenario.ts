// Glue between a saved rider/bike/adjust and the solver output. Pure functions
// so the UI just renders the result and re-runs this on every slider change.

import type {
  Bar,
  Bike,
  Rider,
  Scenario,
  FitTarget,
  Permutation,
  SaddleSolution,
  Seatpost,
} from "./types";
import { resolveFitTarget, FitInputError } from "./convert";
import { solvePermutations, type SolverCatalog } from "./solver";
import { solveSaddle } from "./geometry";

/** A bar with built-in rise (e.g. Redshift Top Shelf, Surly Truck Stop). */
export function isRiserBar(bar: Bar): boolean {
  return (bar.hoodRise ?? 0) > 0;
}

/**
 * Apply a scenario's bar constraint to the catalog before solving:
 *  - `excludeRisers` filters out riser bars from the search pool first.
 *  - `lockReach` wins over the rest: search only a single synthetic bar of
 *    that reach (borrowing drop/hoodRise from the rider's current bar, if
 *    any — unless `excludeRisers` is set, in which case rise isn't borrowed).
 *  - else `onlyRidersBar` restricts the search to rider.currentBarId, falling
 *    back to the (possibly riser-filtered) pool if that bar isn't in it.
 *  - else the (possibly riser-filtered) pool is searched in full.
 * A no-op in clamp mode, since solvePermutations ignores bars entirely there.
 */
export function resolveBars(
  catalog: SolverCatalog,
  rider: Rider,
  constraint: Scenario["barConstraint"] | undefined
): Bar[] {
  const ridersBar = rider.currentBarId
    ? catalog.bars.find((b) => b.id === rider.currentBarId)
    : undefined;

  if (constraint?.lockReach != null) {
    return [
      {
        id: "__locked-reach__",
        name: `Locked reach (${constraint.lockReach}mm)`,
        reach: constraint.lockReach,
        drop: ridersBar?.drop ?? 0,
        hoodRise: constraint.excludeRisers ? 0 : ridersBar?.hoodRise ?? 0,
      },
    ];
  }

  const pool = constraint?.excludeRisers
    ? catalog.bars.filter((b) => !isRiserBar(b))
    : catalog.bars;

  if (constraint?.onlyRidersBar) {
    const barInPool = ridersBar && pool.some((b) => b.id === ridersBar.id)
      ? ridersBar
      : undefined;
    return barInPool ? [barInPool] : pool;
  }

  return pool;
}

/** Apply live-adjust deltas on top of a rider's resolved fit target. */
export function applyAdjust(
  base: FitTarget,
  adjust: Scenario["adjust"]
): FitTarget {
  return {
    ...base,
    hand: {
      x: base.hand.x + adjust.reachDelta,
      y: base.hand.y - adjust.dropDelta, // more drop => hand lower
    },
    saddle: {
      ...base.saddle,
      saddleHeight: base.saddle.saddleHeight + adjust.saddleHeightDelta,
    },
  };
}

export interface ScenarioComputation {
  target?: FitTarget;
  permutations: Permutation[];
  saddle?: SaddleSolution;
  error?: string;
}

/** Saddle-to-hand drop for the resolved saddle position (bike-specific). */
export function computedDrop(saddle: SaddleSolution, hand: { y: number }) {
  return saddle.saddleTop.y - hand.y;
}

/** Saddle-nose-to-hand reach. */
export function computedReach(saddle: SaddleSolution, hand: { x: number }) {
  return hand.x - saddle.nose.x;
}

export function computeScenario(
  bike: Bike,
  rider: Rider,
  adjust: Scenario["adjust"],
  catalog: SolverCatalog,
  seatposts: Seatpost[],
  barConstraint?: Scenario["barConstraint"]
): ScenarioComputation {
  let base: FitTarget;
  try {
    base = resolveFitTarget(rider.fit);
  } catch (e) {
    return {
      permutations: [],
      error:
        e instanceof FitInputError ? e.message : "Could not resolve fit inputs.",
    };
  }

  const target = applyAdjust(base, adjust);
  const bars = resolveBars(catalog, rider, barConstraint);
  const permutations = solvePermutations(bike, target, { ...catalog, bars });
  const saddle = solveSaddle(bike, target.saddle, seatposts);

  return { target, permutations, saddle };
}
