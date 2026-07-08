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
