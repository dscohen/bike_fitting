import type { Bar } from "../lib/types";

// Default handlebar catalog. `reach` is the horizontal clamp -> hoods distance
// (the number that trades off against stem length). `drop` is informational.
// `hoodRise` is the small vertical offset from clamp center to the hoods.

export const DEFAULT_BARS: Bar[] = [
  { id: "bar-70", name: "Short reach (70)", reach: 70, drop: 122, hoodRise: 0 },
  { id: "bar-75", name: "Compact (75)", reach: 75, drop: 125, hoodRise: 0 },
  { id: "bar-80", name: "Compact (80)", reach: 80, drop: 128, hoodRise: 0 },
  { id: "bar-85", name: "Standard (85)", reach: 85, drop: 130, hoodRise: 0 },
  { id: "bar-90", name: "Standard (90)", reach: 90, drop: 132, hoodRise: 0 },
  { id: "bar-100", name: "Long (100)", reach: 100, drop: 140, hoodRise: 0 },

  // --- Riser / flared gravel bars ------------------------------------------
  // These build a rise into the bar itself (a stub between the stem clamp and
  // the drop-bar section), so `hoodRise` carries that rise instead of the ~0
  // used for ordinary drop bars above. `reach`/`drop` are the bar's own
  // published values, measured from its clamp center same as a normal drop bar.
  {
    id: "bar-controltech-cls-gravel-riser",
    name: "Control Tech CLS Gravel Riser (20mm rise)",
    reach: 75,
    drop: 125,
    hoodRise: 20,
  },
  {
    id: "bar-redshift-top-shelf-50",
    name: "Redshift Top Shelf (50mm riser)",
    reach: 70,
    drop: 110,
    hoodRise: 50,
  },
  {
    id: "bar-redshift-top-shelf-70",
    name: "Redshift Top Shelf (70mm riser)",
    reach: 70,
    drop: 110,
    hoodRise: 70,
  },
  {
    id: "bar-surly-truck-stop",
    name: "Surly Truck Stop Bar (30mm rise)",
    reach: 74,
    drop: 115,
    hoodRise: 30,
  },
];
