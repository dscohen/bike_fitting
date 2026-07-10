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

  it("excludeRisers drops riser bars from the full-catalog search", () => {
    const bars = resolveBars(catalog, riderNoBar, { excludeRisers: true });
    expect(bars.length).toBeLessThan(catalog.bars.length);
    expect(bars.every((b) => (b.hoodRise ?? 0) === 0)).toBe(true);
    expect(bars.some((b) => b.id === "bar-redshift-top-shelf-70")).toBe(false);
  });

  it("excludeRisers zeroes the borrowed hoodRise under lockReach", () => {
    const riserRider: Rider = {
      id: "r4",
      name: "R4",
      fit: { saddleHeight: 720 },
      currentBarId: "bar-redshift-top-shelf-70",
    };
    const bars = resolveBars(catalog, riserRider, {
      lockReach: 95,
      excludeRisers: true,
    });
    expect(bars[0].reach).toBe(95);
    expect(bars[0].hoodRise).toBe(0);
  });

  it("onlyRidersBar falls back to the riser-filtered pool when the rider's own bar is a riser", () => {
    const riserRider: Rider = {
      id: "r5",
      name: "R5",
      fit: { saddleHeight: 720 },
      currentBarId: "bar-redshift-top-shelf-70",
    };
    const bars = resolveBars(catalog, riserRider, {
      onlyRidersBar: true,
      excludeRisers: true,
    });
    expect(bars.length).toBeGreaterThan(1); // fell back to the filtered pool
    expect(bars.every((b) => (b.hoodRise ?? 0) === 0)).toBe(true);
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

describe("computeScenario — seatpost insertion", () => {
  const baseBike: Bike = {
    id: "b2",
    name: "Test frame",
    reach: 383,
    stack: 565,
    headTubeAngle: 73,
    seatTubeAngle: 73.5,
  };
  const rider: Rider = {
    id: "r2",
    name: "R2",
    fit: { saddleHeight: 720, saddleSetback: 90, hoodX: 555, hoodY: 615 },
  };

  it("omits the check when the bike has no seat tube length set", () => {
    const c = computeScenario(baseBike, rider, NO_ADJUST, catalog, DEFAULT_SEATPOSTS);
    expect(c.seatpostInsertion).toBeUndefined();
  });

  it("runs the check against the recommended post when seat tube length is set", () => {
    const bike: Bike = { ...baseBike, seatTubeLength: 480 };
    const c = computeScenario(bike, rider, NO_ADJUST, catalog, DEFAULT_SEATPOSTS);
    expect(c.seatpostInsertion).toBeDefined();
    expect(c.seatpostInsertion!.requiredExposedLength).toBeCloseTo(240, 5);
    expect(c.seatpostInsertion!.post).toBeDefined();
    expect(c.seatpostInsertion!.feasible).toBe(true);
  });

  it("reflects the live-adjust saddle height delta, not just the saved fit", () => {
    const bike: Bike = { ...baseBike, seatTubeLength: 480 };
    const adjust = { dropDelta: 0, reachDelta: 0, saddleHeightDelta: 30 };
    const c = computeScenario(bike, rider, adjust, catalog, DEFAULT_SEATPOSTS);
    // 720 + 30 - 480 = 270mm required exposure, not the un-adjusted 240mm.
    expect(c.seatpostInsertion!.requiredExposedLength).toBeCloseTo(270, 5);
  });

  it("flags a frame whose seat tube leaves too little room to insert the post safely", () => {
    // A very tall seat tube relative to saddle height => huge required exposure.
    const bike: Bike = { ...baseBike, seatTubeLength: 300 };
    const c = computeScenario(bike, rider, NO_ADJUST, catalog, DEFAULT_SEATPOSTS);
    expect(c.seatpostInsertion!.feasible).toBe(false);
    expect(
      c.seatpostInsertion!.flags.some(
        (f) => f.code === "seatpost-insufficient-insertion"
      )
    ).toBe(true);
  });
});
