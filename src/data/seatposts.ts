import type { Seatpost } from "../lib/types";

// Default seatpost catalog. `offset` is rearward setback (0 = inline).
// `railTravel` is the fore/aft adjustment the saddle rails allow in each
// direction from the clamp's neutral point.
//
// `length`/`minInsert` are generic placeholders, not a specific product: 350mm
// is the common length for road/gravel posts (typically 300-350mm; MTB/dropper
// posts run longer), and 65mm sits in the middle of typical minimum-insertion
// markings (commonly ~60-90mm, with a widely-cited "2x post diameter" CPSC
// rule giving ~54mm for a 27.2mm post). Add a custom seatpost with the real
// numbers off a specific product's spec sheet for an exact check.

const TYPICAL_LENGTH = 350;
const TYPICAL_MIN_INSERT = 65;

export const DEFAULT_SEATPOSTS: Seatpost[] = [
  { id: "post-0", name: "Inline (0mm)", offset: 0, railTravel: 25, length: TYPICAL_LENGTH, minInsert: TYPICAL_MIN_INSERT },
  { id: "post-15", name: "Setback 15mm", offset: 15, railTravel: 25, length: TYPICAL_LENGTH, minInsert: TYPICAL_MIN_INSERT },
  { id: "post-20", name: "Setback 20mm", offset: 20, railTravel: 25, length: TYPICAL_LENGTH, minInsert: TYPICAL_MIN_INSERT },
  { id: "post-25", name: "Setback 25mm", offset: 25, railTravel: 25, length: TYPICAL_LENGTH, minInsert: TYPICAL_MIN_INSERT },
];
