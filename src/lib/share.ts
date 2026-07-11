// Share a single fit (rider + bike) as a self-contained link. The whole payload
// is encoded into the URL hash — no backend — so a client can open the link at
// home and the app imports it locally.

import type { Bar, Bike, Rider, Scenario } from "./types";

export interface SharedFit {
  v: 1;
  bike: Bike;
  rider: Rider;
  // The rider's current bar, only when it's a custom (non-catalog) bar so the
  // recipient — who won't have it — still resolves rider.currentBarId.
  customBar?: Bar;
  scenario: {
    adjust: Scenario["adjust"];
    crankCurrent?: number;
    crankTarget?: number;
    barConstraint?: Scenario["barConstraint"];
  };
}

// --- URL-safe base64 of UTF-8 --------------------------------------------

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeFit(fit: SharedFit): string {
  return toBase64Url(JSON.stringify(fit));
}

/** Decode a share token; returns null if it isn't a valid v1 fit payload. */
export function decodeFit(token: string): SharedFit | null {
  try {
    const parsed = JSON.parse(fromBase64Url(token));
    if (
      parsed &&
      parsed.v === 1 &&
      parsed.bike &&
      typeof parsed.bike.name === "string" &&
      parsed.rider &&
      parsed.rider.fit &&
      parsed.scenario
    ) {
      return parsed as SharedFit;
    }
    return null;
  } catch {
    return null;
  }
}

/** Full shareable URL pointing back at this app with the fit in the hash. */
export function buildShareUrl(fit: SharedFit, base?: string): string {
  const origin =
    base ??
    (typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : "");
  return `${origin}#fit=${encodeFit(fit)}`;
}

/** Pull a fit token out of a location hash (e.g. "#fit=abc" or "#x=1&fit=abc"). */
export function fitTokenFromHash(hash: string): string | null {
  const m = hash.match(/[#&]fit=([^&]+)/);
  return m ? m[1] : null;
}
