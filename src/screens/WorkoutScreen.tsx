import { useEffect, useState } from "react";
import { Confirm } from "../components/Confirm";
import { Glyph } from "../components/Glyph";
import { RestOverlay } from "../components/RestOverlay";
import { formatElapsed, formatWeight, relativeDay } from "../logic/format";
import { go } from "../logic/routes";
import { activeProgram } from "../logic/store";
import { useNow, useWakeLock } from "../hooks";
import { useStore } from "../store-context";
import type { SetLog } from "../types";

export function WorkoutScreen() {
  const { store, dispatch } = useStore();
  const program = activeProgram(store);
  const now = useNow(true, 250);
  const [confirmFinish, setConfirmFinish] = useState(false);
  useWakeLock(true);

  useEffect(() => {
    if (!store.active) go({ name: "home" });
  }, [store.active]);

  if (!store.active || !program) {
    return null;
  }

  const remaining = store.active.restUntil ? store.active.restUntil - now : 0;

  return (
    <div className="screen workout-screen">
      <header className="session-head">
        <button type="button" className="icon-btn" onClick={() => go({ name: "home" })} aria-label="Back">
          ←
        </button>
        <div>
          <p className="eyebrow">{program.name}</p>
          <p className="session-timer">{formatElapsed(now - store.active.startedAt)}</p>
        </div>
        <button type="button" className="text-link" onClick={() => setConfirmFinish(true)}>
          Finish
        </button>
      </header>

      <ul className="exercise-list">
        {program.exercises.map((exercise) => {
          const log = store.active?.logs[exercise.id];
          const done = log?.sets.length ?? 0;
          const last = lastSets(store.sessions, exercise.id);
          const current = log?.currentWeight ?? exercise.workingWeight;
          const isActive = store.active?.activeExerciseId === exercise.id;
          return (
            <li key={exercise.id}>
              <button
                type="button"
                className={isActive ? "exercise-row current" : "exercise-row"}
                onClick={() => {
                  dispatch({ type: "select-exercise", exerciseId: exercise.id, now: Date.now() });
                  go({ name: "exercise", id: exercise.id });
                }}
              >
                <Glyph id={exercise.icon} size="md" />
                <div className="exercise-copy">
                  <p className="exercise-name">{exercise.name}</p>
                  <p className="muted">
                    {formatWeight(current, store.weightUnit)}
                    {" · "}
                    {exercise.mode === "timed"
                      ? `${exercise.targetSets} × ${exercise.targetSeconds}s`
                      : `${exercise.targetSets} × ${exercise.targetReps}`}
                  </p>
                  {last && last.length > 0 ? (
                    <p className="last-line">
                      last {relativeDay(last[0] ? lastCompletedAt(last) : 0, Date.now())}:{" "}
                      {summarize(last, store.weightUnit)}
                    </p>
                  ) : null}
                </div>
                <Dots total={exercise.targetSets} done={done} />
              </button>
            </li>
          );
        })}
      </ul>

      {remaining > 0 ? (
        <RestOverlay remainingMs={remaining} onSkip={() => dispatch({ type: "skip-rest", now: Date.now() })} />
      ) : null}

      {confirmFinish ? (
        <Confirm
          title="Finish workout?"
          body="This saves today's session to your log."
          confirmLabel="Save"
          onCancel={() => setConfirmFinish(false)}
          onConfirm={() => {
            dispatch({ type: "finish-workout", now: Date.now() });
            setConfirmFinish(false);
            go({ name: "history" });
          }}
        />
      ) : null}
    </div>
  );
}

function Dots({ total, done }: { total: number; done: number }) {
  return (
    <span className="dots" aria-label={`${done} of ${total} sets`}>
      {Array.from({ length: Math.max(total, done) }, (_, i) => (
        <i key={i} className={i < done ? "dot on" : "dot"} />
      ))}
    </span>
  );
}

function lastSets(
  sessions: { exercises: { exerciseId: string; sets: SetLog[] }[] }[],
  exerciseId: string,
): SetLog[] | undefined {
  for (const session of sessions) {
    const found = session.exercises.find((item) => item.exerciseId === exerciseId);
    if (found && found.sets.length > 0) return found.sets;
  }
  return undefined;
}

function lastCompletedAt(sets: SetLog[]): number {
  return sets[sets.length - 1]?.completedAt ?? 0;
}

function summarize(sets: SetLog[], unit: "kg" | "lb"): string {
  const first = sets[0];
  if (!first) return "";
  const reps = sets.map((set) => (set.reps > 0 ? String(set.reps) : formatElapsed(set.durationMs))).join(" ");
  return `${formatWeight(first.weight, unit)} × ${reps}`;
}
