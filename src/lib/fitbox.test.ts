import { describe, it, expect } from "vitest";
import {
  convexHull,
  pointInConvex,
  rayToEdge,
  distanceOutside,
  buildFitEnvelope,
} from "./fitbox";
import { frontEndGeometry } from "./geometry";
import { DEFAULT_STEMS } from "../data/stems";
import { DEFAULT_BARS } from "../data/bars";
import type { Bike, FitTarget, Vec2 } from "./types";

const square: Vec2[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

describe("convexHull", () => {
  it("hulls a square and drops interior points", () => {
    const h = convexHull([...square, { x: 5, y: 5 }, { x: 3, y: 7 }]);
    expect(h).toHaveLength(4);
    for (const c of square) {
      expect(h.some((p) => p.x === c.x && p.y === c.y)).toBe(true);
    }
  });

  it("drops collinear points", () => {
    const h = convexHull([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
    expect(h).toHaveLength(4);
  });

  it("returns the input when there are fewer than 3 points", () => {
    expect(convexHull([{ x: 1, y: 1 }])).toHaveLength(1);
  });
});

describe("pointInConvex", () => {
  const h = convexHull(square);
  it("accepts interior points and rejects exterior ones", () => {
    expect(pointInConvex(h, { x: 5, y: 5 })).toBe(true);
    expect(pointInConvex(h, { x: 11, y: 5 })).toBe(false);
    expect(pointInConvex(h, { x: -1, y: 5 })).toBe(false);
  });
  it("accepts points on the boundary", () => {
    expect(pointInConvex(h, { x: 0, y: 5 })).toBe(true);
  });
});

describe("rayToEdge", () => {
  const h = convexHull(square);
  it("measures the distance to the boundary in each direction", () => {
    const p = { x: 4, y: 6 };
    expect(rayToEdge(h, p, { x: 1, y: 0 })).toBeCloseTo(6, 9); // to x=10
    expect(rayToEdge(h, p, { x: -1, y: 0 })).toBeCloseTo(4, 9); // to x=0
    expect(rayToEdge(h, p, { x: 0, y: 1 })).toBeCloseTo(4, 9); // to y=10
    expect(rayToEdge(h, p, { x: 0, y: -1 })).toBeCloseTo(6, 9); // to y=0
  });
});

describe("distanceOutside", () => {
  const h = convexHull(square);
  it("is zero inside and on the boundary", () => {
    expect(distanceOutside(h, { x: 5, y: 5 })).toBe(0);
    expect(distanceOutside(h, { x: 0, y: 5 })).toBe(0);
  });
  it("measures the gap for exterior points", () => {
    expect(distanceOutside(h, { x: 13, y: 5 })).toBeCloseTo(3, 9);
    expect(distanceOutside(h, { x: 5, y: -4 })).toBeCloseTo(4, 9);
    // Diagonal from the corner.
    expect(distanceOutside(h, { x: 13, y: 14 })).toBeCloseTo(5, 9);
  });
});

describe("buildFitEnvelope", () => {
  const bike: Bike = {
    id: "b",
    name: "Endurance 56",
    reach: 383,
    stack: 573,
    headTubeAngle: 72.5,
    seatTubeAngle: 73.5,
    maxSpacerStack: 40,
  };
  const target = (hand: Vec2, handMode: "hood" | "clamp" = "hood"): FitTarget => ({
    hand,
    handMode,
    saddle: {
      saddleHeight: 720,
      setbackToNose: 90,
      noseToRailStart: 90,
      railUsableLength: 65,
      clampWidth: 25,
    },
  });

  const bar = DEFAULT_BARS.find((b) => b.id === "bar-85")!;

  it("the comfortable region sits inside the workable one", () => {
    const e = buildFitEnvelope(bike, target({ x: 520, y: 640 }), DEFAULT_STEMS, bar)!;
    expect(e.core.length).toBeGreaterThan(2);
    expect(e.warn.length).toBeGreaterThan(2);
    // Every comfortable-region vertex is reachable in the workable region too.
    for (const p of e.core) expect(pointInConvex(e.warn, p)).toBe(true);
  });

  it("a point built from a 100mm stem mid-spacers is inside the comfortable region", () => {
    const g = frontEndGeometry(bike, {
      spacers: 20,
      stemLength: 100,
      stemAngle: -6,
      barReach: bar.reach,
      barHoodRise: bar.hoodRise,
    });
    const e = buildFitEnvelope(bike, target(g.hood), DEFAULT_STEMS, bar)!;
    expect(e.inCore).toBe(true);
    expect(e.inWarn).toBe(true);
    expect(e.coreDistance).toBe(0);
    expect(e.room).toBeDefined();
    for (const v of Object.values(e.room!)) expect(v).toBeGreaterThanOrEqual(0);
  });

  it("a 125mm stem lands outside comfortable but inside workable", () => {
    const g = frontEndGeometry(bike, {
      spacers: 20,
      stemLength: 125,
      stemAngle: -6,
      barReach: bar.reach,
      barHoodRise: bar.hoodRise,
    });
    const e = buildFitEnvelope(bike, target(g.hood), DEFAULT_STEMS, bar)!;
    // Strict membership: a 125mm stem is in the warning band, not the core, and
    // the solver's match tolerance must not blur that boundary.
    expect(e.inCore).toBe(false);
    expect(e.inWarn).toBe(true);
    expect(e.coreDistance).toBeGreaterThan(0);
    expect(e.warnDistance).toBe(0);
    expect(e.room).toBeUndefined();
  });

  it("full room reports the region's whole extent, not just the axis-aligned ray", () => {
    // Push the target toward the forward tip of the region: the strict upward
    // ray gets cut off there, but the region still reaches far higher if you
    // give back a little reach.
    const g = frontEndGeometry(bike, {
      spacers: 4,
      stemLength: 119,
      stemAngle: 6,
      barReach: bar.reach,
      barHoodRise: bar.hoodRise,
    });
    const e = buildFitEnvelope(bike, target(g.hood), DEFAULT_STEMS, bar)!;
    expect(e.inCore).toBe(true);
    expect(e.fullRoom).toBeDefined();

    // Full range is never smaller than the strict range, in any direction.
    for (const k of ["forward", "back", "up", "down"] as const) {
      expect(e.fullRoom![k]).toBeGreaterThanOrEqual(e.room![k] - 1e-6);
    }
    // And here it's dramatically bigger upward — the point of the hover view.
    expect(e.fullRoom!.up).toBeGreaterThan(e.room!.up + 20);

    // The full box really is the region's bounding box around the target.
    const t = g.hood;
    expect(t.y + e.fullRoom!.up).toBeCloseTo(Math.max(...e.core.map((p) => p.y)), 6);
    expect(t.x - e.fullRoom!.back).toBeCloseTo(Math.min(...e.core.map((p) => p.x)), 6);
  });

  it("a wildly far target is outside both regions", () => {
    const e = buildFitEnvelope(bike, target({ x: 900, y: 640 }), DEFAULT_STEMS, bar)!;
    expect(e.inCore).toBe(false);
    expect(e.inWarn).toBe(false);
    expect(e.warnDistance).toBeGreaterThan(100);
  });

  it("ignores the bar in clamp mode", () => {
    const e = buildFitEnvelope(
      bike,
      target({ x: 480, y: 640 }, "clamp"),
      DEFAULT_STEMS,
      bar
    )!;
    expect(e.bar).toBeUndefined();
    // The clamp envelope is the hood envelope shifted back by the bar reach.
    const hood = buildFitEnvelope(bike, target({ x: 480, y: 640 }), DEFAULT_STEMS, bar)!;
    const clampMaxX = Math.max(...e.core.map((p) => p.x));
    const hoodMaxX = Math.max(...hood.core.map((p) => p.x));
    expect(hoodMaxX - clampMaxX).toBeCloseTo(bar.reach, 6);
  });

  it("a bigger spacer allowance widens the reachable region", () => {
    const small = buildFitEnvelope(
      { ...bike, maxSpacerStack: 10 },
      target({ x: 520, y: 640 }),
      DEFAULT_STEMS,
      bar
    )!;
    const big = buildFitEnvelope(
      { ...bike, maxSpacerStack: 70 },
      target({ x: 520, y: 640 }),
      DEFAULT_STEMS,
      bar
    )!;
    const spanY = (pts: Vec2[]) =>
      Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
    expect(spanY(big.core)).toBeGreaterThan(spanY(small.core));
  });
});
