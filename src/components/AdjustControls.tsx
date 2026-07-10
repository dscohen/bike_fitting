// Live-adjust sliders: nudge the fit target and watch the drawing + permutations
// update in real time without editing the saved rider.

import type { Scenario } from "../lib/types";
import { Section, Button, HelpTip } from "./ui";

interface Props {
  adjust: Scenario["adjust"];
  onChange: (patch: Partial<Scenario["adjust"]>) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="flex justify-between text-slate-600 dark:text-slate-300">
        <span className="flex items-center">
          {label}
          {help && <HelpTip text={help} />}
        </span>
        <span className="font-mono text-slate-800 dark:text-slate-100">
          {value > 0 ? "+" : ""}
          {value}mm
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-sky-600"
      />
    </label>
  );
}

export default function AdjustControls({ adjust, onChange }: Props) {
  return (
    <Section
      title="Live adjust"
      right={
        <Button
          variant="ghost"
          onClick={() =>
            onChange({
              dropDelta: 0,
              reachDelta: 0,
              saddleHeightDelta: 0,
              setbackDelta: 0,
            })
          }
        >
          reset
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <Slider
          label="Saddle–bar drop"
          value={adjust.dropDelta}
          min={-40}
          max={40}
          onChange={(dropDelta) => onChange({ dropDelta })}
        />
        <Slider
          label="Saddle–bar reach"
          value={adjust.reachDelta}
          min={-40}
          max={40}
          onChange={(reachDelta) => onChange({ reachDelta })}
          help="Moves the bars fore/aft while the saddle stays put — changes the reach from the saddle to the bars."
        />
        <Slider
          label="Saddle setback"
          value={adjust.setbackDelta ?? 0}
          min={-40}
          max={40}
          onChange={(setbackDelta) => onChange({ setbackDelta })}
          help="Moves the saddle rearward (+) and the bars back the same amount, keeping the saddle-to-bar reach constant — the whole rider shifts back over the BB. Opposite of Saddle–bar reach, which keeps the saddle static."
        />
        <Slider
          label="Saddle height"
          value={adjust.saddleHeightDelta}
          min={-20}
          max={20}
          onChange={(saddleHeightDelta) => onChange({ saddleHeightDelta })}
        />
      </div>
    </Section>
  );
}
