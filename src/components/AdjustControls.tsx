// Live-adjust sliders: nudge the fit target and watch the drawing + permutations
// update in real time without editing the saved rider.

import type { Scenario } from "../lib/types";
import { Section, Button } from "./ui";

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
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="flex justify-between text-slate-600">
        <span>{label}</span>
        <span className="font-mono text-slate-800">
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
            onChange({ dropDelta: 0, reachDelta: 0, saddleHeightDelta: 0 })
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
