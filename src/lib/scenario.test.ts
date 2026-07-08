import { describe, it, expect } from "vitest";
import { computeScenario, resolveBars } from "./scenario";
import { DEFAULT_STEMS } from "../data/stems";
import { DEFAULT_BARS } from "../data/bars";
import { DEFAULT_SPACER_STACKS } from "../data/spacers";
import { DEFAULT_SEATPOSTS } from "../data/seatposts";
import type { Bike, Rider } from "./types";

const catalog = {
  stems: DEFAULT_STEMS,
  bars: DEFAULT_BARS,
  spacerStacks: DEFAULT_SPACER_STACKS,
};
const NO_ADJUST = { dropDelta: 0, reachDelta: 0, saddleHeightDelta: 0 };

describe("computeScenario — user's clamp-target example", () => {
  // reach 411, stack 623, HTA 71.5; clamp target (499, 727).
  const bike: Bike = {
    id: "b",
    name: "User frame",
    reach: 411,
    stack: 623,
    headTubeAngle: 71.5,
    seatTubeAngle: 73.5,
  };
  const rider: Rider = {
    id: "r",
    name: "R",
    fit: {
      saddleHeight: 720,
      saddleSetback: 90,
      handRef: "clamp",
      barTopX: 499,
      barTopY: 727,
    },
  };

  const c = computeScenario(bike, rider, NO_ADJUST, catalog, DEFAULT_SEATPOSTS);

  it("resolves in clamp mode targeting the entered point", () => {
    expect(c.error).toBeUndefined();
    expect(c.target!.handMode).toBe("clamp");
    expect(c.target!.hand.x).toBeCloseTo(499, 0);
    expect(c.target!.hand.y).toBeCloseTo(727, 0);
  });

  it("finds a permutation whose CLAMP lands on the target (not offset by bar reach)", () => {
    const best = c.permutations[0];
    expect(best).toBeDefined();
    expect(best.error).toBeLessThan(6); // clamp within a few mm of (499,727)
    expect(Math.abs(best.clamp.x - 499)).toBeLessThan(6);
    expect(Math.abs(best.clamp.y - 727)).toBeLessThan(6);
  });

  it("produces a feasible saddle solution", () => {
    expect(c.saddle?.feasible).toBe(true);
  });
});

describe("resolveBars", () => {
  const riderNoBar: Rider = { id: "r1", name: "R1", fit: { saddleHeight: 720 } };
  const riderWithBar: Rider = {
    id: "r2",
    name: "R2",
    fit: { saddleHeight: 720 },
    currentBarId: "bar-85",
  };

  it("returns the full catalog when no constraint is set", () => {
    expect(resolveBars(catalog, riderNoBar, undefined)).toBe(catalog.bars);
  });

  it("restricts to the rider's bar when onlyRidersBar is set", () => {
    const bars = resolveBars(catalog, riderWithBar, { onlyRidersBar: true });
    expect(bars).toHaveLength(1);
    expect(bars[0].id).toBe("bar-85");
  });

  it("falls back to the full catalog if onlyRidersBar is set but no bar is chosen", () => {
    const bars = resolveBars(catalog, riderNoBar, { onlyRidersBar: true });
    expect(bars).toBe(catalog.bars);
  });

  it("locks to a single synthetic bar of the given reach", () => {
    const bars = resolveBars(catalog, riderNoBar, { lockReach: 95 });
    expect(bars).toHaveLength(1);
    expect(bars[0].reach).toBe(95);
  });

  it("lockReach borrows hoodRise/drop from the rider's current bar", () => {
    const riserRider: Rider = {
      id: "r3",
      name: "R3",
      fit: { saddleHeight: 720 },
      currentBarId: "bar-redshift-top-shelf-70",
    };
    const bars = resolveBars(catalog, riserRider, { lockReach: 95 });
    expect(bars[0].reach).toBe(95);
    expect(bars[0].hoodRise).toBe(70);
  });

  it("lockReach takes precedence over onlyRidersBar", () => {
    const bars = resolveBars(catalog, riderWithBar, {
      onlyRidersBar: true,
      lockReach: 60,
    });
    expect(bars).toHaveLength(1);
    expect(bars[0].reach).toBe(60);
  });
});

describe("computeScenario — bar constraints", () => {
  const bike: Bike = {
    id: "b",
    name: "Test",
    reach: 383,
    stack: 565,
    headTubeAngle: 73,
    seatTubeAngle: 73.5,
  };
  const rider: Rider = {
    id: "r",
    name: "R",
    fit: { saddleHeight: 720, saddleSetback: 90, hoodX: 555, hoodY: 615 },
    currentBarId: "bar-85",
  };

  it("only returns permutations using the rider's bar when onlyRidersBar is set", () => {
    const c = computeScenario(
      bike,
      rider,
      NO_ADJUST,
      catalog,
      DEFAULT_SEATPOSTS,
      { onlyRidersBar: true }
    );
    expect(c.permutations.length).toBeGreaterThan(0);
    for (const p of c.permutations) expect(p.bar?.id).toBe("bar-85");
  });

  it("only returns permutations at the locked reach", () => {
    const c = computeScenario(
      bike,
      rider,
      NO_ADJUST,
      catalog,
      DEFAULT_SEATPOSTS,
      { lockReach: 90 }
    );
    expect(c.permutations.length).toBeGreaterThan(0);
    for (const p of c.permutations) expect(p.bar?.reach).toBe(90);
  });
});
