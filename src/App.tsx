import { useEffect, useMemo, useState } from "react";
import { useStore } from "./store/useStore";
import { decodeFit, fitTokenFromHash } from "./lib/share";
import { useSolverCatalog, useSeatposts, useBars } from "./store/selectors";
import { computeScenario, solveComboForHand } from "./lib/scenario";
import { permutationId } from "./lib/solver";
import type { Permutation } from "./lib/types";
import Toolbar from "./components/Toolbar";
import RiderPanel from "./components/RiderPanel";
import BikePanel from "./components/BikePanel";
import AdjustControls from "./components/AdjustControls";
import BarConstraintControls from "./components/BarConstraintControls";
import CrankHipPanel from "./components/CrankHipPanel";
import SideView from "./components/SideView";
import PermutationsTable from "./components/PermutationsTable";
import SummaryPanel from "./components/SummaryPanel";
import FitBoxPanel from "./components/FitBoxPanel";
import ComparisonView from "./components/ComparisonView";
import { Section } from "./components/ui";

export default function App() {
  const [view, setView] = useState<"studio" | "compare">("studio");
  const [selectedId, setSelectedId] = useState<string | undefined>();
  // Lifted above ComparisonView so unchecked bikes stay unchecked when you
  // bounce back to the studio and return to Compare.
  const [hiddenBikeIds, setHiddenBikeIds] = useState<Set<string>>(new Set());

  const scenarios = useStore((s) => s.scenarios);
  const activeScenarioId = useStore((s) => s.activeScenarioId);
  const bikes = useStore((s) => s.bikes);
  const riders = useStore((s) => s.riders);
  const updateBike = useStore((s) => s.updateBike);
  const updateRider = useStore((s) => s.updateRider);
  const updateAdjust = useStore((s) => s.updateAdjust);
  const updateScenario = useStore((s) => s.updateScenario);
  const addScenario = useStore((s) => s.addScenario);
  const importSharedFit = useStore((s) => s.importSharedFit);

  // A shared-fit link (#fit=…) drops the fitter's rider + bike into this
  // browser's library so a client can open it at home. Runs once on load.
  useEffect(() => {
    const token = fitTokenFromHash(window.location.hash);
    if (!token) return;
    // Clear the hash so a refresh doesn't re-import.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
    const fit = decodeFit(token);
    if (!fit) {
      window.alert("This shared-fit link is invalid or corrupted.");
      return;
    }
    if (
      window.confirm(
        `Load shared fit "${fit.rider.name}" on "${fit.bike.name}"? It will be added to your library.`
      )
    ) {
      importSharedFit(fit);
    }
  }, [importSharedFit]);

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
      active.barConstraint,
      { current: active.crankCurrent, target: active.crankTarget }
    );
  }, [bike, rider, active, catalog, seatposts]);

  const sel = computed
    ? selectedPermutation(computed.permutations, selectedId)
    : undefined;

  // Jump from a Compare card straight into the Fit studio for that bike: point
  // the active scenario at it (same as the toolbar's own bike switcher) so the
  // rider, adjust sliders, and bar constraints carry over unchanged.
  const openBikeInStudio = (bikeId: string, riderId: string) => {
    if (active) {
      updateScenario(active.id, { bikeId, riderId });
    } else {
      addScenario({
        name: "New comparison",
        riderId,
        bikeId,
        adjust: { dropDelta: 0, reachDelta: 0, saddleHeightDelta: 0 },
      });
    }
    setView("studio");
  };

  if (view === "compare") {
    return (
      <div className="flex h-full flex-col bg-slate-100 dark:bg-slate-950">
        <Toolbar view={view} onView={setView} />
        <ComparisonView
          onOpenBike={openBikeInStudio}
          hiddenBikeIds={hiddenBikeIds}
          onHiddenBikeIdsChange={setHiddenBikeIds}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-100 dark:bg-slate-950">
      <Toolbar view={view} onView={setView} />

      {!active || !bike || !rider ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
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
            <CrankHipPanel
              hip={computed?.hip}
              crankCurrent={active.crankCurrent}
              crankTarget={active.crankTarget}
              onChange={(patch) => updateScenario(active.id, patch)}
              comboForPoint={(dx, dy) => {
                if (!computed?.target || !computed.hip?.tradeoff)
                  return undefined;
                // Recreate the point's hand target. The bars are fixed through
                // the crank swap, so from the current hand we just move back by
                // dx and down by dy (see crankTradeoff).
                const hand = {
                  x: computed.hip.hand.x - dx,
                  y: computed.hip.hand.y - dy,
                };
                return solveComboForHand(
                  bike,
                  computed.target,
                  hand,
                  catalog,
                  rider,
                  active.barConstraint
                );
              }}
            />
          </div>

          {/* Center: drawing */}
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              {computed?.error ? (
                <div className="flex h-full items-center justify-center p-4 text-center text-sm text-red-600 dark:text-red-400">
                  {computed.error}
                </div>
              ) : computed?.target ? (
                <SideView
                  bike={bike}
                  target={computed.target}
                  permutation={sel}
                  saddle={computed.saddle}
                  hip={computed.hip}
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
                permutation={sel}
              />
            )}
            {computed?.envelope && !computed.error && (
              <FitBoxPanel envelope={computed.envelope} />
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
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
