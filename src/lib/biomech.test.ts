import { describe, it, expect } from "vitest";
import {
  intersectTwoCircles,
  resolveBody,
  hipAngleFor,
  hipAnchor,
  solveHipModel,
} from "./biomech";

const STA = 74;
const SH = 720;
const SETBACK = 90;

// The standard saddle used across tests, and its hip anchor.
const saddle = { setbackToNose: SETBACK, saddleHeight: SH };
const hipPt = () => hipAnchor(SETBACK, SH, STA);

describe("intersectTwoCircles", () => {
  it("finds two symmetric intersections", () => {
    const pts = intersectTwoCircles({ x: -5, y: 0 }, 13, { x: 5, y: 0 }, 13);
    expect(pts).toHaveLength(2);
    // x = 0 for both, y = +/-12
    for (const p of pts) expect(Math.abs(p.x)).toBeLessThan(1e-9);
    expect(pts.map((p) => Math.round(p.y)).sort()).toEqual([-12, 12]);
  });

  it("returns none when circles are too far apart", () => {
    expect(intersectTwoCircles({ x: 0, y: 0 }, 1, { x: 100, y: 0 }, 1)).toHaveLength(0);
  });

  it("returns none when one circle is inside the other", () => {
    expect(intersectTwoCircles({ x: 0, y: 0 }, 100, { x: 0, y: 1 }, 1)).toHaveLength(0);
  });
});

describe("resolveBody", () => {
  it("auto-fits the leg to reach the pedal and derives torso/arm from height", () => {
    const b = resolveBody({ heightMm: 1780 }, SETBACK, SH, STA, 172.5);
    expect(b.source).toBe("from-height");
    expect(b.torsoLength).toBeCloseTo(0.3 * 1780, 3);
    expect(b.armLength).toBeCloseTo(0.33 * 1780, 3);
    // femur + tibia + foot should equal the hip->bottom-pedal span.
    const hip = hipPt();
    const legFit = Math.hypot(hip.x - 0, hip.y - -172.5);
    expect(b.femur + b.tibia + b.foot).toBeCloseTo(legFit, 3);
  });

  it("honours explicit segment overrides and marks the source measured", () => {
    const b = resolveBody({ femur: 400, tibia: 380, foot: 55 }, SETBACK, SH, STA, 170);
    expect(b.femur).toBe(400);
    expect(b.tibia).toBe(380);
    expect(b.foot).toBe(55);
    expect(b.source).toBe("measured");
  });

  it("estimates height from saddle height when none is given", () => {
    const b = resolveBody(undefined, SETBACK, SH, STA, 170);
    expect(b.source).toBe("estimated");
    expect(b.heightMm).toBeCloseTo(SH * 2.41, 3);
  });
});

describe("hip angle and crank opening", () => {
  const hand = { x: 560, y: 590 };
  const body = resolveBody({ heightMm: 1780 }, SETBACK, SH, STA, 172.5);

  it("produces a plausible hip angle at TDC", () => {
    const a = hipAngleFor(hipPt(), hand, 172.5, body);
    expect(a).not.toBeNull();
    // Road hip angles at the top of the stroke land roughly 40-80 degrees.
    expect(a!).toBeGreaterThan(30);
    expect(a!).toBeLessThan(90);
  });

  it("a shorter crank (saddle raised to compensate) opens the hip angle", () => {
    const m = solveHipModel({
      base: saddle,
      evalAt: saddle,
      hand,
      body: { heightMm: 1780 },
      staDeg: STA,
      crankCurrent: 172.5,
      crankTarget: 160,
    });
    expect(m.feasible).toBe(true);
    expect(m.tradeoff).toBeDefined();
    expect(m.tradeoff!.deltaHipDeg).toBeGreaterThan(0); // opened
    // top opens by 2 * (172.5 - 160) = 25mm
    expect(m.tradeoff!.topOpeningMm).toBeCloseTo(25, 6);
  });

  it("moving the saddle back (setback slider) closes the hip angle", () => {
    const base = solveHipModel({
      base: saddle,
      evalAt: saddle,
      hand,
      body: { heightMm: 1780 },
      staDeg: STA,
      crankCurrent: 172.5,
    });
    // Saddle back 30mm and bars back 30mm (preserving reach).
    const back = solveHipModel({
      base: saddle,
      evalAt: { setbackToNose: SETBACK + 30, saddleHeight: SH },
      hand: { x: hand.x - 30, y: hand.y },
      body: { heightMm: 1780 },
      staDeg: STA,
      crankCurrent: 172.5,
    });
    expect(back.hipAngleDeg).toBeLessThan(base.hipAngleDeg);
    // The leg length is fixed to the saved fit, not re-sized by the slider.
    expect(back.body.femur).toBeCloseTo(base.body.femur, 6);
    expect(back.body.tibia).toBeCloseTo(base.body.tibia, 6);
  });
});

describe("crank trade-off restores the baseline hip angle", () => {
  const hand = { x: 560, y: 590 };
  const rawBody = { heightMm: 1780 };
  const body = resolveBody(rawBody, SETBACK, SH, STA, 172.5);

  const m = solveHipModel({
    base: saddle,
    evalAt: saddle,
    hand,
    body: rawBody,
    staDeg: STA,
    crankCurrent: 172.5,
    crankTarget: 155,
  });

  it("saddle-back and bar-drop are both positive for a shorter crank", () => {
    expect(m.tradeoff!.saddleBackMm).toBeGreaterThan(0);
    expect(m.tradeoff!.barDropMm).toBeGreaterThan(0);
  });

  it("applying the pure saddle-back move returns the hip to baseline", () => {
    const t = m.tradeoff!;
    const dc = 172.5 - 155;
    const sta = (STA * Math.PI) / 180;
    const hipOpened = {
      x: m.hip.x - Math.cos(sta) * dc,
      y: m.hip.y + Math.sin(sta) * dc,
    };
    const handOpened = { x: hand.x, y: hand.y + dc };
    const baseline = hipAngleFor(m.hip, hand, 172.5, body)!;
    const restored = hipAngleFor(
      { x: hipOpened.x - t.saddleBackMm, y: hipOpened.y },
      { x: handOpened.x - t.saddleBackMm, y: handOpened.y },
      155,
      body
    )!;
    expect(Math.abs(restored - baseline)).toBeLessThan(0.05);
  });

  it("applying the pure bar-drop move returns the hip to baseline", () => {
    const t = m.tradeoff!;
    const dc = 172.5 - 155;
    const sta = (STA * Math.PI) / 180;
    const hipOpened = {
      x: m.hip.x - Math.cos(sta) * dc,
      y: m.hip.y + Math.sin(sta) * dc,
    };
    const handOpened = { x: hand.x, y: hand.y + dc };
    const baseline = hipAngleFor(m.hip, hand, 172.5, body)!;
    const restored = hipAngleFor(
      hipOpened,
      { x: handOpened.x, y: handOpened.y - t.barDropMm },
      155,
      body
    )!;
    expect(Math.abs(restored - baseline)).toBeLessThan(0.05);
  });

  it("every point on the iso-curve restores the baseline hip angle", () => {
    const t = m.tradeoff!;
    const dc = 172.5 - 155;
    const sta = (STA * Math.PI) / 180;
    const hipOpened = {
      x: m.hip.x - Math.cos(sta) * dc,
      y: m.hip.y + Math.sin(sta) * dc,
    };
    const handOpened = { x: hand.x, y: hand.y + dc };
    const baseline = hipAngleFor(m.hip, hand, 172.5, body)!;
    expect(t.isoCurve.length).toBeGreaterThan(2);
    for (const { dx, dy } of t.isoCurve) {
      const restored = hipAngleFor(
        { x: hipOpened.x - dx, y: hipOpened.y },
        { x: handOpened.x - dx, y: handOpened.y - dy },
        155,
        body
      )!;
      expect(Math.abs(restored - baseline)).toBeLessThan(0.1);
    }
  });

  it("iso-curve endpoints match the pure saddle-back and pure bar-drop moves", () => {
    const t = m.tradeoff!;
    const first = t.isoCurve[0];
    const last = t.isoCurve[t.isoCurve.length - 1];
    expect(first.dx).toBeCloseTo(0, 6);
    expect(first.dy).toBeCloseTo(t.barDropMm, 1);
    expect(last.dx).toBeCloseTo(t.saddleBackMm, 1);
    expect(last.dy).toBeCloseTo(0, 1);
  });
});

describe("infeasible bodies are flagged, not NaN-crashed", () => {
  it("flags a leg that can't reach the pedal", () => {
    const m = solveHipModel({
      base: saddle,
      evalAt: saddle,
      hand: { x: 560, y: 590 },
      body: { femur: 100, tibia: 100, foot: 40 }, // far too short
      staDeg: STA,
      crankCurrent: 172.5,
    });
    expect(m.feasible).toBe(false);
    expect(m.flags.some((f) => f.code === "leg-cannot-reach")).toBe(true);
  });

  it("flags arms that can't reach the hands", () => {
    const m = solveHipModel({
      base: saddle,
      evalAt: saddle,
      hand: { x: 560, y: 590 },
      body: { heightMm: 1780, torsoLength: 100, armLength: 100 },
      staDeg: STA,
      crankCurrent: 172.5,
    });
    expect(m.feasible).toBe(false);
    expect(m.flags.some((f) => f.code === "arms-cannot-reach")).toBe(true);
  });
});
