// Core domain types for BikeGeo.
//
// Coordinate system: all positions are in millimetres, origin at the bottom
// bracket (BB) center. X+ points forward (toward the front wheel), Y+ points up.

export interface Vec2 {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Bike (frame geometry)
// ---------------------------------------------------------------------------

export interface Bike {
  id: string;
  name: string; // e.g. "Tarmac SL8 56"
  reach: number; // mm, BB -> top of head tube, horizontal
  stack: number; // mm, BB -> top of head tube, vertical
  headTubeAngle: number; // degrees from horizontal (e.g. 73)
  seatTubeAngle: number; // effective STA, degrees from horizontal (e.g. 73.5)
  // Optional headset top-cap + spacer geometry constraints:
  maxSpacerStack?: number; // mm of spacers the steerer allows (default via constants)
  headsetStack?: number; // mm of headset top cap/cover below the first spacer
  // Optional seat tube length (c-t: BB center to top of seat tube, along the
  // tube — same convention as RiderFitInput.saddleHeight). Drives the
  // seatpost-insertion sanity check when provided.
  seatTubeLength?: number;
  // Free-form notes / metadata:
  notes?: string;
}

// ---------------------------------------------------------------------------
// Rider fit target
// ---------------------------------------------------------------------------

// A fit can be entered in several equivalent ways. `convert.ts` reduces whatever
// the user provided into the canonical target below.
export interface RiderFitInput {
  // --- Saddle -------------------------------------------------------------
  saddleHeight: number; // mm along the seat tube axis, BB -> saddle top (above clamp)
  saddleSetback?: number; // mm, horizontal BB -> saddle NOSE (+ = behind BB)
  saddleToBarReach?: number; // mm, horizontal saddle nose -> hand (+ = bars ahead)
  // Saddle rail geometry (drives seatpost/clamp feasibility):
  saddleNoseToRailStart?: number; // mm, nose -> start of usable rail markings (default 40)
  railUsableLength?: number; // mm, length of the usable rail region (default 65)
  clampWidth?: number; // mm, fore/aft width of the seatpost rail clamp (default 25)

  // --- Hands --------------------------------------------------------------
  // Which physical point the hand X/Y refers to. "hood" = the hoods; "clamp" =
  // the stem/bar clamp center (bar-top). Default "hood".
  handRef?: "hood" | "clamp";
  hoodX?: number; // mm, horizontal BB -> hoods
  hoodY?: number; // mm, vertical BB -> hoods
  barTopX?: number; // mm, horizontal BB -> stem/bar clamp center
  barTopY?: number; // mm, vertical BB -> stem/bar clamp center
  // Drop is an alternative vertical form (saddle top -> hand, + = bars below):
  saddleToBarDrop?: number;
}

export interface Rider {
  id: string;
  name: string;
  fit: RiderFitInput;
  currentBarId?: string; // bar this rider currently owns/rides (catalog or custom bar id)
  notes?: string;
}

// Saddle target — kept as scalars because the saddle's actual XY depends on the
// bike's seat-tube angle, so it is solved per-bike (see solveSaddle).
export interface SaddleTarget {
  saddleHeight: number; // mm along the seat tube, BB -> saddle top (above clamp)
  setbackToNose: number; // mm, horizontal BB -> saddle nose (+ = behind BB)
  noseToRailStart: number; // mm, nose -> start of usable rail
  railUsableLength: number; // mm, length of usable rail region
  clampWidth: number; // mm, fore/aft width of the rail clamp
}

// Canonical fit target the solver consumes.
export interface FitTarget {
  hand: Vec2; // BB-origin target for the hands
  handMode: "hood" | "clamp"; // whether `hand` is the hoods or the bar/stem clamp
  saddle: SaddleTarget;
}

// ---------------------------------------------------------------------------
// Components (catalog parts)
// ---------------------------------------------------------------------------

export interface Stem {
  id: string;
  length: number; // mm, clamp center to steerer center
  angle: number; // degrees, relative to perpendicular-to-steerer (negative = drop)
  clampStandard?: "31.8" | "35"; // metadata only
  custom?: boolean;
}

export interface Bar {
  id: string;
  name: string;
  reach: number; // mm, clamp center -> hoods, horizontal-ish
  drop: number; // mm, hoods -> drop ends (informational)
  hoodRise?: number; // mm, vertical clamp -> hoods (usually ~0, slight +)
  custom?: boolean;
}

export interface Seatpost {
  id: string;
  name: string;
  offset: number; // mm of setback (0 = inline / zero-offset)
  railTravel?: number; // mm of fore/aft rail adjustment available (each direction)
  length?: number; // mm, total post length (clamp-end to tip)
  minInsert?: number; // mm, minimum insertion depth marked on the post
  custom?: boolean;
}

// A discrete spacer-stack option (mm below the stem).
export type SpacerStack = number;

// ---------------------------------------------------------------------------
// Solver output
// ---------------------------------------------------------------------------

export type FlagSeverity = "error" | "warning";

export interface Flag {
  code: string;
  severity: FlagSeverity;
  message: string;
}

export interface Permutation {
  stem: Stem;
  bar?: Bar; // undefined in clamp mode (bar reach doesn't affect the clamp match)
  spacers: SpacerStack; // mm
  matchPoint: Vec2; // the point compared to target (clamp or hood, per mode)
  clamp: Vec2; // resulting stem/bar clamp
  hood?: Vec2; // resulting hoods (when a bar is chosen)
  error: number; // mm, distance from target hand point
  flags: Flag[];
  feasible: boolean; // no error-severity flags
  score: number; // lower = better (used for ranking)
}

// Result of placing the saddle for a given bike + rider saddle target.
export interface SaddleSolution {
  saddleTop: Vec2; // BB-origin saddle top
  nose: Vec2; // BB-origin saddle nose
  clampPoint: Vec2; // where the seatpost clamps the rails
  requiredOffset: number; // mm setback the post must provide to center the clamp
  recommended?: Seatpost; // closest feasible catalog post
  railClampOffset?: number; // mm from usable-rail start to the clamp center
  flags: Flag[];
  feasible: boolean;
}

// Sanity check: is there enough seatpost material actually inserted in the
// frame's seat tube to reach the required saddle height safely?
export interface SeatpostInsertionCheck {
  requiredExposedLength: number; // mm of post that must show above the frame
  maxSafeExposure?: number; // mm — post.length - post.minInsert, when known
  post?: Seatpost; // the post the check was evaluated against, if any
  flags: Flag[];
  feasible: boolean;
}

// ---------------------------------------------------------------------------
// Persisted app state
// ---------------------------------------------------------------------------

export interface Scenario {
  id: string;
  name: string;
  riderId: string;
  bikeId: string;
  // Live-adjust deltas applied on top of the rider's saved fit (mm):
  adjust: {
    dropDelta: number;
    reachDelta: number;
    saddleHeightDelta: number;
  };
  // Optionally pin a chosen permutation:
  chosenPermutationId?: string;
  // Constrain which bars the solver searches (hood mode only; no-op in clamp mode):
  barConstraint?: {
    onlyRidersBar?: boolean; // restrict the search to rider.currentBarId
    lockReach?: number; // mm — override to a single synthetic bar of this reach
    excludeRisers?: boolean; // drop bars with built-in rise (hoodRise > 0) from the search
  };
}
