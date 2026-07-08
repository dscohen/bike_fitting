import type { Seatpost } from "../lib/types";

// Default seatpost catalog. `offset` is rearward setback (0 = inline).
// `railTravel` is the fore/aft adjustment the saddle rails allow in each
// direction from the clamp's neutral point.

export const DEFAULT_SEATPOSTS: Seatpost[] = [
  { id: "post-0", name: "Inline (0mm)", offset: 0, railTravel: 25 },
  { id: "post-15", name: "Setback 15mm", offset: 15, railTravel: 25 },
  { id: "post-20", name: "Setback 20mm", offset: 20, railTravel: 25 },
  { id: "post-25", name: "Setback 25mm", offset: 25, railTravel: 25 },
];
