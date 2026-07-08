import { describe, it, expect } from "vitest";
import { resolveFitTarget, FitInputError, SADDLE_DEFAULTS } from "./convert";

const near = (a: number, b: number, tol = 0.1) => Math.abs(a - b) <= tol;

describe("resolveFitTarget — hand mode", () => {
  it("defaults to hood mode and uses hood X/Y", () => {
    const t = resolveFitTarget({
      saddleHeight: 720,
      saddleSetback: 90,
      hoodX: 550,
      hoodY: 600,
    });
    expect(t.handMode).toBe("hood");
    expect(near(t.hand.x, 550)).toBe(true);
    expect(near(t.hand.y, 600)).toBe(true);
  });

  it("uses clamp mode from a bar-top input and matches it exactly", () => {
    const t = resolveFitTarget({
      saddleHeight: 720,
      saddleSetback: 90,
      barTopX: 499,
      barTopY: 727,
    });
    expect(t.handMode).toBe("clamp");
    expect(near(t.hand.x, 499)).toBe(true);
    expect(near(t.hand.y, 727)).toBe(true);
  });

  it("honours an explicit handRef", () => {
    const t = resolveFitTarget({
      saddleHeight: 720,
      saddleSetback: 90,
      handRef: "clamp",
      hoodX: 499,
      hoodY: 727,
    });
    expect(t.handMode).toBe("clamp");
    expect(near(t.hand.x, 499)).toBe(true);
  });
});

describe("resolveFitTarget — saddle + cross-derive", () => {
  it("carries saddle scalars with defaults", () => {
    const t = resolveFitTarget({
      saddleHeight: 720,
      saddleSetback: 90,
      hoodX: 550,
      hoodY: 600,
    });
    expect(near(t.saddle.setbackToNose, 90)).toBe(true);
    expect(t.saddle.noseToRailStart).toBe(SADDLE_DEFAULTS.noseToRailStart);
    expect(t.saddle.clampWidth).toBe(SADDLE_DEFAULTS.clampWidth);
  });

  it("cross-derives hand X from setback + saddle-to-bar reach", () => {
    const t = resolveFitTarget({
      saddleHeight: 720,
      saddleSetback: 90,
      saddleToBarReach: 640,
      hoodY: 600,
    });
    expect(near(t.hand.x, 550)).toBe(true); // -90 + 640
  });

  it("derives setback from hand X + reach", () => {
    const t = resolveFitTarget({
      saddleHeight: 720,
      hoodX: 550,
      hoodY: 600,
      saddleToBarReach: 640,
    });
    expect(near(t.saddle.setbackToNose, 90)).toBe(true);
  });

  it("throws when horizontal info is insufficient", () => {
    expect(() => resolveFitTarget({ saddleHeight: 720, hoodY: 600 })).toThrow(
      FitInputError
    );
  });
});
