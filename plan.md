# BikeGeo — Bike Fit → Component Solver & Live 2D CAD

> Working plan mirrored from the approved plan. Update this file as implementation progresses.

## Context

A tool that takes a rider's **fit coordinates** (where the saddle and hands must
end up in space) plus a candidate **frame geometry** and returns which real
**stem / handlebar / seatpost** combinations put the rider in that position —
flagging anything infeasible in **red** (negative-offset seatpost required, stem
too long, stack/reach out of range, saddle past its rail limits). Browser-only
web app, ranked component permutations, live 2D side view, auto-saved library of
bikes and riders with JSON export/import, side-by-side bike comparison.

## Locked decisions
- Static **React + TypeScript + Vite**, browser-only, no backend/accounts.
- **Catalog enumeration + ranking** solver; prioritize negative (slammed) stems.
- v1 = calculator/feasibility engine **and** live 2D side-view drawing.
- Persistence: **localStorage auto-save + JSON export/import** (cloud sync = phase 2).

## Coordinate system & math
BB origin, mm, X+ forward, Y+ up.
- **Hoods:** `u=(−cos HTA, sin HTA)`, `P0=(reach, stack)`, spacers `P1=P0+h·u`,
  stem dir = rotate `(sin HTA, cos HTA)` by stem angle `β`; `P2=P1+L·d`; bar adds
  `(reach, hoodRise)`.
- **Saddle:** seat axis `s=(−cos STA, sin STA)`; setback met by seatpost offset +
  rail range + saddle-nose reference.
- **Flexible inputs → canonical** `{saddleRef, hood}` via `convert.ts`.

## Files
`src/lib/{types,geometry,solver,constraints,convert}.ts` (+ tests),
`src/data/{stems,bars,seatposts,spacers}.ts`, `src/store/useStore.ts` (zustand+persist),
`src/components/{RiderPanel,BikePanel,AdjustControls,SideView,PermutationsTable,Flags,ComparisonView}.tsx`.

## Steps
1. ✅ Scaffold (Vite/React/TS/Tailwind/Zustand/Vitest, types, catalogs).
2. ✅ Geometry + convert (+ tests).
3. ✅ Solver + constraints (+ tests).
4. ✅ Store + persistence.
5. ✅ UI + live SVG drawing.
6. ✅ Comparison view + deploy (README, netlify.toml).

## Verification (done)
21 Vitest tests green (geometry/convert/solver + full-App render smoke test);
`npm run build` typechecks + builds clean; dev server serves 200. Remaining
manual check for the user: drag sliders in the browser and confirm the drawing +
permutations + red flags update live, and that export→reload→import round-trips.
