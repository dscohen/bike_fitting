import { describe, it, expect } from "vitest";
import {
  encodeFit,
  decodeFit,
  buildShareUrl,
  fitTokenFromHash,
  type SharedFit,
} from "./share";
import type { Bike, Rider } from "./types";

const bike: Bike = {
  id: "b1",
  name: "Tarmac SL8 — 56",
  reach: 390,
  stack: 553,
  headTubeAngle: 73,
  seatTubeAngle: 73.5,
};
const rider: Rider = {
  id: "r1",
  name: "José Núñez", // non-ASCII to exercise UTF-8 encoding
  fit: { saddleHeight: 720, saddleSetback: 90, handRef: "hood", hoodX: 560, hoodY: 590 },
  body: { heightMm: 1780 },
};
const fit: SharedFit = {
  v: 1,
  bike,
  rider,
  scenario: {
    adjust: { dropDelta: 0, reachDelta: 0, saddleHeightDelta: 0, setbackDelta: 0 },
    crankCurrent: 172.5,
    crankTarget: 165,
  },
};

describe("share encode/decode", () => {
  it("round-trips a fit payload (including non-ASCII names)", () => {
    const decoded = decodeFit(encodeFit(fit));
    expect(decoded).toEqual(fit);
  });

  it("produces a URL-safe token (no +, /, or = padding)", () => {
    const token = encodeFit(fit);
    expect(token).not.toMatch(/[+/=]/);
  });

  it("returns null for garbage or tampered tokens", () => {
    expect(decodeFit("not-base64!!")).toBeNull();
    expect(decodeFit(encodeFit({ ...fit, v: 2 as unknown as 1 }))).toBeNull();
  });

  it("builds a share URL with the fit in the hash", () => {
    const url = buildShareUrl(fit, "https://example.com/app/");
    expect(url.startsWith("https://example.com/app/#fit=")).toBe(true);
    const token = fitTokenFromHash(new URL(url).hash);
    expect(token).toBeTruthy();
    expect(decodeFit(token!)).toEqual(fit);
  });

  it("extracts the fit token from a multi-param hash", () => {
    expect(fitTokenFromHash("#foo=1&fit=ABC123")).toBe("ABC123");
    expect(fitTokenFromHash("#nothing=here")).toBeNull();
  });
});
