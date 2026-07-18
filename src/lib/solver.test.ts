import { describe, it, expect } from "vitest";
import { solvePermutations, scorePermutation } from "./solver";
import { frontEndGeometry } from "./geometry";
import { CONSTRAINTS } from "./constraints";
import { DEFAULT_STEMS } from "../data/stems";
import { DEFAULT_BARS } from "../data/bars";
import { DEFAULT_SPACER_STACKS } from "../data/spacers";
import type { Bike, FitTarget, Stem, SaddleTarget } from "./types";

const bike: Bike = {
  id: "b1",
  name: "Test",
  reach: 383,
  stack: 565,
  headTubeAngle: 73,
  seatTubeAngle: 73.5,
};

const catalog = {
  stems: DEFAULT_STEMS,
  bars: DEFAULT_BARS,
  spacerStacks: DEFAULT_SPACER_STACKS,
};

const saddle: SaddleTarget = {
  saddleHeight: 720,
  setbackToNose: 90,
  noseToRailStart: 90,
  railUsableLength: 65,
  clampWidth: 25,
};

// Reference combo: 100mm/-6 stem, 20mm spacers, 80mm-reach bar.
const fe = frontEndGeometry(bike, {
  spacers: 20,
  stemLength: 100,
  stemAngle: -6,
  barReach: 80,
});

describe("solvePermutations — hood mode", () => {
  const target: FitTarget = { hand: fe.hood, handMode: "hood", saddle };
  const results = solvePermutations(bike, target, catalog);

  it("finds the exact-match combo", () => {
    expect(results.find((r) => r.error < 0.5)).toBeDefined();
  });

  it("only returns combos within tolerance", () => {
    for (const r of results)
      expect(r.error).toBeLessThanOrEqual(CONSTRAINTS.matchTolerance + 1e-6);
  });

  it("offers multiple viable stem/bar permutations across bar reaches", () => {
    const feasible = results.filter((r) => r.feasible);
    expect(feasible.length).toBeGreaterThan(1);
    expect(new Set(feasible.map((r) => r.bar?.reach)).size).toBeGreaterThan(1);
  });

  it("ranks a feasible, non-positive-angle stem first", () => {
    expect(results[0].feasible).toBe(true);
    expect(results[0].stem.angle).toBeLessThanOrEqual(0);
  });
});

describe("solvePermutations — clamp mode", () => {
  const target: FitTarget = { hand: fe.barClamp, handMode: "clamp", saddle };
  const results = solvePermutations(bike, target, catalog);

  it("matches the clamp point directly (bar omitted)", () => {
    const exact = results.find((r) => r.error < 0.5);
    expect(exact).toBeDefined();
    expect(exact!.bar).toBeUndefined();
  });

  it("does not duplicate rows per bar", () => {
    // stem x spacers only — no bar dimension.
    const ids = results.map((r) => `${r.stem.id}|${r.spacers}`);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("solvePermutations — closest-miss fallback", () => {
  // The user's transposed-coordinate case: X=727 is far beyond any stem/spacer
  // reach on this frame, and Y=499 is below the frame's stack — unreachable.
  const target: FitTarget = {
    hand: { x: 727, y: 499 },
    handMode: "clamp",
    saddle,
  };
  const results = solvePermutations(bike, target, catalog);

  it("still returns rows instead of an empty list", () => {
    expect(results.length).toBeGreaterThan(0);
  });

  it("marks every row infeasible with an out-of-envelope flag", () => {
    for (const r of results) {
      expect(r.feasible).toBe(false);
      expect(r.flags.some((f) => f.code === "out-of-envelope")).toBe(true);
    }
  });

  it("includes a directional hint in the message", () => {
    const msg = results[0].flags[0].message;
    expect(msg).toMatch(/too far back|too far forward/);
    expect(msg).toMatch(/too high|too low/);
  });

  it("sorts by closeness (ascending error)", () => {
    for (let i = 1; i < results.length; i++) {
      expect(results[i].error).toBeGreaterThanOrEqual(results[i - 1].error);
    }
  });

  it("does not trigger the fallback when a real match exists", () => {
    const goodTarget: FitTarget = { hand: fe.hood, handMode: "hood", saddle };
    const goodResults = solvePermutations(bike, goodTarget, catalog);
    expect(
      goodResults.some((r) => r.flags.some((f) => f.code === "out-of-envelope"))
    ).toBe(false);
  });
});

describe("solvePermutations — fixed stem angle", () => {
  const target: FitTarget = { hand: fe.hood, handMode: "hood", saddle };

  it("only searches stems at the bike's fixed angle", () => {
    const fixedBike: Bike = { ...bike, fixedStemAngle: -6 };
    const results = solvePermutations(fixedBike, target, catalog);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) expect(r.stem.angle).toBe(-6);
  });

  it("excludes every other angle, even the closer-matching ones", () => {
    const fixedBike: Bike = { ...bike, fixedStemAngle: 17 };
    const results = solvePermutations(fixedBike, target, catalog);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) expect(r.stem.angle).toBe(17);
  });
});

describe("scorePermutation", () => {
  const neg: Stem = { id: "n", length: 100, angle: -17 };
  const pos: Stem = { id: "p", length: 100, angle: 17 };

  it("prefers negative-angle stems", () => {
    expect(scorePermutation(neg, 10, 2, true)).toBeLessThan(
      scorePermutation(pos, 10, 2, true)
    );
  });

  it("prefers fewer spacers", () => {
    expect(scorePermutation(neg, 0, 2, true)).toBeLessThan(
      scorePermutation(neg, 40, 2, true)
    );
  });

  it("ranks feasible above infeasible", () => {
    expect(scorePermutation(neg, 10, 2, true)).toBeLessThan(
      scorePermutation(neg, 10, 2, false)
    );
  });
});
