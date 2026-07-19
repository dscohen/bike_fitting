// Global app state: the fitter's library of bikes, riders, custom parts, and
// scenarios. Auto-persisted to localStorage; exportable/importable as JSON.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Bike,
  Rider,
  Stem,
  Bar,
  Seatpost,
  Scenario,
} from "../lib/types";
import type { SharedFit } from "../lib/share";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/** "Endurance 56" -> "Endurance 56 (copy)" -> "Endurance 56 (copy 2)" -> ... */
function nextCopyName(name: string): string {
  const m = name.match(/^(.*) \(copy(?: (\d+))?\)$/);
  if (!m) return `${name} (copy)`;
  const n = m[2] ? parseInt(m[2], 10) + 1 : 2;
  return `${m[1]} (copy ${n})`;
}

/** Keeps bike/rider lists (and their dropdowns) alphabetical at all times. */
const byName = <T extends { name: string }>(a: T, b: T) =>
  a.name.localeCompare(b.name);

export interface AppData {
  bikes: Bike[];
  riders: Rider[];
  customStems: Stem[];
  customBars: Bar[];
  customSeatposts: Seatpost[];
  scenarios: Scenario[];
  activeScenarioId?: string;
  // Comparison view's own session state, kept separate from any scenario so
  // it survives switching back to the studio and returning.
  compareHiddenBikeIds: string[]; // bikes unchecked in the comparison view
  compareRiderId?: string; // last-selected rider in the comparison view
  compareView: "range" | "diagram"; // last-selected chart mode in the comparison view
}

export interface AppState extends AppData {
  // Bikes
  addBike: (bike: Omit<Bike, "id">) => string;
  duplicateBike: (id: string) => string | undefined;
  updateBike: (id: string, patch: Partial<Bike>) => void;
  removeBike: (id: string) => void;
  // Riders
  addRider: (rider: Omit<Rider, "id">) => string;
  updateRider: (id: string, patch: Partial<Rider>) => void;
  removeRider: (id: string) => void;
  // Custom parts
  addStem: (stem: Omit<Stem, "id">) => string;
  removeStem: (id: string) => void;
  addBar: (bar: Omit<Bar, "id">) => string;
  removeBar: (id: string) => void;
  addSeatpost: (post: Omit<Seatpost, "id">) => string;
  removeSeatpost: (id: string) => void;
  // Scenarios
  addScenario: (s: Omit<Scenario, "id">) => string;
  updateScenario: (id: string, patch: Partial<Scenario>) => void;
  removeScenario: (id: string) => void;
  setActiveScenario: (id: string | undefined) => void;
  updateAdjust: (id: string, patch: Partial<Scenario["adjust"]>) => void;
  // Comparison
  toggleCompareBikeHidden: (bikeId: string) => void;
  setCompareHiddenBikeIds: (ids: string[]) => void;
  setCompareRiderId: (id: string | undefined) => void;
  setCompareView: (view: "range" | "diagram") => void;
  // Persistence
  exportJSON: () => string;
  importJSON: (json: string) => void;
  importSharedFit: (fit: SharedFit) => string; // returns the new scenario id
  resetAll: () => void;
}

// Seed content so a first-time user has something to look at.
const seedBikes: Bike[] = [
  {
    id: "seed-bike-1",
    name: "Endurance 56",
    reach: 383,
    stack: 573,
    headTubeAngle: 72.5,
    seatTubeAngle: 73.5,
  },
  {
    id: "seed-bike-2",
    name: "Race 56",
    reach: 390,
    stack: 553,
    headTubeAngle: 73,
    seatTubeAngle: 73.5,
  },
];

const seedRiders: Rider[] = [
  {
    id: "seed-rider-1",
    name: "Sample rider",
    fit: {
      saddleHeight: 720,
      saddleSetback: 90,
      handRef: "hood",
      hoodX: 560,
      hoodY: 620,
    },
    body: { heightMm: 1780 },
  },
];

const initialData: AppData = {
  bikes: [...seedBikes].sort(byName),
  riders: [...seedRiders].sort(byName),
  customStems: [],
  customBars: [],
  customSeatposts: [],
  scenarios: [
    {
      id: "seed-scenario-1",
      name: "Sample rider on Endurance 56",
      riderId: "seed-rider-1",
      bikeId: "seed-bike-1",
      adjust: { dropDelta: 0, reachDelta: 0, saddleHeightDelta: 0 },
      crankCurrent: 172.5,
      crankTarget: 165,
    },
  ],
  activeScenarioId: "seed-scenario-1",
  compareHiddenBikeIds: [],
  compareView: "range",
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData,

      addBike: (bike) => {
        const id = uid();
        set((s) => ({ bikes: [...s.bikes, { ...bike, id }].sort(byName) }));
        return id;
      },
      duplicateBike: (id) => {
        const original = get().bikes.find((b) => b.id === id);
        if (!original) return undefined;
        const newId = uid();
        set((s) => ({
          bikes: [
            ...s.bikes,
            { ...original, id: newId, name: nextCopyName(original.name) },
          ].sort(byName),
        }));
        return newId;
      },
      updateBike: (id, patch) =>
        set((s) => ({
          bikes: s.bikes
            .map((b) => (b.id === id ? { ...b, ...patch } : b))
            .sort(byName),
        })),
      removeBike: (id) =>
        set((s) => ({
          bikes: s.bikes.filter((b) => b.id !== id),
          scenarios: s.scenarios.filter((sc) => sc.bikeId !== id),
          compareHiddenBikeIds: s.compareHiddenBikeIds.filter((b) => b !== id),
        })),

      addRider: (rider) => {
        const id = uid();
        set((s) => ({ riders: [...s.riders, { ...rider, id }].sort(byName) }));
        return id;
      },
      updateRider: (id, patch) =>
        set((s) => ({
          riders: s.riders
            .map((r) => (r.id === id ? { ...r, ...patch } : r))
            .sort(byName),
        })),
      removeRider: (id) =>
        set((s) => ({
          riders: s.riders.filter((r) => r.id !== id),
          scenarios: s.scenarios.filter((sc) => sc.riderId !== id),
          compareRiderId: s.compareRiderId === id ? undefined : s.compareRiderId,
        })),

      addStem: (stem) => {
        const id = uid();
        set((s) => ({
          customStems: [...s.customStems, { ...stem, id, custom: true }],
        }));
        return id;
      },
      removeStem: (id) =>
        set((s) => ({
          customStems: s.customStems.filter((st) => st.id !== id),
        })),
      addBar: (bar) => {
        const id = uid();
        set((s) => ({
          customBars: [...s.customBars, { ...bar, id, custom: true }],
        }));
        return id;
      },
      removeBar: (id) =>
        set((s) => ({
          customBars: s.customBars.filter((b) => b.id !== id),
          // Drop the reference from any rider that used this bar.
          riders: s.riders.map((r) =>
            r.currentBarId === id ? { ...r, currentBarId: undefined } : r
          ),
        })),
      addSeatpost: (post) => {
        const id = uid();
        set((s) => ({
          customSeatposts: [...s.customSeatposts, { ...post, id, custom: true }],
        }));
        return id;
      },
      removeSeatpost: (id) =>
        set((s) => ({
          customSeatposts: s.customSeatposts.filter((p) => p.id !== id),
        })),

      addScenario: (sc) => {
        const id = uid();
        set((s) => ({
          scenarios: [...s.scenarios, { ...sc, id }],
          activeScenarioId: id,
        }));
        return id;
      },
      updateScenario: (id, patch) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) =>
            sc.id === id ? { ...sc, ...patch } : sc
          ),
        })),
      removeScenario: (id) =>
        set((s) => ({
          scenarios: s.scenarios.filter((sc) => sc.id !== id),
          activeScenarioId:
            s.activeScenarioId === id ? undefined : s.activeScenarioId,
        })),
      setActiveScenario: (id) => set({ activeScenarioId: id }),
      updateAdjust: (id, patch) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) =>
            sc.id === id ? { ...sc, adjust: { ...sc.adjust, ...patch } } : sc
          ),
        })),

      toggleCompareBikeHidden: (bikeId) =>
        set((s) => ({
          compareHiddenBikeIds: s.compareHiddenBikeIds.includes(bikeId)
            ? s.compareHiddenBikeIds.filter((b) => b !== bikeId)
            : [...s.compareHiddenBikeIds, bikeId],
        })),
      setCompareHiddenBikeIds: (ids) => set({ compareHiddenBikeIds: ids }),
      setCompareRiderId: (id) => set({ compareRiderId: id }),
      setCompareView: (view) => set({ compareView: view }),

      exportJSON: () => {
        const {
          bikes,
          riders,
          customStems,
          customBars,
          customSeatposts,
          scenarios,
        } = get();
        return JSON.stringify(
          {
            version: 1,
            exportedAt: new Date().toISOString(),
            data: {
              bikes,
              riders,
              customStems,
              customBars,
              customSeatposts,
              scenarios,
            },
          },
          null,
          2
        );
      },
      importJSON: (json) => {
        const parsed = JSON.parse(json);
        const d = parsed.data ?? parsed;
        set({
          bikes: (d.bikes ?? []).sort(byName),
          riders: (d.riders ?? []).sort(byName),
          customStems: d.customStems ?? [],
          customBars: d.customBars ?? [],
          customSeatposts: d.customSeatposts ?? [],
          scenarios: d.scenarios ?? [],
          activeScenarioId: (d.scenarios ?? [])[0]?.id,
          compareHiddenBikeIds: [],
          compareRiderId: undefined,
          compareView: "range",
        });
      },
      importSharedFit: (fit) => {
        const bikeId = uid();
        const riderId = uid();
        const scenarioId = uid();
        const bike: Bike = { ...fit.bike, id: bikeId };
        const rider: Rider = { ...fit.rider, id: riderId };
        set((s) => {
          // Bring along the rider's custom bar (if any) so currentBarId resolves.
          const customBars =
            fit.customBar && !s.customBars.some((b) => b.id === fit.customBar!.id)
              ? [...s.customBars, fit.customBar]
              : s.customBars;
          const scenario: Scenario = {
            id: scenarioId,
            name: `${rider.name} on ${bike.name}`,
            riderId,
            bikeId,
            adjust: fit.scenario.adjust,
            crankCurrent: fit.scenario.crankCurrent,
            crankTarget: fit.scenario.crankTarget,
            barConstraint: fit.scenario.barConstraint,
          };
          return {
            bikes: [...s.bikes, bike].sort(byName),
            riders: [...s.riders, rider].sort(byName),
            customBars,
            scenarios: [...s.scenarios, scenario],
            activeScenarioId: scenarioId,
          };
        });
        return scenarioId;
      },
      resetAll: () => set({ ...initialData }),
    }),
    {
      name: "bikegeo",
      version: 1,
    }
  )
);
