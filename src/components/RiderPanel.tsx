// Edit a rider's fit target. Hand target can be the hoods or the stem/bar clamp
// (bar-top). Saddle inputs are nose-referenced with rail/clamp geometry.

import type { Bar, Rider, RiderFitInput } from "../lib/types";
import { Section, NumberField, TextField } from "./ui";
import { SADDLE_DEFAULTS } from "../lib/convert";

interface Props {
  rider: Rider;
  bars: Bar[];
  onChange: (patch: Partial<Rider>) => void;
}

export default function RiderPanel({ rider, bars, onChange }: Props) {
  const fit = rider.fit;
  const setFit = (patch: Partial<RiderFitInput>) =>
    onChange({ fit: { ...fit, ...patch } });

  const mode: "hood" | "clamp" =
    fit.handRef ?? (fit.barTopX != null || fit.barTopY != null ? "clamp" : "hood");

  return (
    <Section title="Rider fit">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <TextField
            label="Rider name"
            value={rider.name}
            onChange={(name) => onChange({ name })}
          />
        </div>
        <NumberField
          label="Saddle height (along tube, to top)"
          value={fit.saddleHeight}
          onChange={(v) => setFit({ saddleHeight: v ?? 0 })}
        />
        <NumberField
          label="Saddle setback (to nose)"
          value={fit.saddleSetback}
          onChange={(v) => setFit({ saddleSetback: v })}
        />
      </div>

      {/* Hand target mode toggle */}
      <div className="mt-3">
        <div className="mb-1 text-[11px] text-slate-500">Cockpit target point</div>
        <div className="flex overflow-hidden rounded border border-slate-300 text-xs">
          {(["hood", "clamp"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setFit({ handRef: m })}
              className={`flex-1 px-2 py-1 ${
                mode === m ? "bg-sky-600 text-white" : "bg-white text-slate-600"
              }`}
            >
              {m === "hood" ? "Hoods" : "Bar-top (clamp)"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {mode === "clamp" ? (
          <>
            <NumberField label="Bar-top X (clamp, from BB)" value={fit.barTopX} onChange={(v) => setFit({ barTopX: v })} />
            <NumberField label="Bar-top Y (clamp, from BB)" value={fit.barTopY} onChange={(v) => setFit({ barTopY: v })} />
          </>
        ) : (
          <>
            <NumberField label="Hood X (from BB)" value={fit.hoodX} onChange={(v) => setFit({ hoodX: v })} />
            <NumberField label="Hood Y (from BB)" value={fit.hoodY} onChange={(v) => setFit({ hoodY: v })} />
          </>
        )}
      </div>

      <div className="mt-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-600">Rider's current bar (optional)</span>
          <select
            value={rider.currentBarId ?? ""}
            onChange={(e) => onChange({ currentBarId: e.target.value || undefined })}
            className="rounded border border-slate-300 px-2 py-1 text-xs"
          >
            <option value="">Not set</option>
            {bars.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-1 text-[10px] text-slate-400">
          Called out in the permutations list; can be used to lock the search to
          this bar only (see Bar search below).
        </p>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] text-slate-500">
          Alternate inputs & saddle rail detail
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <NumberField label="Saddle → bar reach" value={fit.saddleToBarReach} onChange={(v) => setFit({ saddleToBarReach: v })} />
          <NumberField label="Saddle → bar drop" value={fit.saddleToBarDrop} onChange={(v) => setFit({ saddleToBarDrop: v })} />
          <NumberField
            label="Nose → usable rail start"
            value={fit.saddleNoseToRailStart}
            placeholder={String(SADDLE_DEFAULTS.noseToRailStart)}
            onChange={(v) => setFit({ saddleNoseToRailStart: v })}
          />
          <NumberField
            label="Usable rail length"
            value={fit.railUsableLength}
            placeholder={String(SADDLE_DEFAULTS.railUsableLength)}
            onChange={(v) => setFit({ railUsableLength: v })}
          />
          <NumberField
            label="Clamp width"
            value={fit.clampWidth}
            placeholder={String(SADDLE_DEFAULTS.clampWidth)}
            onChange={(v) => setFit({ clampWidth: v })}
          />
        </div>
      </details>
    </Section>
  );
}
