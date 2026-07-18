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
  // Some bikes (integrated cockpits, proprietary stems) only accept one stem
  // angle. Opt in by setting this — the solver and fit-range envelope then
  // only consider catalog stems at exactly this angle, instead of every angle.
  fixedStemAngle?: number;
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

// Optional rider body measurements, used by the hip-angle model. A single
// height drives everything via anthropometric ratios; any segment can be
// overridden directly (all mm). Leg segments (femur/tibia/foot) default to
// auto-fitting the saddle height so the leg always reaches the pedal.
export interface RiderBody {
  heightMm?: number; // standing height; derives the segments below when they're blank
  torsoLength?: number; // hip joint -> shoulder (acromion)
  armLength?: number; // shoulder -> hand grip
  femur?: number; // hip joint -> knee
  tibia?: number; // knee -> ankle
  foot?: number; // ankle -> pedal spindle (shoe + cleat stack)
}

export interface Rider {
  id: string;
  name: string;
  fit: RiderFitInput;
  currentBarId?: string; // bar this rider currently owns/rides (catalog or custom bar id)
  body?: RiderBody; // optional; enables the hip-angle / crank model
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
  // mm, height of the steerer clamp ("stack height"). The stem's extension
  // leaves the steerer at HALF this height above the spacer stack, so it shifts
  // the bar clamp up/back along the steerer. Defaults via CONSTRAINTS.
  clampHeight?: number;
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
  recommended?: Seatpost; // closest feasible catalog post (best centers the clamp)
  feasiblePosts: Seatpost[]; // all catalog posts whose clamp lands within the usable rail
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
// Fit range envelope ("how much room does this bike + bar give me?")
// ---------------------------------------------------------------------------

// How far the target can move in each direction before leaving a region (mm).
export interface FitRoom {
  forward: number;
  back: number;
  up: number;
  down: number;
}

// The reachable hand positions for a bike + bar, swept over a band of stem
// lengths and the whole spacer range. `core` is the comfortable stem band,
// `warn` the wider workable one. Both are convex hulls (BB-origin mm).
export interface FitEnvelope {
  handMode: "hood" | "clamp";
  bar?: Bar; // the bar this envelope assumes (hood mode only)
  core: Vec2[];
  warn: Vec2[];
  target: Vec2; // the rider's hand target, for comparison
  inCore: boolean;
  inWarn: boolean;
  coreDistance: number; // mm the target sits outside the comfortable region (0 = inside)
  warnDistance: number; // mm the target sits outside the workable region (0 = inside)
  // Distance from the target out to a region's edge, per direction (mm).
  // `room` is against the comfortable region, `roomWarn` the workable one; each
  // is only present when the target is actually inside that region.
  //
  // These are STRICT: the ray holds the other axis fixed, so a target sitting
  // near a pointed corner reports very little room even when the region extends
  // much further. `fullRoom` is the region's overall extent from the target —
  // what you can reach if you also give a little on the other axis (e.g. more
  // height in exchange for slightly less reach).
  room?: FitRoom;
  roomWarn?: FitRoom;
  fullRoom?: FitRoom;
  fullRoomWarn?: FitRoom;
  stemCore: [number, number];
  stemWarn: [number, number];
  spacerMax: number;
}

// ---------------------------------------------------------------------------
// Hip-angle / crank model
// ---------------------------------------------------------------------------

// Concrete segment lengths (mm) the hip model runs on, plus how they were
// obtained (for a UI note). Leg segments are chosen so the leg reaches the
// pedal at the given saddle height unless the rider overrode them.
export interface ResolvedBody {
  heightMm: number;
  torsoLength: number;
  armLength: number;
  femur: number;
  tibia: number;
  foot: number; // ankle -> pedal spindle
  source: "measured" | "from-height" | "estimated"; // provenance for a UI hint
}

// The saddle-back / bar-drop moves that restore a baseline hip angle after a
// crank change, plus the full iso-hip-angle trade-off locus between them.
export interface CrankTradeoff {
  crankCurrent: number;
  crankTarget: number;
  topOpeningMm: number; // TDC hip->pedal gap change = 2 * (current - target)
  implicitDropMm: number; // extra saddle->bar drop from raising the saddle (bars fixed)
  deltaHipDeg: number; // hip angle opened by the crank change (target - current), net of the implicit drop
  saddleBackMm: number; // rearward saddle (+ bars back same) that restores baseline
  barDropMm: number; // extra bar drop that restores baseline
  isoCurve: { dx: number; dy: number }[]; // (saddle-back, bar-drop) mixes holding baseline
  feasible: boolean;
}

// Result of evaluating the rider's hip angle at top-dead-center for a bike/fit.
export interface HipModelResult {
  hip: Vec2; // hip joint (BB-origin)
  kneeTop: Vec2; // knee at top-dead-center
  pedalTop: Vec2; // pedal spindle at top-dead-center (0, crank)
  shoulder: Vec2; // shoulder (from the straight-back torso solve)
  hand: Vec2; // hand target used
  hipAngleDeg: number; // torso-to-femur angle at TDC (smaller = more closed)
  backAngleDeg: number; // torso to horizontal
  body: ResolvedBody;
  tradeoff?: CrankTradeoff; // present when a target crank differs from current
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
    reachDelta: number; // moves the bars only (saddle static)
    saddleHeightDelta: number;
    setbackDelta?: number; // moves the saddle back AND the bars back the same
  };
  // Optionally pin a chosen permutation:
  chosenPermutationId?: string;
  // Crank length comparison for the hip-angle panel (mm). crankCurrent is the
  // rider's present crank; crankTarget is the "what if" being evaluated.
  crankCurrent?: number;
  crankTarget?: number;
  // Constrain which bars the solver searches (hood mode only; no-op in clamp mode):
  barConstraint?: {
    onlyRidersBar?: boolean; // restrict the search to rider.currentBarId
    lockReach?: number; // mm — override to a single synthetic bar of this reach
    excludeRisers?: boolean; // drop bars with built-in rise (hoodRise > 0) from the search
  };
}
