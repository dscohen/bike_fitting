// Catalog enumeration + ranking solver.
//
// Given a frame and a canonical fit target, enumerate real component
// combinations, keep the ones whose matched point (bar/stem clamp in "clamp"
// mode, hoods in "hood" mode) lands close to target, attach feasibility flags,
// and rank so slammed / negative-stem setups come first.

import type {
  Bike,
  Stem,
  Bar,
  SpacerStack,
  FitTarget,
  Permutation,
  Vec2,
  Flag,
} from "./types";
import { frontEndGeometry, dist } from "./geometry";
import { CONSTRAINTS, frontEndFlags, hasError } from "./constraints";

export interface SolverCatalog {
  stems: Stem[];
  bars: Bar[];
  spacerStacks: SpacerStack[];
}

export interface SolverOptions {
  tolerance?: number; // override match tolerance (mm)
  maxResults?: number; // cap returned rows (feasible-first)
  closestMissCount?: number; // rows to surface when nothing is within tolerance (default 5)
}

export function permutationId(p: Permutation): string {
  return `${p.stem.id}|${p.bar?.id ?? "noBar"}|${p.spacers}`;
}

/**
 * Ranking score — lower is better. Encodes the user's priorities:
 *  - feasible combos always beat infeasible ones,
 *  - closer to target is better,
 *  - negative (slammed) stems and fewer spacers are preferred,
 *  - very long stems get a mild penalty.
 */
export function scorePermutation(
  stem: Stem,
  spacers: number,
  error: number,
  feasible: boolean
): number {
  return (
    error +
    (feasible ? 0 : 1000) +
    Math.max(0, stem.angle) * 0.5 + // penalize positive-rise stems
    spacers * 0.15 + // prefer fewer spacers (slammed)
    Math.max(0, stem.length - 110) * 0.1 // mild penalty on very long stems
  );
}

/** True if two permutations are close enough in hardware to read as the same combo. */
function isNearDuplicate(a: Permutation, b: Permutation): boolean {
  return (
    (a.bar?.id ?? null) === (b.bar?.id ?? null) &&
    a.stem.length === b.stem.length &&
    Math.abs(a.stem.angle - b.stem.angle) <= CONSTRAINTS.dedupeAngleEpsDeg &&
    Math.abs(a.spacers - b.spacers) <= CONSTRAINTS.dedupeSpacerEpsMm
  );
}

// Collapse near-duplicate hardware (e.g. a catalog's -6°/-7° stem pair, or
// spacer heights 5mm apart on the same stem) so the results table shows one
// representative per cluster — the best-ranked one, since the list is already
// sorted — instead of a dozen practically-identical rows.
function dedupeNearDuplicates(sorted: Permutation[]): Permutation[] {
  const kept: Permutation[] = [];
  for (const p of sorted) {
    if (!kept.some((k) => isNearDuplicate(k, p))) kept.push(p);
  }
  return kept;
}

/** Restrict the stem search to a bike's fixed angle, if it has one. */
function stemsForBike(bike: Bike, stems: Stem[]): Stem[] {
  if (bike.fixedStemAngle == null) return stems;
  return stems.filter((s) => s.angle === bike.fixedStemAngle);
}

/** Build the "closest achievable" flag, with a directional hint (fwd/back, hi/lo). */
function envelopeMissFlag(matchPoint: Vec2, target: Vec2): Flag {
  const dx = matchPoint.x - target.x;
  const dy = matchPoint.y - target.y;
  const parts: string[] = [];
  if (Math.abs(dx) > 1)
    parts.push(`${Math.abs(dx).toFixed(0)}mm too ${dx > 0 ? "far forward" : "far back"}`);
  if (Math.abs(dy) > 1)
    parts.push(`${Math.abs(dy).toFixed(0)}mm too ${dy > 0 ? "high" : "low"}`);
  const detail = parts.length ? ` (${parts.join(", ")})` : "";
  return {
    code: "out-of-envelope",
    severity: "error",
    message: `No catalog combination reaches this target — closest is ${dist(
      matchPoint,
      target
    ).toFixed(0)}mm off${detail}.`,
  };
}

export function solvePermutations(
  bike: Bike,
  target: FitTarget,
  catalog: SolverCatalog,
  opts: SolverOptions = {}
): Permutation[] {
  const tolerance = opts.tolerance ?? CONSTRAINTS.matchTolerance;
  const closestMissCount = opts.closestMissCount ?? 5;
  const maxSpacerStack =
    bike.maxSpacerStack ?? CONSTRAINTS.defaultMaxSpacerStack;

  // In clamp mode the bar reach doesn't change the matched point, so we don't
  // loop bars — the permutation is just stem x spacers.
  const barOptions: (Bar | undefined)[] =
    target.handMode === "clamp" ? [undefined] : catalog.bars;
  const stems = stemsForBike(bike, catalog.stems);

  const all: Permutation[] = [];

  for (const bar of barOptions) {
    for (const spacers of catalog.spacerStacks) {
      for (const stem of stems) {
        const g = frontEndGeometry(bike, {
          spacers,
          stemLength: stem.length,
          stemAngle: stem.angle,
          stemClampHeight: stem.clampHeight,
          barReach: bar?.reach ?? 0,
          barHoodRise: bar?.hoodRise,
        });
        const matchPoint =
          target.handMode === "clamp" ? g.barClamp : g.hood;
        const error = dist(matchPoint, target.hand);

        const flags = frontEndFlags({ error, spacers, maxSpacerStack, stem });
        const feasible = !hasError(flags) && error <= tolerance;
        all.push({
          stem,
          bar,
          spacers,
          matchPoint,
          clamp: g.barClamp,
          hood: bar ? g.hood : undefined,
          error,
          flags,
          feasible,
          score: scorePermutation(stem, spacers, error, feasible),
        });
      }
    }
  }

  const withinTolerance = all.filter((p) => p.error <= tolerance);
  if (withinTolerance.length > 0) {
    withinTolerance.sort((a, b) => a.score - b.score);
    const deduped = dedupeNearDuplicates(withinTolerance);
    return opts.maxResults ? deduped.slice(0, opts.maxResults) : deduped;
  }

  // Nothing lands within tolerance: the target is outside what any catalog
  // combination can reach. Surface the closest options instead of an empty
  // list, so the UI can explain how far off (and in which direction).
  const closest = dedupeNearDuplicates(
    [...all].sort((a, b) => a.error - b.error)
  ).slice(0, closestMissCount);
  return closest.map((p) => ({
    ...p,
    feasible: false,
    flags: [envelopeMissFlag(p.matchPoint, target.hand), ...p.flags],
  }));
}
