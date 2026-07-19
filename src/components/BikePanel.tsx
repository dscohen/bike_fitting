// Edit a bike's frame geometry, plus catalog-wide custom stems/seatposts —
// parts aren't tied to a rider (like bars are, via currentBarId) so there's no
// natural per-rider home for them; a fitter reaches for this when a specific
// bike needs a stem/post the default catalog doesn't have.

import { useState } from "react";
import type { Bike, Seatpost, Stem } from "../lib/types";
import { Section, NumberField, TextField, Button, HelpTip } from "./ui";
import { useStore } from "../store/useStore";

interface Props {
  bike: Bike;
  onChange: (patch: Partial<Bike>) => void;
}

export default function BikePanel({ bike, onChange }: Props) {
  return (
    <Section title="Bike geometry">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <TextField
            label="Bike name"
            value={bike.name}
            onChange={(name) => onChange({ name })}
          />
        </div>
        <NumberField
          label="Reach"
          value={bike.reach}
          onChange={(v) => onChange({ reach: v ?? 0 })}
        />
        <NumberField
          label="Stack"
          value={bike.stack}
          onChange={(v) => onChange({ stack: v ?? 0 })}
        />
        <NumberField
          label="Head tube angle"
          unit="°"
          step={0.1}
          value={bike.headTubeAngle}
          onChange={(v) => onChange({ headTubeAngle: v ?? 0 })}
        />
        <NumberField
          label="Seat tube angle (eff.)"
          unit="°"
          step={0.1}
          value={bike.seatTubeAngle}
          onChange={(v) => onChange({ seatTubeAngle: v ?? 0 })}
        />
        <NumberField
          label="Max spacer stack"
          value={bike.maxSpacerStack}
          placeholder="70"
          onChange={(v) => onChange({ maxSpacerStack: v })}
        />
        <NumberField
          label="Headset cap height"
          value={bike.headsetStack}
          placeholder="0"
          onChange={(v) => onChange({ headsetStack: v })}
        />
        <NumberField
          label="Seat tube length (optional)"
          value={bike.seatTubeLength}
          placeholder="not set"
          onChange={(v) => onChange({ seatTubeLength: v })}
          help="BB center to the top of the seat tube, measured along the tube (c-t) — same convention as saddle height. When set, sanity-checks that the seatpost can be inserted deep enough to meet its minimum-insertion mark at the rider's saddle height."
        />
        <NumberField
          label="Fixed stem angle (optional)"
          unit="°"
          value={bike.fixedStemAngle}
          placeholder="any"
          onChange={(v) => onChange({ fixedStemAngle: v })}
          help="Set this for bikes whose cockpit only accepts one stem angle (integrated cockpits, proprietary stems). The solver and fit-range envelope then only search that angle instead of every angle in the catalog."
        />
      </div>

      <CustomStems />
      <CustomSeatposts />
    </Section>
  );
}

function CustomStems() {
  const customStems = useStore((s) => s.customStems);
  const addStem = useStore((s) => s.addStem);
  const removeStem = useStore((s) => s.removeStem);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{
    length?: number;
    angle?: number;
    clampHeight?: number;
  }>({});

  const save = () => {
    if (draft.length == null || draft.angle == null) return;
    addStem({
      length: draft.length,
      angle: draft.angle,
      clampHeight: draft.clampHeight,
    });
    setDraft({});
    setOpen(false);
  };

  return (
    <details className="mt-3">
      <summary className="flex cursor-pointer items-center text-[11px] text-slate-500 dark:text-slate-400">
        Custom stems
        <HelpTip text="Adds a reusable stem to the catalog (not just this bike) so the solver and fit-range envelope can search it. Length and angle are required; clamp height only matters if it differs from the ~40mm default." />
      </summary>

      {customStems.length > 0 && (
        <ul className="mt-2 space-y-1">
          {customStems.map((s: Stem) => (
            <li
              key={s.id}
              className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
            >
              <span>
                {s.length}mm {s.angle > 0 ? "+" : ""}
                {s.angle}°
                {s.clampHeight != null ? ` · ${s.clampHeight}mm clamp` : ""}
              </span>
              <button
                type="button"
                onClick={() => removeStem(s.id)}
                className="text-[10px] text-red-600 hover:underline dark:text-red-400"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-[10px] text-sky-600 hover:underline dark:text-sky-400"
        >
          + Add custom stem
        </button>
      )}

      {open && (
        <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-3 gap-2">
            <NumberField
              label="Length"
              value={draft.length}
              onChange={(length) => setDraft((d) => ({ ...d, length }))}
              help="Clamp center to steerer center."
            />
            <NumberField
              label="Angle"
              unit="°"
              value={draft.angle}
              onChange={(angle) => setDraft((d) => ({ ...d, angle }))}
              help="Relative to perpendicular-to-steerer; negative = drop."
            />
            <NumberField
              label="Clamp height"
              value={draft.clampHeight}
              placeholder="40"
              onChange={(clampHeight) => setDraft((d) => ({ ...d, clampHeight }))}
              help="Steerer clamp stack height. Leave blank for the ~40mm default."
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="primary"
              onClick={save}
              title={
                draft.length == null || draft.angle == null
                  ? "Enter a length and angle first"
                  : "Add this stem"
              }
            >
              Add stem
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              cancel
            </Button>
            {(draft.length == null || draft.angle == null) && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                length + angle required
              </span>
            )}
          </div>
        </div>
      )}
    </details>
  );
}

function CustomSeatposts() {
  const customSeatposts = useStore((s) => s.customSeatposts);
  const addSeatpost = useStore((s) => s.addSeatpost);
  const removeSeatpost = useStore((s) => s.removeSeatpost);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{
    name: string;
    offset?: number;
    length?: number;
    minInsert?: number;
    railTravel?: number;
  }>({ name: "" });

  const save = () => {
    if (draft.offset == null) return;
    const name = draft.name.trim() || `Custom post (${draft.offset}mm)`;
    addSeatpost({
      name,
      offset: draft.offset,
      length: draft.length,
      minInsert: draft.minInsert,
      railTravel: draft.railTravel,
    });
    setDraft({ name: "" });
    setOpen(false);
  };

  return (
    <details className="mt-3">
      <summary className="flex cursor-pointer items-center text-[11px] text-slate-500 dark:text-slate-400">
        Custom seatposts
        <HelpTip text="Adds a reusable seatpost to the catalog (not just this bike) so the saddle/rail solve and seatpost-insertion check can consider it. Offset is required." />
      </summary>

      {customSeatposts.length > 0 && (
        <ul className="mt-2 space-y-1">
          {customSeatposts.map((p: Seatpost) => (
            <li
              key={p.id}
              className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
            >
              <span>
                {p.name} · {p.offset}mm offset
                {p.length != null ? ` · ${p.length}mm long` : ""}
                {p.minInsert != null ? ` · ${p.minInsert}mm min-insert` : ""}
              </span>
              <button
                type="button"
                onClick={() => removeSeatpost(p.id)}
                className="text-[10px] text-red-600 hover:underline dark:text-red-400"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-[10px] text-sky-600 hover:underline dark:text-sky-400"
        >
          + Add custom seatpost
        </button>
      )}

      {open && (
        <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
          <TextField
            label="Name"
            value={draft.name}
            onChange={(name) => setDraft((d) => ({ ...d, name }))}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <NumberField
              label="Offset"
              value={draft.offset}
              onChange={(offset) => setDraft((d) => ({ ...d, offset }))}
              help="mm of setback; 0 = inline/zero-offset."
            />
            <NumberField
              label="Rail travel"
              value={draft.railTravel}
              placeholder="optional"
              onChange={(railTravel) => setDraft((d) => ({ ...d, railTravel }))}
              help="mm of fore/aft rail adjustment available, each direction."
            />
            <NumberField
              label="Length"
              value={draft.length}
              placeholder="optional"
              onChange={(length) => setDraft((d) => ({ ...d, length }))}
              help="Total post length, clamp-end to tip."
            />
            <NumberField
              label="Min insert"
              value={draft.minInsert}
              placeholder="optional"
              onChange={(minInsert) => setDraft((d) => ({ ...d, minInsert }))}
              help="Minimum insertion depth marked on the post."
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="primary"
              onClick={save}
              title={draft.offset == null ? "Enter an offset first" : "Add this seatpost"}
            >
              Add seatpost
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              cancel
            </Button>
            {draft.offset == null && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                offset required
              </span>
            )}
          </div>
        </div>
      )}
    </details>
  );
}
