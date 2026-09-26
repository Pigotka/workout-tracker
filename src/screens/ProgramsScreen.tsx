import { useState } from "react";
import { Confirm } from "../components/Confirm";
import { storeFromJson, type SyncStatus } from "../logic/sync";
import { go } from "../logic/routes";
import { createSeedStore } from "../seed";
import { useStore } from "../store-context";
import type { CloudControls } from "../use-cloud-sync";
import type { Program } from "../types";
import { assertNever } from "../logic/util";

export function ProgramsScreen() {
  const { store, dispatch, cloud } = useStore();
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
      const next = storeFromJson(parsed);
      if (!next) return;
      dispatch({ type: "replace-store", store: next });
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

      <section className="sync-card" aria-live="polite">
        <p className="eyebrow">Google Drive</p>
        <p className={cloud.status.state === "error" ? "sync-error" : "muted"}>{syncLabel(cloud)}</p>
        {cloud.signedIn ? (
          <button type="button" className="btn-ghost" onClick={cloud.signOut}>
            Sign out{cloud.email ? ` (${cloud.email})` : ""}
          </button>
        ) : (
          <button
            type="button"
            className="btn-ghost"
            onClick={cloud.signIn}
            disabled={!cloud.configured || cloud.status.state === "syncing"}
          >
            Sign in with Google
          </button>
        )}
      </section>

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

      {cloud.pendingSwitch ? (
        <Confirm
          title="Switch Google account?"
          body={`This phone already has workouts on it. Switching to ${cloud.pendingSwitch.email} loads that account's Drive backup. The workouts on screen stay on this phone for the previous account.`}
          confirmLabel="Switch account"
          danger
          onCancel={cloud.cancelSwitch}
          onConfirm={cloud.confirmSwitch}
        />
      ) : null}

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

function syncLabel(cloud: CloudControls): string {
  if (!cloud.configured) return "Set VITE_GOOGLE_CLIENT_ID to enable Drive backup.";
  return statusLabel(cloud.status, cloud.signedIn);
}

function statusLabel(status: SyncStatus, signedIn: boolean): string {
  switch (status.state) {
    case "idle":
      return signedIn ? "Signed in" : "Not signed in";
    case "syncing":
      return "Syncing…";
    case "synced":
      return `Last synced ${new Date(status.at).toLocaleString()}`;
    case "error":
      return status.message;
    default:
      return assertNever(status);
  }
}
