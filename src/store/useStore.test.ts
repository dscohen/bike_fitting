// zustand's persist middleware needs a Storage; provide an in-memory shim
// before the store module is ever imported.
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  };
});

describe("useStore — duplicateBike", () => {
  it("clones a bike's fields under a new id with a '(copy)' name", async () => {
    const { useStore } = await import("./useStore");
    const original = useStore.getState().bikes[0];
    const countBefore = useStore.getState().bikes.length;

    const newId = useStore.getState().duplicateBike(original.id);
    const bikes = useStore.getState().bikes;
    const copy = bikes.find((b) => b.id === newId);

    expect(bikes.length).toBe(countBefore + 1);
    expect(newId).toBeDefined();
    expect(newId).not.toBe(original.id);
    expect(copy).toMatchObject({
      name: `${original.name} (copy)`,
      reach: original.reach,
      stack: original.stack,
      headTubeAngle: original.headTubeAngle,
      seatTubeAngle: original.seatTubeAngle,
    });
  });

  it("increments the copy suffix on repeated duplication", async () => {
    const { useStore } = await import("./useStore");
    const original = useStore.getState().bikes[0];

    const firstCopyId = useStore.getState().duplicateBike(original.id)!;
    const secondCopyId = useStore.getState().duplicateBike(firstCopyId)!;

    const bikes = useStore.getState().bikes;
    const firstCopy = bikes.find((b) => b.id === firstCopyId)!;
    const secondCopy = bikes.find((b) => b.id === secondCopyId)!;

    expect(firstCopy.name.endsWith("(copy)")).toBe(true);
    expect(secondCopy.name.endsWith("(copy 2)")).toBe(true);
  });

  it("does not mutate the original bike", async () => {
    const { useStore } = await import("./useStore");
    const original = useStore.getState().bikes[0];
    useStore.getState().duplicateBike(original.id);
    const stillOriginal = useStore
      .getState()
      .bikes.find((b) => b.id === original.id);
    expect(stillOriginal).toEqual(original);
  });

  it("returns undefined for an unknown bike id", async () => {
    const { useStore } = await import("./useStore");
    expect(useStore.getState().duplicateBike("does-not-exist")).toBeUndefined();
  });
});

describe("useStore — alphabetical sort", () => {
  const newBike = (name: string) => ({
    name,
    reach: 400,
    stack: 550,
    headTubeAngle: 73,
    seatTubeAngle: 73,
  });

  it("keeps bikes sorted after addBike, regardless of insertion order", async () => {
    const { useStore } = await import("./useStore");
    useStore.getState().addBike(newBike("ZZZ Test Bike"));
    useStore.getState().addBike(newBike("AAA Test Bike"));

    const names = useStore.getState().bikes.map((b) => b.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(names[0]).toBe("AAA Test Bike");
    expect(names[names.length - 1]).toBe("ZZZ Test Bike");
  });

  it("keeps riders sorted after addRider, regardless of insertion order", async () => {
    const { useStore } = await import("./useStore");
    useStore.getState().addRider({ name: "Zed Rider", fit: { saddleHeight: 700 } });
    useStore.getState().addRider({ name: "Aaron Rider", fit: { saddleHeight: 700 } });

    const names = useStore.getState().riders.map((r) => r.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(names[0]).toBe("Aaron Rider");
    expect(names[names.length - 1]).toBe("Zed Rider");
  });

  it("re-sorts bikes after a rename via updateBike", async () => {
    // Checks relative order (not an absolute index) since the store carries
    // state across tests in this file — other tests' bikes may already sort
    // near either extreme.
    const { useStore } = await import("./useStore");
    const laterId = useStore.getState().addBike(newBike("Zzzzz Sort-Test Later"));
    const id = useStore.getState().addBike(newBike("Mzzzzz Sort-Test Mid"));
    useStore.getState().updateBike(id, { name: "Azzzzz Sort-Test Renamed" });

    const bikes = useStore.getState().bikes;
    const renamedIndex = bikes.findIndex((b) => b.id === id);
    const laterIndex = bikes.findIndex((b) => b.id === laterId);
    expect(bikes[renamedIndex].name).toBe("Azzzzz Sort-Test Renamed");
    expect(renamedIndex).toBeLessThan(laterIndex);
  });

  it("re-sorts riders after a rename via updateRider", async () => {
    const { useStore } = await import("./useStore");
    const laterId = useStore.getState().addRider({
      name: "Zzzzz Sort-Test Later",
      fit: { saddleHeight: 700 },
    });
    const id = useStore.getState().addRider({
      name: "Mzzzzz Sort-Test Mid",
      fit: { saddleHeight: 700 },
    });
    useStore.getState().updateRider(id, { name: "Azzzzz Sort-Test Renamed" });

    const riders = useStore.getState().riders;
    const renamedIndex = riders.findIndex((r) => r.id === id);
    const laterIndex = riders.findIndex((r) => r.id === laterId);
    expect(riders[renamedIndex].name).toBe("Azzzzz Sort-Test Renamed");
    expect(renamedIndex).toBeLessThan(laterIndex);
  });

  it("sorts on import", async () => {
    const { useStore } = await import("./useStore");
    useStore.getState().importJSON(
      JSON.stringify({
        data: {
          bikes: [
            { ...newBike("Zoo Bike"), id: "imp-bike-1" },
            { ...newBike("Alpha Bike"), id: "imp-bike-2" },
          ],
          riders: [
            { id: "imp-rider-1", name: "Zebra Rider", fit: { saddleHeight: 700 } },
            { id: "imp-rider-2", name: "Alpha Rider", fit: { saddleHeight: 700 } },
          ],
          scenarios: [],
        },
      })
    );
    const bikeNames = useStore.getState().bikes.map((b) => b.name);
    const riderNames = useStore.getState().riders.map((r) => r.name);
    expect(bikeNames).toEqual(["Alpha Bike", "Zoo Bike"]);
    expect(riderNames).toEqual(["Alpha Rider", "Zebra Rider"]);
  });
});

describe("useStore — removeBike", () => {
  const newBike = (name: string) => ({
    name,
    reach: 400,
    stack: 550,
    headTubeAngle: 73,
    seatTubeAngle: 73,
  });

  it("removes the bike itself", async () => {
    const { useStore } = await import("./useStore");
    const id = useStore.getState().addBike(newBike("Remove-Test Bike"));
    useStore.getState().removeBike(id);
    expect(useStore.getState().bikes.find((b) => b.id === id)).toBeUndefined();
  });

  it("cascades to remove scenarios that reference the deleted bike", async () => {
    const { useStore } = await import("./useStore");
    const riderId = useStore.getState().riders[0].id;
    const bikeId = useStore.getState().addBike(newBike("Cascade-Test Bike"));
    const scenarioId = useStore.getState().addScenario({
      name: "Cascade-Test Scenario",
      riderId,
      bikeId,
      adjust: { dropDelta: 0, reachDelta: 0, saddleHeightDelta: 0 },
    });

    useStore.getState().removeBike(bikeId);

    expect(
      useStore.getState().scenarios.find((s) => s.id === scenarioId)
    ).toBeUndefined();
  });

  it("removes the bike from comparisonBikeIds", async () => {
    const { useStore } = await import("./useStore");
    const bikeId = useStore.getState().addBike(newBike("Comparison-Test Bike"));
    useStore.getState().toggleComparisonBike(bikeId);
    expect(useStore.getState().comparisonBikeIds).toContain(bikeId);

    useStore.getState().removeBike(bikeId);
    expect(useStore.getState().comparisonBikeIds).not.toContain(bikeId);
  });
});

describe("useStore — importSharedFit", () => {
  it("adds the shared rider + bike + scenario with fresh ids and selects it", async () => {
    const { useStore } = await import("./useStore");
    const bikesBefore = useStore.getState().bikes.length;
    const ridersBefore = useStore.getState().riders.length;

    const fit = {
      v: 1 as const,
      bike: {
        id: "shared-bike",
        name: "Shared Frame 54",
        reach: 381,
        stack: 560,
        headTubeAngle: 73,
        seatTubeAngle: 73.5,
      },
      rider: {
        id: "shared-rider",
        name: "Shared Client",
        fit: { saddleHeight: 700, saddleSetback: 85, handRef: "hood" as const, hoodX: 545, hoodY: 600 },
        body: { heightMm: 1720 },
      },
      scenario: {
        adjust: { dropDelta: 0, reachDelta: 0, saddleHeightDelta: 0, setbackDelta: 0 },
        crankCurrent: 170,
        crankTarget: 160,
      },
    };

    const scenarioId = useStore.getState().importSharedFit(fit);
    const s = useStore.getState();

    expect(s.bikes.length).toBe(bikesBefore + 1);
    expect(s.riders.length).toBe(ridersBefore + 1);
    expect(s.activeScenarioId).toBe(scenarioId);

    const scenario = s.scenarios.find((sc) => sc.id === scenarioId)!;
    expect(scenario.crankTarget).toBe(160);
    const bike = s.bikes.find((b) => b.id === scenario.bikeId)!;
    const rider = s.riders.find((r) => r.id === scenario.riderId)!;
    // Fresh ids, not the ids from the payload.
    expect(bike.id).not.toBe("shared-bike");
    expect(rider.id).not.toBe("shared-rider");
    expect(bike.name).toBe("Shared Frame 54");
    expect(rider.fit.saddleHeight).toBe(700);
  });

  it("brings along a referenced custom bar", async () => {
    const { useStore } = await import("./useStore");
    const fit = {
      v: 1 as const,
      bike: {
        id: "b",
        name: "Frame",
        reach: 380,
        stack: 560,
        headTubeAngle: 73,
        seatTubeAngle: 73.5,
      },
      rider: {
        id: "r",
        name: "Client",
        fit: { saddleHeight: 700, saddleSetback: 85 },
        currentBarId: "custom-bar-xyz",
      },
      customBar: {
        id: "custom-bar-xyz",
        name: "Client's Custom Bar",
        reach: 82,
        drop: 128,
        custom: true,
      },
      scenario: { adjust: { dropDelta: 0, reachDelta: 0, saddleHeightDelta: 0 } },
    };

    useStore.getState().importSharedFit(fit);
    expect(
      useStore.getState().customBars.some((b) => b.id === "custom-bar-xyz")
    ).toBe(true);
  });
});

describe("useStore — custom bars", () => {
  it("addBar returns the new id and puts the bar in customBars", async () => {
    const { useStore } = await import("./useStore");
    const id = useStore.getState().addBar({
      name: "Test Riser",
      reach: 82,
      drop: 120,
      hoodRise: 25,
    });
    expect(typeof id).toBe("string");
    const bar = useStore.getState().customBars.find((b) => b.id === id);
    expect(bar).toMatchObject({ name: "Test Riser", reach: 82, hoodRise: 25, custom: true });
  });

  it("removeBar deletes the bar and clears it from riders that referenced it", async () => {
    const { useStore } = await import("./useStore");
    const id = useStore.getState().addBar({ name: "Doomed Bar", reach: 90, drop: 130 });
    const riderId = useStore.getState().addRider({
      name: "Bar-Ref Rider",
      fit: { saddleHeight: 700 },
      currentBarId: id,
    });

    useStore.getState().removeBar(id);

    expect(useStore.getState().customBars.some((b) => b.id === id)).toBe(false);
    const rider = useStore.getState().riders.find((r) => r.id === riderId)!;
    expect(rider.currentBarId).toBeUndefined();
  });
});
