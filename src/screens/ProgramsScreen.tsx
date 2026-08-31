import { Confirm } from "../components/Confirm";
import { go } from "../logic/routes";
import { isStore } from "../logic/storage";
import { createSeedStore } from "../seed";
import { useStore } from "../store-context";
import { useState } from "react";
import type { Program } from "../types";

export function ProgramsScreen() {
  const { store, dispatch } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);

  const addProgram = () => {
    const program: Program = {
      id: crypto.randomUUID(),
      name: "New training",
      accent: "#d6ff3e",
      exercises: [],
    };
    dispatch({ type: "upsert-program", program });
    go({ name: "program-edit", id: program.id });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "train-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isStore(parsed)) return;
      dispatch({ type: "replace-store", store: parsed });
    } catch {
      /* ignore bad files */
    }
  };

  return (
    <div className="screen">
      <header className="page-head">
        <p className="eyebrow">Plans</p>
        <h1>Your trainings</h1>
        <p className="lede">Edit lifts, reps, notes, and pairing here.</p>
      </header>

      <ul className="plan-list">
        {store.programs.map((program) => (
          <li key={program.id}>
            <button
              type="button"
              className="plan-row"
              onClick={() => go({ name: "program-edit", id: program.id })}
            >
              <span className="program-accent" style={{ background: program.accent }} />
              <div>
                <p className="exercise-name">{program.name}</p>
                <p className="muted">{program.exercises.length} exercises</p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="btn-primary" onClick={addProgram}>
        Add training
      </button>

      <div className="plan-tools">
        <button type="button" className="btn-ghost" onClick={exportJson}>
          Export backup
        </button>
        <label className="btn-ghost file-label">
          Import
          <input
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => {
              void onImport(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => dispatch({ type: "set-unit", unit: store.weightUnit === "kg" ? "lb" : "kg" })}
        >
          Unit: {store.weightUnit}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => dispatch({ type: "set-rest-screen", on: store.restScreen === false })}
        >
          Rest: {store.restScreen === false ? "off" : "on"}
        </button>
        <button type="button" className="text-link" onClick={() => setConfirmReset(true)}>
          Reset plans
        </button>
      </div>      

      {confirmReset ? (
        <Confirm
          title="Reset plans?"
          body="This replaces trainings with the Test template. History is kept."
          confirmLabel="Reset"
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            const seed = createSeedStore();
            dispatch({
              type: "replace-store",
              store: { ...store, programs: seed.programs, weightUnit: seed.weightUnit },
            });
            setConfirmReset(false);
          }}
        />
      ) : null}
    </div>
  );
}
