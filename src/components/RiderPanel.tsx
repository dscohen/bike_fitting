// Edit a rider's fit target. Hand target can be the hoods or the stem/bar clamp
// (bar-top). Saddle inputs are nose-referenced with rail/clamp geometry.

import type { Bar, Rider, RiderBody, RiderFitInput } from "../lib/types";
import { Section, NumberField, TextField, HelpTip } from "./ui";
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
  const body = rider.body ?? {};
  const setBody = (patch: Partial<RiderBody>) =>
    onChange({ body: { ...body, ...patch } });

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
          help="Measured from the bottom bracket center up along the seat tube/seatpost to the top of the saddle — not a straight vertical line."
        />
        <NumberField
          label="Saddle setback (to nose)"
          value={fit.saddleSetback}
          onChange={(v) => setFit({ saddleSetback: v })}
          help="Horizontal distance from the bottom bracket center back to the tip of the saddle nose (how far back the saddle sits)."
        />
      </div>

      {/* Hand target mode toggle */}
      <div className="mt-3">
        <div className="mb-1 flex items-center text-[11px] text-slate-500 dark:text-slate-400">
          Cockpit target point
          <HelpTip text="Choose what the X/Y numbers below describe: where the hands rest on the brake hoods, or the stem/handlebar clamp center (bar-top) itself." />
        </div>
        <div className="flex overflow-hidden rounded border border-slate-300 text-xs dark:border-slate-600">
          {(["hood", "clamp"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setFit({ handRef: m })}
              className={`flex-1 px-2 py-1 ${
                mode === m
                  ? "bg-sky-600 text-white"
                  : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"
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
            <NumberField
              label="Bar-top X (clamp, from BB)"
              value={fit.barTopX}
              onChange={(v) => setFit({ barTopX: v })}
              help="Horizontal distance from the bottom bracket center to the stem/handlebar clamp center — not the hoods themselves."
            />
            <NumberField
              label="Bar-top Y (clamp, from BB)"
              value={fit.barTopY}
              onChange={(v) => setFit({ barTopY: v })}
              help="Vertical distance from the bottom bracket center to the stem/handlebar clamp center — not the hoods themselves."
            />
          </>
        ) : (
          <>
            <NumberField
              label="Hood X (from BB)"
              value={fit.hoodX}
              onChange={(v) => setFit({ hoodX: v })}
              help="Horizontal distance from the bottom bracket center to where the hands rest on the brake hoods."
            />
            <NumberField
              label="Hood Y (from BB)"
              value={fit.hoodY}
              onChange={(v) => setFit({ hoodY: v })}
              help="Vertical distance from the bottom bracket center to where the hands rest on the brake hoods."
            />
          </>
        )}
      </div>

      <div className="mt-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="flex items-center text-slate-600 dark:text-slate-300">
            Rider's current bar (optional)
            <HelpTip text="The handlebar this rider currently uses. Gets called out with a badge in the permutations list, and can be used to restrict or lock the bar search below." />
          </span>
          <select
            value={rider.currentBarId ?? ""}
            onChange={(e) => onChange({ currentBarId: e.target.value || undefined })}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">Not set</option>
            {bars.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
          Called out in the permutations list; can be used to lock the search to
          this bar only (see Bar search below).
        </p>
      </div>

      <div className="mt-3">
        <NumberField
          label="Rider height (for hip angle)"
          value={body.heightMm}
          unit="mm"
          placeholder="optional"
          onChange={(v) => setBody({ heightMm: v })}
          help="Standing height. Used only by the Cranks & hip-angle panel to size the torso and arm (the legs auto-fit the saddle height). Leave blank to estimate from saddle height."
        />
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] text-slate-500 dark:text-slate-400">
          Body segments (advanced)
        </summary>
        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
          Override any segment (mm). Blank ones are derived from height / saddle
          height. Legs auto-fit the saddle height unless set here.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <NumberField
            label="Torso (hip→shoulder)"
            value={body.torsoLength}
            placeholder="from height"
            onChange={(v) => setBody({ torsoLength: v })}
            help="Hip joint up to the shoulder (acromion). Sets the straight-back length; drives the back angle."
          />
          <NumberField
            label="Arm (shoulder→grip)"
            value={body.armLength}
            placeholder="from height"
            onChange={(v) => setBody({ armLength: v })}
            help="Shoulder to the hand grip. With the torso, locates the shoulder for the hip-angle solve."
          />
          <NumberField
            label="Femur (hip→knee)"
            value={body.femur}
            placeholder="auto-fit"
            onChange={(v) => setBody({ femur: v })}
            help="Hip joint to knee. Leave blank to auto-fit the saddle height."
          />
          <NumberField
            label="Tibia (knee→ankle)"
            value={body.tibia}
            placeholder="auto-fit"
            onChange={(v) => setBody({ tibia: v })}
            help="Knee to ankle. Leave blank to auto-fit the saddle height."
          />
          <NumberField
            label="Foot (ankle→spindle)"
            value={body.foot}
            placeholder="~60"
            onChange={(v) => setBody({ foot: v })}
            help="Ankle to pedal spindle, including shoe sole and cleat stack (~60mm typical)."
          />
        </div>
      </details>

      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] text-slate-500 dark:text-slate-400">
          Alternate inputs & saddle rail detail
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <NumberField
            label="Saddle → bar reach"
            value={fit.saddleToBarReach}
            onChange={(v) => setFit({ saddleToBarReach: v })}
            help="Alternative to entering hand X directly: horizontal distance from the saddle nose forward to the hand position."
          />
          <NumberField
            label="Saddle → bar drop"
            value={fit.saddleToBarDrop}
            onChange={(v) => setFit({ saddleToBarDrop: v })}
            help="Alternative to entering hand Y directly: vertical distance from the saddle top down to the hand position (positive = hands lower than saddle)."
          />
          <NumberField
            label="Nose → usable rail start"
            value={fit.saddleNoseToRailStart}
            placeholder={String(SADDLE_DEFAULTS.noseToRailStart)}
            onChange={(v) => setFit({ saddleNoseToRailStart: v })}
            help="Distance from the saddle nose back to where the rails' usable adjustment range begins — check the saddle's rail markings. Defaults to a typical value if left blank."
          />
          <NumberField
            label="Usable rail length"
            value={fit.railUsableLength}
            placeholder={String(SADDLE_DEFAULTS.railUsableLength)}
            onChange={(v) => setFit({ railUsableLength: v })}
            help="How much fore/aft adjustment the saddle rails allow within their marked range. Defaults to a typical value if left blank."
          />
          <NumberField
            label="Clamp width"
            value={fit.clampWidth}
            placeholder={String(SADDLE_DEFAULTS.clampWidth)}
            onChange={(v) => setFit({ clampWidth: v })}
            help="Fore/aft width of the seatpost's rail clamp — it must fit within the usable rail range above. Defaults to a typical value if left blank."
          />
        </div>
      </details>
    </Section>
  );
}
