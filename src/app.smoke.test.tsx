// Runtime smoke test: render the whole App to a string. Catches render-time
// crashes (bad hooks, undefined access) and exercises the seed scenario through
// convert -> solver -> seatpost. Uses react-dom/server so no DOM env is needed.

import { describe, it, expect, beforeAll } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";

beforeAll(() => {
  // zustand's persist middleware expects a Storage; provide an in-memory one.
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  };
});

describe("App smoke", () => {
  it("renders the seed scenario without throwing", async () => {
    const { default: App } = await import("./App");
    const html = renderToString(createElement(App));
    expect(html).toContain("BikeGeo");
    // Seed rider on the endurance frame should yield viable permutations.
    expect(html).toContain("Viable permutations");
    // A stem size string like "mm" and an angle degree should appear in the table.
    expect(html).toMatch(/\d+mm/);
  });
});
