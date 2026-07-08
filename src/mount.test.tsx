// @vitest-environment jsdom
// Actually mount App into a real DOM to catch client-only crashes that
// server-rendering (renderToString) does not surface.

import { describe, it, expect } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createElement } from "react";

describe("App mounts in the DOM", () => {
  it("renders content into #root without crashing", async () => {
    const { default: App } = await import("./App");
    const container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      createRoot(container).render(createElement(App));
    });

    expect(container.innerHTML.length).toBeGreaterThan(100);
    expect(container.textContent).toContain("BikeGeo");
  });
});
