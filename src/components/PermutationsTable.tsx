// Ranked list of viable permutations. Infeasible rows read red. In clamp mode
// the target is the stem/bar clamp (bar column hidden); in hood mode bar reach
// is part of the combo.

import type { Permutation } from "../lib/types";
import { permutationId } from "../lib/solver";
import { FlagList } from "./Flags";

interface Props {
  permutations: Permutation[];
  mode: "hood" | "clamp";
  currentBarId?: string;
  selectedId?: string;
  onSelect: (p: Permutation) => void;
}

export default function PermutationsTable({
  permutations,
  mode,
  currentBarId,
  selectedId,
  onSelect,
}: Props) {
  if (permutations.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400">
        No combination lands within tolerance. Widen the fit target or add parts
        to the catalog.
      </p>
    );
  }

  const showBar = mode === "hood";
  const isClosestMiss = permutations[0]?.flags.some(
    (f) => f.code === "out-of-envelope"
  );

  return (
    <div className="overflow-x-auto">
      {isClosestMiss && (
        <p className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          No catalog combination reaches this target. Showing the closest
          achievable options instead — see the direction hint in each row's
          notes to know which way to adjust the fit or frame.
        </p>
      )}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <th className="py-1 pr-2">Stem</th>
            {showBar && <th className="py-1 pr-2">Bar</th>}
            <th className="py-1 pr-2">Spacers</th>
            <th className="py-1 pr-2">Δ {mode === "clamp" ? "clamp" : "hoods"}</th>
            <th className="py-1 pr-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {permutations.slice(0, 40).map((p) => {
            const id = permutationId(p);
            const selected = id === selectedId;
            const isRidersBar = !!currentBarId && p.bar?.id === currentBarId;
            return (
              <tr
                key={id}
                onClick={() => onSelect(p)}
                className={`cursor-pointer border-t border-slate-100 dark:border-slate-800 ${
                  selected
                    ? "bg-sky-50 dark:bg-sky-950"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800"
                } ${p.feasible ? "text-slate-700 dark:text-slate-200" : "text-red-600 dark:text-red-400"}`}
              >
                <td className="py-1.5 pr-2 font-medium">
                  {p.stem.length}mm {p.stem.angle > 0 ? "+" : ""}
                  {p.stem.angle}°
                </td>
                {showBar && (
                  <td className="py-1.5 pr-2">
                    {p.bar?.name ?? `${p.bar?.reach}mm`}
                    {isRidersBar && (
                      <span className="ml-1 rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        rider's bar
                      </span>
                    )}
                  </td>
                )}
                <td className="py-1.5 pr-2">{p.spacers}mm</td>
                <td className="py-1.5 pr-2">{p.error.toFixed(1)}mm</td>
                <td className="py-1.5 pr-2">
                  <FlagList flags={p.flags} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
