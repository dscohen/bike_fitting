# BikeGeo — Bike Fit → Component Solver & Live 2D CAD

Enter a rider's fit coordinates and one or more frames; BikeGeo returns the real
**stem / handlebar / seatpost** combinations that place the rider on target,
draws the setup as a **live 2D side view**, and flags anything infeasible in
**red** (negative-offset seatpost required, stem too long, spacer stack too
tall, saddle past its rail limits). Everything auto-saves in the browser and can
be exported/imported as JSON.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build locally
npm test           # run the geometry / solver / render tests
```

## How it works

- Everything is computed in a **bottom-bracket-origin** coordinate system (mm,
  X+ forward, Y+ up). See `src/lib/geometry.ts`.
- Flexible fit inputs (saddle setback / saddle-to-bar reach / hood X-Y /
  bar-top X-Y / drop) are reduced to one canonical target in `src/lib/convert.ts`.
- The solver (`src/lib/solver.ts`) enumerates real parts from `src/data/*` and
  ranks feasible combinations, prioritizing negative (slammed) stems.
- Feasibility thresholds live in `src/lib/constraints.ts`.
- App state (bikes, riders, custom parts, scenarios) is a Zustand store
  auto-persisted to `localStorage` (`src/store/useStore.ts`), with JSON
  export/import from the toolbar.

## Deploy (static, no backend)

`npm run build` emits a fully static site in `dist/`. The build uses relative
asset paths (`base: "./"`), so it works from any host or subpath.

- **Netlify:** drag the `dist/` folder onto app.netlify.com, or connect the repo
  with build command `npm run build` and publish directory `dist`.
- **Vercel:** import the repo; framework preset "Vite", output `dist`.
- **GitHub Pages:** push `dist/` to a `gh-pages` branch (or use an action). The
  relative base means no extra config is needed for project-page subpaths.

## Roadmap (phase 2)

- Optional cloud sync / accounts (a small backend) so a fitter's library follows
  them across devices — the data model is already serializable for this.
- Per-part real product catalogs (brands/models) beyond the generic size ranges.
