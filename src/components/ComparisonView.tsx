// Compare the active rider's fit across several bikes side by side: best
// permutation, feasibility, and a per-bike visual. Defaults to the fit-range
// envelope, which is drawn at a fixed scale anchored on the rider's target — so
// the frames are directly comparable at a glance (the cockpit diagram is still
// available per-bike but auto-fits each frame, which hides that difference).

import { useStore } from "../store/useStore";
import { useSolverCatalog, useSeatposts } from "../store/selectors";
import { computeScenario } from "../lib/scenario";
import SideView from "./SideView";
import { EnvelopeChart } from "./EnvelopeChart";
import { FlagList } from "./Flags";

const fmt = (v: number) => `${v > 0 ? "+" : ""}${v}mm`;

const NO_ADJUST = {
  dropDelta: 0,
  reachDelta: 0,
  saddleHeightDelta: 0,
  setbackDelta: 0,
};

interface Props {
  // Point the Fit studio at this bike (and rider) and switch to it — lets a
  // fitter go straight from "this one looks best" to dialling it in further.
  onOpenBike: (bikeId: string, riderId: string) => void;
}

// The rest of Compare's own state (hidden bikes, rider, chart mode) lives in
// the store rather than local component state, so it survives switching back
// to the studio and returning — the whole point of this component previously
// resetting to "everything selected" every time.
export default function ComparisonView({ onOpenBike }: Props) {
  const scenarios = useStore((s) => s.scenarios);
  const activeScenarioId = useStore((s) => s.activeScenarioId);
  const bikes = useStore((s) => s.bikes);
  const riders = useStore((s) => s.riders);
  const hiddenBikeIds = useStore((s) => s.compareHiddenBikeIds);
  const toggleCompareBikeHidden = useStore((s) => s.toggleCompareBikeHidden);
  const setCompareHiddenBikeIds = useStore((s) => s.setCompareHiddenBikeIds);
  const compareRiderId = useStore((s) => s.compareRiderId);
  const setCompareRiderId = useStore((s) => s.setCompareRiderId);
  const view = useStore((s) => s.compareView);
  const setView = useStore((s) => s.setCompareView);

  const catalog = useSolverCatalog();
  const seatposts = useSeatposts();

  const active = scenarios.find((s) => s.id === activeScenarioId);
  const riderId = compareRiderId ?? active?.riderId ?? riders[0]?.id;
  const adjust = active?.adjust ?? NO_ADJUST;
  const adjusted =
    adjust.dropDelta !== 0 ||
    adjust.reachDelta !== 0 ||
    adjust.saddleHeightDelta !== 0 ||
    (adjust.setbackDelta ?? 0) !== 0;

  const barConstraint = active?.barConstraint;
  const barConstraintText = [
    barConstraint?.onlyRidersBar && "rider's bar only",
    barConstraint?.excludeRisers && "no risers",
    barConstraint?.lockReach != null && `${barConstraint.lockReach}mm bar locked`,
  ]
    .filter(Boolean)
    .join(" · ");

  const rider = riders.find((r) => r.id === riderId);

  const selectAll = () => setCompareHiddenBikeIds([]);
  const deselectAll = () => setCompareHiddenBikeIds(bikes.map((b) => b.id));

  if (!rider) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Add a rider to compare.
      </div>
    );
  }

  const shown = bikes.filter((b) => !hiddenBikeIds.includes(b.id));

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          rider
          <select
            value={riderId}
            onChange={(e) => setCompareRiderId(e.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            {riders.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-400 dark:text-slate-500">show:</span>
        <button
          onClick={selectAll}
          className="text-[10px] text-sky-600 hover:underline dark:text-sky-400"
        >
          all
        </button>
        <span className="text-[10px] text-slate-300 dark:text-slate-600">/</span>
        <button
          onClick={deselectAll}
          className="text-[10px] text-sky-600 hover:underline dark:text-sky-400"
        >
          none
        </button>
        {bikes.map((b) => (
          <label key={b.id} className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={!hiddenBikeIds.includes(b.id)}
              onChange={() => toggleCompareBikeHidden(b.id)}
              className="accent-sky-600"
            />
            {b.name}
          </label>
        ))}

        {adjusted && (
          <span
            className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300"
            title="These comparisons include the Live adjust sliders from the Fit studio"
          >
            live adjust:{" "}
            {[
              adjust.reachDelta && `reach ${fmt(adjust.reachDelta)}`,
              adjust.dropDelta && `drop ${fmt(adjust.dropDelta)}`,
              adjust.setbackDelta && `setback ${fmt(adjust.setbackDelta)}`,
              adjust.saddleHeightDelta && `saddle ${fmt(adjust.saddleHeightDelta)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}

        {barConstraintText && (
          <span
            className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300"
            title="These comparisons use the Bar search constraints from the Fit studio"
          >
            bar search: {barConstraintText}
          </span>
        )}

        <div className="ml-auto flex overflow-hidden rounded border border-slate-300 dark:border-slate-600">
          {(["range", "diagram"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1 text-xs ${
                view === v
                  ? "bg-sky-600 text-white"
                  : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {v === "range" ? "Fit range" : "Diagram"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid flex-1 auto-rows-min gap-3 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
        {shown.map((bike) => {
          // Honour the live-adjust sliders so the comparison reflects the fit
          // you've actually dialled in, not just the rider's saved numbers.
          const c = computeScenario(
            bike,
            rider,
            adjust,
            catalog,
            seatposts,
            active?.barConstraint
          );
          const best = c.permutations[0];
          const feasible =
            !!best?.feasible &&
            !!c.saddle?.feasible &&
            (c.seatpostInsertion?.feasible ?? true);
          return (
            <div
              key={bike.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenBike(bike.id, rider.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenBike(bike.id, rider.id);
                }
              }}
              title={`Open ${bike.name} in the Fit studio`}
              className={`group flex cursor-pointer flex-col rounded-lg border bg-white p-3 shadow-sm transition hover:border-sky-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-slate-900 dark:hover:border-sky-700 ${
                feasible
                  ? "border-slate-200 dark:border-slate-700"
                  : "border-red-200 dark:border-red-900"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {bike.name}
                </h3>
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-sky-600 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100 dark:text-sky-400">
                    open in Fit studio →
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      feasible
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {feasible ? "feasible" : "check flags"}
                  </span>
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                reach {bike.reach} · stack {bike.stack} · HTA {bike.headTubeAngle}°
              </div>

              <div className="my-2 h-56">
                {view === "range" && c.envelope ? (
                  <EnvelopeChart
                    envelope={c.envelope}
                    className="h-full w-full rounded bg-slate-50 dark:bg-slate-800"
                  />
                ) : c.target ? (
                  <SideView
                    bike={bike}
                    target={c.target}
                    permutation={best}
                    saddle={c.saddle}
                  />
                ) : null}
              </div>

              {c.error ? (
                <p className="text-xs text-red-600 dark:text-red-400">{c.error}</p>
              ) : best ? (
                <div className="text-xs text-slate-700 dark:text-slate-200">
                  <p className="font-medium">
                    {best.stem.length}mm {best.stem.angle > 0 ? "+" : ""}
                    {best.stem.angle}°
                    {best.bar ? ` · ${best.bar.reach}mm bar` : ""} · {best.spacers}mm
                    spacers
                  </p>
                  <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                    Δ target {best.error.toFixed(1)}mm · seatpost{" "}
                    {c.saddle?.requiredOffset.toFixed(0)}mm setback
                  </p>
                  <div className="mt-1 space-y-1">
                    <FlagList flags={best.flags} />
                    {c.saddle && <FlagList flags={c.saddle.flags} />}
                    {c.seatpostInsertion && (
                      <FlagList flags={c.seatpostInsertion.flags} />
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-red-600 dark:text-red-400">
                  No combo lands within tolerance for this frame.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
