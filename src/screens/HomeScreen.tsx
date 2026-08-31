import { useState } from "react";
import { Glyph } from "../components/Glyph";
import { Confirm } from "../components/Confirm";
import { formatElapsed, relativeDay } from "../logic/format";
import { go } from "../logic/routes";
import { pickChoices, visibleExercises, needsSetup } from "../logic/prescription";
import { liftTint } from "../logic/catalog";
import { useNow } from "../hooks";
import { useStore } from "../store-context";

export function HomeScreen() {
  const { store, dispatch } = useStore();
  const now = useNow(Boolean(store.active), 500);
  const [pendingProgramId, setPendingProgramId] = useState<string | null>(null);

  const start = (programId: string) => {
    const program = store.programs.find((item) => item.id === programId);
    if (program && needsSetup(program)) {
      go({ name: "setup", id: programId });
      return;
    }
    dispatch({
      type: "start-workout",
      programId,
      now: Date.now(),
      sessionId: crypto.randomUUID(),
    });
    go({ name: "workout" });
  };

  const onPick = (programId: string) => {
    if (store.active && store.active.programId !== programId) {
      setPendingProgramId(programId);
      return;
    }
    if (store.active && store.active.programId === programId) {
      go({ name: "workout" });
      return;
    }
    start(programId);
  };

  return (
    <div className="screen">
      <header className="page-head">
        <h1>What are you lifting?</h1>
      </header>

      {store.active ? (
        <button type="button" className="resume-card" onClick={() => go({ name: "workout" })}>
          <div>
            <p className="resume-title">
              {store.programs.find((p) => p.id === store.active?.programId)?.name ?? "Workout"}
            </p>
          </div>
          <span className="timer-chip">{formatElapsed(now - store.active.startedAt)}</span>
        </button>
      ) : null}

      <ul className="program-list">
        {store.programs.map((program) => {
          const last = store.sessions.find((session) => session.programId === program.id);
          const today = visibleExercises(program, pickChoices(program, last));
          return (
            <li key={program.id}>
              <button type="button" className="program-card" onClick={() => onPick(program.id)}>
                <span className="program-accent" style={{ background: program.accent }} />
                <div className="program-body">
                  <div className="program-top">
                    <h2>{program.name}</h2>
                    <span className="muted">
                      {last ? relativeDay(last.startedAt, Date.now()) : "new"}
                    </span>
                  </div>
                  <div className="glyph-row">
                    {today.slice(0, 6).map((exercise) => (
                      <Glyph key={exercise.id} catalogId={exercise.catalogId} size="sm" color={liftTint(exercise.catalogId, exercise.color)} />
                    ))}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {store.programs.length === 0 ? (
        <p className="empty">
          No trainings yet. Add one in{" "}
          <button type="button" className="text-link" onClick={() => go({ name: "programs" })}>
            Plans
          </button>
          .
        </p>
      ) : null}

      {pendingProgramId ? (
        <Confirm
          title="Replace current workout?"
          body="You already have a session in progress. Starting another one discards it."
          confirmLabel="Start new"
          danger
          onCancel={() => setPendingProgramId(null)}
          onConfirm={() => {
            const id = pendingProgramId;
            setPendingProgramId(null);
            if (!id) return;
            dispatch({ type: "discard-workout" });
            start(id);
          }}
        />
      ) : null}
    </div>
  );
}
