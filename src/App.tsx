import { useMemo, useState } from "react";
import { useStore } from "./store/useStore";
import { useSolverCatalog, useSeatposts, useBars } from "./store/selectors";
import { computeScenario } from "./lib/scenario";
import { permutationId } from "./lib/solver";
import type { Permutation } from "./lib/types";
import Toolbar from "./components/Toolbar";
import RiderPanel from "./components/RiderPanel";
import BikePanel from "./components/BikePanel";
import AdjustControls from "./components/AdjustControls";
import BarConstraintControls from "./components/BarConstraintControls";
import SideView from "./components/SideView";
import PermutationsTable from "./components/PermutationsTable";
import SummaryPanel from "./components/SummaryPanel";
import ComparisonView from "./components/ComparisonView";
import { Section } from "./components/ui";

export default function App() {
  const [view, setView] = useState<"studio" | "compare">("studio");
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const scenarios = useStore((s) => s.scenarios);
  const activeScenarioId = useStore((s) => s.activeScenarioId);
  const bikes = useStore((s) => s.bikes);
  const riders = useStore((s) => s.riders);
  const updateBike = useStore((s) => s.updateBike);
  const updateRider = useStore((s) => s.updateRider);
  const updateAdjust = useStore((s) => s.updateAdjust);
  const updateScenario = useStore((s) => s.updateScenario);

  const catalog = useSolverCatalog();
  const seatposts = useSeatposts();
  const bars = useBars();

  const active = scenarios.find((s) => s.id === activeScenarioId);
  const bike = bikes.find((b) => b.id === active?.bikeId);
  const rider = riders.find((r) => r.id === active?.riderId);

  const computed = useMemo(() => {
    if (!bike || !rider || !active) return null;
    return computeScenario(
      bike,
      rider,
      active.adjust,
      catalog,
      seatposts,
      active.barConstraint
    );
  }, [bike, rider, active, catalog, seatposts]);

  const sel = computed
    ? selectedPermutation(computed.permutations, selectedId)
    : undefined;

  if (view === "compare") {
    return (
      <div className="flex h-full flex-col bg-slate-100">
        <Toolbar view={view} onView={setView} />
        <ComparisonView />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <Toolbar view={view} onView={setView} />

      {!active || !bike || !rider ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
          Create or select a scenario to begin.
        </div>
      ) : (
        <main className="grid flex-1 grid-cols-[320px_1fr_360px] gap-3 overflow-hidden p-3">
          {/* Left: inputs */}
          <div className="flex flex-col gap-3 overflow-y-auto">
            <RiderPanel
              rider={rider}
              bars={bars}
              onChange={(patch) => updateRider(rider.id, patch)}
            />
            <BikePanel
              bike={bike}
              onChange={(patch) => updateBike(bike.id, patch)}
            />
            <AdjustControls
              adjust={active.adjust}
              onChange={(patch) => updateAdjust(active.id, patch)}
            />
            {computed?.target && (
              <BarConstraintControls
                mode={computed.target.handMode}
                hasRidersBar={!!rider.currentBarId}
                constraint={active.barConstraint}
                onChange={(barConstraint) =>
                  updateScenario(active.id, { barConstraint })
                }
              />
            )}
          </div>

          {/* Center: drawing */}
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              {computed?.error ? (
                <div className="flex h-full items-center justify-center p-4 text-center text-sm text-red-600">
                  {computed.error}
                </div>
              ) : computed?.target ? (
                <SideView
                  bike={bike}
                  target={computed.target}
                  permutation={sel}
                  saddle={computed.saddle}
                />
              ) : null}
            </div>
          </div>

          {/* Right: results */}
          <div className="flex flex-col gap-3 overflow-y-auto">
            {computed?.target && (
              <SummaryPanel
                target={computed.target}
                saddle={computed.saddle}
                seatpostInsertion={computed.seatpostInsertion}
              />
            )}
            <Section title="Viable permutations">
              {computed?.target && !computed.error ? (
                <PermutationsTable
                  permutations={computed.permutations}
                  mode={computed.target.handMode}
                  currentBarId={rider.currentBarId}
                  selectedId={sel ? permutationId(sel) : undefined}
                  onSelect={(p) => setSelectedId(permutationId(p))}
                />
              ) : (
                <p className="text-xs text-slate-500">
                  Fix the fit inputs to see permutations.
                </p>
              )}
            </Section>
          </div>
        </main>
      )}
    </div>
  );
}

function selectedPermutation(
  permutations: Permutation[],
  selectedId: string | undefined
): Permutation | undefined {
  if (permutations.length === 0) return undefined;
  const found = selectedId
    ? permutations.find((p) => permutationId(p) === selectedId)
    : undefined;
  return found ?? permutations[0];
}
