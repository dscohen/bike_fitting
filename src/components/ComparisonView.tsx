// Compare the active rider's fit across several bikes side by side: best
// permutation, feasibility, and a mini drawing per bike.

import { useState } from "react";
import { useStore } from "../store/useStore";
import { useSolverCatalog, useSeatposts } from "../store/selectors";
import { computeScenario } from "../lib/scenario";
import SideView from "./SideView";
import { FlagList } from "./Flags";

const NO_ADJUST = { dropDelta: 0, reachDelta: 0, saddleHeightDelta: 0 };

export default function ComparisonView() {
  const scenarios = useStore((s) => s.scenarios);
  const activeScenarioId = useStore((s) => s.activeScenarioId);
  const bikes = useStore((s) => s.bikes);
  const riders = useStore((s) => s.riders);

  const catalog = useSolverCatalog();
  const seatposts = useSeatposts();

  const active = scenarios.find((s) => s.id === activeScenarioId);
  const [riderId, setRiderId] = useState(active?.riderId ?? riders[0]?.id);
  const [selectedBikes, setSelectedBikes] = useState<string[]>(
    bikes.map((b) => b.id)
  );

  const rider = riders.find((r) => r.id === riderId);

  const toggle = (id: string) =>
    setSelectedBikes((cur) =>
      cur.includes(id) ? cur.filter((b) => b !== id) : [...cur, id]
    );

  if (!rider) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Add a rider to compare.
      </div>
    );
  }

  const shown = bikes.filter((b) => selectedBikes.includes(b.id));

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          rider
          <select
            value={riderId}
            onChange={(e) => setRiderId(e.target.value)}
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
        {bikes.map((b) => (
          <label key={b.id} className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={selectedBikes.includes(b.id)}
              onChange={() => toggle(b.id)}
              className="accent-sky-600"
            />
            {b.name}
          </label>
        ))}
      </div>

      <div className="grid flex-1 auto-rows-min gap-3 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
        {shown.map((bike) => {
          const c = computeScenario(bike, rider, NO_ADJUST, catalog, seatposts);
          const best = c.permutations[0];
          const feasible =
            !!best?.feasible &&
            !!c.saddle?.feasible &&
            (c.seatpostInsertion?.feasible ?? true);
          return (
            <div
              key={bike.id}
              className={`flex flex-col rounded-lg border bg-white p-3 shadow-sm dark:bg-slate-900 ${
                feasible
                  ? "border-slate-200 dark:border-slate-700"
                  : "border-red-200 dark:border-red-900"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {bike.name}
                </h3>
                <span
                  className={`text-[10px] font-medium ${
                    feasible
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {feasible ? "feasible" : "check flags"}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                reach {bike.reach} · stack {bike.stack} · HTA {bike.headTubeAngle}°
              </div>

              <div className="my-2 h-40">
                {c.target && (
                  <SideView
                    bike={bike}
                    target={c.target}
                    permutation={best}
                    saddle={c.saddle}
                  />
                )}
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
