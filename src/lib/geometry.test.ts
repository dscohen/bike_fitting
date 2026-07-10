import { describe, it, expect } from "vitest";
import {
  frontEndGeometry,
  solveSaddle,
  checkSeatpostInsertion,
  rotate,
} from "./geometry";
import { DEFAULT_SEATPOSTS } from "../data/seatposts";
import type { SaddleTarget, Seatpost } from "./types";

const near = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;

describe("rotate", () => {
  it("rotates 90deg CCW", () => {
    const r = rotate({ x: 1, y: 0 }, 90);
    expect(near(r.x, 0)).toBe(true);
    expect(near(r.y, 1)).toBe(true);
  });
});

describe("frontEndGeometry", () => {
  const bike = { reach: 383, stack: 565, headTubeAngle: 73 };

  it("places the hoods (hand-computed reference case)", () => {
    const g = frontEndGeometry(bike, {
      spacers: 20,
      stemLength: 100,
      stemAngle: -6,
      barReach: 80,
    });
    expect(near(g.barClamp.x, 475.32, 0.2)).toBe(true);
    expect(near(g.barClamp.y, 603.21, 0.2)).toBe(true);
    expect(near(g.hood.x, 555.32, 0.2)).toBe(true);
  });

  it("a -17deg stem on a 73deg head tube is level", () => {
    const g = frontEndGeometry(bike, {
      spacers: 0,
      stemLength: 100,
      stemAngle: -17,
      barReach: 0,
    });
    expect(near(g.barClamp.y, g.stemBase.y, 0.2)).toBe(true);
  });

  it("hits the user's clamp target (411/623/71.5 -> ~499,727)", () => {
    // A +17deg / 120mm stem on 40mm spacers should land the CLAMP near (499,727).
    const g = frontEndGeometry(
      { reach: 411, stack: 623, headTubeAngle: 71.5 },
      { spacers: 40, stemLength: 120, stemAngle: 17, barReach: 0 }
    );
    expect(near(g.barClamp.x, 499, 4)).toBe(true);
    expect(near(g.barClamp.y, 727, 5)).toBe(true);
  });
});

describe("solveSaddle", () => {
  const bike = { seatTubeAngle: 73.5 };
  const saddle = (setbackToNose: number): SaddleTarget => ({
    saddleHeight: 720,
    setbackToNose,
    noseToRailStart: 90,
    railUsableLength: 65,
    clampWidth: 25,
  });

  it("computes saddle top from the seat-tube-angle projection", () => {
    const s = solveSaddle(bike, saddle(90), DEFAULT_SEATPOSTS);
    // saddle top Y = 720*sin(73.5) ~ 690.4
    expect(near(s.saddleTop.y, 690.4, 0.3)).toBe(true);
    expect(near(s.nose.x, -90)).toBe(true);
  });

  it("recommends a feasible post for a normal setback", () => {
    const s = solveSaddle(bike, saddle(90), DEFAULT_SEATPOSTS);
    expect(s.feasible).toBe(true);
    expect(s.recommended).toBeDefined();
    // required offset ~ 8mm setback for these numbers
    expect(near(s.requiredOffset, 8, 1)).toBe(true);
  });

  it("flags a too-forward saddle as needing a negative-offset post", () => {
    // Small nose setback -> saddle sits ahead of the usable rail.
    const s = solveSaddle(bike, saddle(40), DEFAULT_SEATPOSTS);
    expect(s.feasible).toBe(false);
    expect(s.flags.some((f) => f.code === "seatpost-negative-offset")).toBe(true);
  });

  it("flags a too-rearward saddle as beyond setback range", () => {
    const s = solveSaddle(bike, saddle(180), DEFAULT_SEATPOSTS);
    expect(s.feasible).toBe(false);
    expect(s.flags.some((f) => f.code === "seatpost-out-of-range")).toBe(true);
  });
});

describe("checkSeatpostInsertion", () => {
  const post: Seatpost = {
    id: "p",
    name: "Test Post",
    offset: 0,
    length: 350,
    minInsert: 65,
  };

  it("is skipped (undefined) when seat tube length isn't provided", () => {
    expect(checkSeatpostInsertion(undefined, 720, post)).toBeUndefined();
  });

  it("is feasible with a normal exposure (well within a 350mm/65mm post)", () => {
    // requiredExposedLength = 720 - 480 = 240mm; maxSafeExposure = 350-65 = 285mm.
    const r = checkSeatpostInsertion(480, 720, post);
    expect(r).toBeDefined();
    expect(r!.requiredExposedLength).toBeCloseTo(240, 5);
    expect(r!.maxSafeExposure).toBe(285);
    expect(r!.feasible).toBe(true);
    expect(r!.flags).toHaveLength(0);
  });

  it("flags insufficient insertion when required exposure exceeds the post's safe max", () => {
    // requiredExposedLength = 900 - 480 = 420mm > maxSafeExposure 285mm.
    const r = checkSeatpostInsertion(480, 900, post);
    expect(r!.feasible).toBe(false);
    expect(
      r!.flags.some((f) => f.code === "seatpost-insufficient-insertion")
    ).toBe(true);
  });

  it("flags a seat tube longer than the saddle height as a distinct error", () => {
    const r = checkSeatpostInsertion(750, 720, post);
    expect(r!.requiredExposedLength).toBeLessThan(0);
    expect(r!.feasible).toBe(false);
    expect(r!.flags.some((f) => f.code === "seat-tube-too-long")).toBe(true);
  });

  it("skips the post-specific check (but still reports exposure) when no post is given", () => {
    const r = checkSeatpostInsertion(480, 720, undefined);
    expect(r!.requiredExposedLength).toBeCloseTo(240, 5);
    expect(r!.maxSafeExposure).toBeUndefined();
    expect(r!.feasible).toBe(true);
  });

  it("skips the post-specific check when the post lacks length/minInsert data", () => {
    const bareCustomPost: Seatpost = { id: "c", name: "Custom", offset: 10 };
    const r = checkSeatpostInsertion(480, 720, bareCustomPost);
    expect(r!.maxSafeExposure).toBeUndefined();
    expect(r!.feasible).toBe(true);
  });
});
