// Constrain which bars the solver searches: restrict to the rider's own bar,
// or hard-lock to a specific reach (e.g. a fitter who already knows the reach
// they want to use). No-op in clamp mode, since bar choice doesn't affect the
// clamp target — the section is hidden there.

import type { Scenario } from "../lib/types";
import { Section, NumberField } from "./ui";

interface Props {
  mode: "hood" | "clamp";
  hasRidersBar: boolean;
  constraint: Scenario["barConstraint"];
  onChange: (patch: Scenario["barConstraint"]) => void;
}

export default function BarConstraintControls({
  mode,
  hasRidersBar,
  constraint,
  onChange,
}: Props) {
  if (mode === "clamp") return null;

  const onlyRidersBar = constraint?.onlyRidersBar ?? false;
  const excludeRisers = constraint?.excludeRisers ?? false;
  const lockReach = constraint?.lockReach;

  return (
    <Section title="Bar search">
      <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          className="mt-0.5 accent-sky-600"
          checked={onlyRidersBar}
          disabled={!hasRidersBar || lockReach != null}
          onChange={(e) =>
            onChange({ ...constraint, onlyRidersBar: e.target.checked })
          }
        />
        <span>
          Only search the rider's current bar
          {!hasRidersBar && (
            <span className="block text-[10px] text-slate-400 dark:text-slate-500">
              Set a current bar in Rider fit to enable this.
            </span>
          )}
        </span>
      </label>

      <label className="mt-2 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          className="mt-0.5 accent-sky-600"
          checked={excludeRisers}
          onChange={(e) =>
            onChange({ ...constraint, excludeRisers: e.target.checked })
          }
        />
        <span>
          No riser bars
          <span className="block text-[10px] text-slate-400 dark:text-slate-500">
            Exclude bars with built-in rise (Redshift Top Shelf, Surly Truck
            Stop, Control Tech CLS Gravel Riser).
          </span>
        </span>
      </label>

      <div className="mt-2">
        <NumberField
          label="Lock bar reach (overrides above)"
          value={lockReach}
          placeholder="any"
          onChange={(v) => onChange({ ...constraint, lockReach: v })}
        />
      </div>
    </Section>
  );
}
