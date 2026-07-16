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
  SeatpostInsertionCheck,
  HipModelResult,
  FitEnvelope,
  Vec2,
} from "./types";
import { resolveFitTarget, FitInputError } from "./convert";
import { solvePermutations, type SolverCatalog } from "./solver";
import { solveSaddle, checkSeatpostInsertion } from "./geometry";
import { solveHipModel, DEFAULT_CRANK } from "./biomech";
import { buildFitEnvelope } from "./fitbox";

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

/**
 * Solve the nearest real stem+bar+spacer combo for an alternate hand target
 * (e.g. a point on the crank trade-off curve), reusing the scenario's bar
 * constraints exactly like the main solve. Returns the top-ranked permutation,
 * or undefined if there is nothing to rank.
 */
export function solveComboForHand(
  bike: Bike,
  baseTarget: FitTarget,
  hand: Vec2,
  catalog: SolverCatalog,
  rider: Rider,
  barConstraint?: Scenario["barConstraint"]
): Permutation | undefined {
  const bars = resolveBars(catalog, rider, barConstraint);
  const perms = solvePermutations(
    bike,
    { ...baseTarget, hand },
    { ...catalog, bars }
  );
  return perms[0];
}

/** Apply live-adjust deltas on top of a rider's resolved fit target. */
export function applyAdjust(
  base: FitTarget,
  adjust: Scenario["adjust"]
): FitTarget {
  const setbackDelta = adjust.setbackDelta ?? 0;
  return {
    ...base,
    hand: {
      // reachDelta moves the bars with the saddle static; setbackDelta moves the
      // saddle back AND the bars back the same, keeping the saddle->bar reach.
      x: base.hand.x + adjust.reachDelta - setbackDelta,
      y: base.hand.y - adjust.dropDelta, // more drop => hand lower
    },
    saddle: {
      ...base.saddle,
      saddleHeight: base.saddle.saddleHeight + adjust.saddleHeightDelta,
      setbackToNose: base.saddle.setbackToNose + setbackDelta,
    },
  };
}

export interface ScenarioComputation {
  target?: FitTarget;
  permutations: Permutation[];
  saddle?: SaddleSolution;
  seatpostInsertion?: SeatpostInsertionCheck;
  hip?: HipModelResult;
  envelope?: FitEnvelope;
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
  barConstraint?: Scenario["barConstraint"],
  cranks?: { current?: number; target?: number }
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
  const seatpostInsertion = checkSeatpostInsertion(
    bike.seatTubeLength,
    target.saddle.saddleHeight,
    saddle.recommended
  );

  const hip = solveHipModel({
    // Leg sized from the saved fit; angle evaluated at the live-adjusted fit.
    base: {
      setbackToNose: base.saddle.setbackToNose,
      saddleHeight: base.saddle.saddleHeight,
    },
    evalAt: {
      setbackToNose: target.saddle.setbackToNose,
      saddleHeight: target.saddle.saddleHeight,
    },
    hand: target.hand,
    body: rider.body,
    staDeg: bike.seatTubeAngle,
    crankCurrent: cranks?.current ?? DEFAULT_CRANK,
    crankTarget: cranks?.target,
  });

  // The envelope is "given a bar setup": prefer the rider's own bar, else the
  // one currently being recommended — never an arbitrary catalog-order pick.
  const envelopeBar =
    bars.find((b) => b.id === rider.currentBarId) ??
    permutations[0]?.bar ??
    bars[0];
  const envelope = buildFitEnvelope(bike, target, catalog.stems, envelopeBar);

  return { target, permutations, saddle, seatpostInsertion, hip, envelope };
}
