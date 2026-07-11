// Top toolbar: pick/create the active scenario (rider × bike), manage the
// library, export/import the whole dataset, and switch to the comparison view.

import { useRef, useState } from "react";
import { useStore } from "../store/useStore";
import { buildShareUrl, type SharedFit } from "../lib/share";
import { Button } from "./ui";
import ThemeToggle from "./ThemeToggle";

interface Props {
  view: "studio" | "compare";
  onView: (v: "studio" | "compare") => void;
}

export default function Toolbar({ view, onView }: Props) {
  const {
    scenarios,
    activeScenarioId,
    bikes,
    riders,
    customBars,
    setActiveScenario,
    addScenario,
    removeScenario,
    updateScenario,
    addBike,
    duplicateBike,
    removeBike,
    addRider,
    exportJSON,
    importJSON,
  } = useStore();

  const active = scenarios.find((s) => s.id === activeScenarioId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [shareLabel, setShareLabel] = useState("Share fit");

  const shareFit = () => {
    const bike = bikes.find((b) => b.id === active?.bikeId);
    const rider = riders.find((r) => r.id === active?.riderId);
    if (!active || !bike || !rider) return;
    const customBar = rider.currentBarId
      ? customBars.find((b) => b.id === rider.currentBarId)
      : undefined;
    const payload: SharedFit = {
      v: 1,
      bike,
      rider,
      customBar,
      scenario: {
        adjust: active.adjust,
        crankCurrent: active.crankCurrent,
        crankTarget: active.crankTarget,
        barConstraint: active.barConstraint,
      },
    };
    const url = buildShareUrl(payload);
    const done = () => {
      setShareLabel("Link copied!");
      setTimeout(() => setShareLabel("Share fit"), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done, () =>
        window.prompt("Copy this link to share the fit:", url)
      );
    } else {
      window.prompt("Copy this link to share the fit:", url);
    }
  };

  const doExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bikegeo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = (file: File) => {
    file.text().then((txt) => {
      try {
        importJSON(txt);
      } catch {
        alert("Could not read that file — is it a BikeGeo export?");
      }
    });
  };

  const newScenario = () => {
    const bikeId = active?.bikeId ?? bikes[0]?.id;
    const riderId = active?.riderId ?? riders[0]?.id;
    if (!bikeId || !riderId) return;
    addScenario({
      name: "New comparison",
      riderId,
      bikeId,
      adjust: { dropDelta: 0, reachDelta: 0, saddleHeightDelta: 0 },
    });
  };

  const newBike = () => {
    const id = addBike({
      name: `Bike ${bikes.length + 1}`,
      reach: 385,
      stack: 560,
      headTubeAngle: 73,
      seatTubeAngle: 73.5,
    });
    if (active) updateScenario(active.id, { bikeId: id });
  };

  const duplicateActiveBike = () => {
    if (!active?.bikeId) return;
    const id = duplicateBike(active.bikeId);
    if (id) updateScenario(active.id, { bikeId: id });
  };

  const deleteActiveBike = () => {
    if (!active?.bikeId) return;
    const bike = bikes.find((b) => b.id === active.bikeId);
    const affected = scenarios.filter((s) => s.bikeId === active.bikeId).length;
    const warning =
      affected > 1
        ? `Delete "${bike?.name}"? This also deletes ${affected} scenarios that use it.`
        : `Delete "${bike?.name}"?`;
    if (window.confirm(warning)) removeBike(active.bikeId);
  };

  const newRider = () => {
    const id = addRider({
      name: `Rider ${riders.length + 1}`,
      fit: { saddleHeight: 720, saddleSetback: 90, handRef: "hood", hoodX: 560, hoodY: 590 },
    });
    if (active) updateScenario(active.id, { riderId: id });
  };

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
      <span className="mr-2 text-sm font-bold text-slate-800 dark:text-slate-100">BikeGeo</span>

      {/* Scenario */}
      <select
        value={activeScenarioId ?? ""}
        onChange={(e) => setActiveScenario(e.target.value)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      >
        {scenarios.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <Button onClick={newScenario} title="New scenario">
        + scenario
      </Button>
      {active && scenarios.length > 1 && (
        <Button variant="danger" onClick={() => removeScenario(active.id)}>
          delete
        </Button>
      )}

      <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Rider assignment */}
      <label className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
        rider
        <select
          value={active?.riderId ?? ""}
          onChange={(e) =>
            active && updateScenario(active.id, { riderId: e.target.value })
          }
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          {riders.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <Button variant="ghost" onClick={newRider}>
        +
      </Button>

      {/* Bike assignment */}
      <label className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
        bike
        <select
          value={active?.bikeId ?? ""}
          onChange={(e) =>
            active && updateScenario(active.id, { bikeId: e.target.value })
          }
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          {bikes.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <Button variant="ghost" onClick={newBike} title="Add a new bike">
        +
      </Button>
      <Button
        variant="ghost"
        onClick={duplicateActiveBike}
        title="Duplicate the selected bike (e.g. same model, different size)"
      >
        duplicate
      </Button>
      {active?.bikeId && bikes.length > 1 && (
        <Button
          variant="danger"
          onClick={deleteActiveBike}
          title="Delete the selected bike"
        >
          delete
        </Button>
      )}

      <div className="ml-auto flex items-center gap-2">
        <div className="flex overflow-hidden rounded border border-slate-300 dark:border-slate-600">
          <button
            onClick={() => onView("studio")}
            className={`px-2.5 py-1 text-xs ${
              view === "studio"
                ? "bg-sky-600 text-white"
                : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            Fit studio
          </button>
          <button
            onClick={() => onView("compare")}
            className={`px-2.5 py-1 text-xs ${
              view === "compare"
                ? "bg-sky-600 text-white"
                : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            Compare
          </button>
        </div>
        <Button
          variant="primary"
          onClick={shareFit}
          title="Copy a link that gives this rider + bike to a client to use at home"
        >
          {shareLabel}
        </Button>
        <Button onClick={doExport}>Export</Button>
        <Button onClick={() => fileRef.current?.click()}>Import</Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
        />
        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <ThemeToggle />
      </div>
    </header>
  );
}
