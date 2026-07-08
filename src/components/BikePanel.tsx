// Edit a bike's frame geometry.

import type { Bike } from "../lib/types";
import { Section, NumberField, TextField } from "./ui";

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
      </div>
    </Section>
  );
}
