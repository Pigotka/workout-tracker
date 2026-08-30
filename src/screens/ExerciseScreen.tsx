import { useEffect } from "react";
import { Glyph } from "../components/Glyph";
import { RestOverlay } from "../components/RestOverlay";
import { formatElapsed, formatRest, formatWeight } from "../logic/format";
import { go } from "../logic/routes";
import { activeExercise, activeProgram, weightStep } from "../logic/store";
import { useNow, useWakeLock } from "../hooks";
import { useStore } from "../store-context";

export function ExerciseScreen({ exerciseId }: { exerciseId: string }) {
  const { store, dispatch } = useStore();
  const program = activeProgram(store);
  const now = useNow(true, 200);
  useWakeLock(true);

  useEffect(() => {
    if (!store.active) {
      go({ name: "home" });
      return;
    }
    const exists = program?.exercises.some((item) => item.id === exerciseId);
    if (!exists) {
      go({ name: "workout" });
      return;
    }
    if (store.active.activeExerciseId !== exerciseId) {
      dispatch({ type: "select-exercise", exerciseId, now: Date.now() });
    }
  }, [dispatch, exerciseId, program, store.active]);

  if (!store.active || !program) {
    return null;
  }

  const exercise = activeExercise(store) ?? program.exercises.find((item) => item.id === exerciseId);
  const log = exercise ? store.active.logs[exercise.id] : undefined;
  if (!exercise || !log) {
    return null;
  }

  const remaining = store.active.restUntil ? store.active.restUntil - now : 0;
  const step = weightStep(store.weightUnit);
  const setIndex = log.sets.length + 1;
  const workMs =
    store.active.workStartedAt != null ? now - store.active.workStartedAt : 0;
  const nextExercise = program.exercises.find((item) => {
    const itemLog = store.active?.logs[item.id];
    return itemLog && itemLog.sets.length < item.targetSets && item.id !== exercise.id;
  });

  const logSet = () => dispatch({ type: "log-set", now: Date.now() });

  return (
    <div className="screen exercise-screen">
      <header className="session-head">
        <button type="button" className="icon-btn" onClick={() => go({ name: "workout" })} aria-label="Exercises">
          ←
        </button>
        <div>
          <p className="eyebrow">{program.name}</p>
          <p className="session-timer">{formatElapsed(now - store.active.startedAt)}</p>
        </div>
        <span className="set-chip">
          {Math.min(setIndex, exercise.targetSets)}/{exercise.targetSets}
        </span>
      </header>

      <div className="hero-block">
        <Glyph id={exercise.icon} size="lg" />
        <h1>{exercise.name}</h1>
      </div>

      <label className="note-field">
        <span>Cue</span>
        <input
          value={exercise.note}
          placeholder="This week: pause, tempo, band…"
          onChange={(event) =>
            dispatch({ type: "set-note", exerciseId: exercise.id, note: event.target.value })
          }
        />
      </label>

      <div className="weight-grid">
        <WeightRow
          label="Today"
          value={log.currentWeight}
          unit={store.weightUnit}
          step={step}
          onAdjust={(delta) => dispatch({ type: "adjust-weight", delta })}
        />
        <WeightRow
          label="Next time"
          value={exercise.workingWeight}
          unit={store.weightUnit}
          step={step}
          onAdjust={(delta) =>
            dispatch({ type: "set-next-weight", weight: exercise.workingWeight + delta })
          }
        />
      </div>

      <div className="set-meta">
        <span>
          {exercise.mode === "timed"
            ? `${exercise.targetSeconds}s hold`
            : `${exercise.targetReps} reps`}
        </span>
        <span>{formatRest(exercise.restSeconds)}</span>
      </div>

      <div className="dots-lg">
        {Array.from({ length: Math.max(exercise.targetSets, log.sets.length) }, (_, i) => (
          <i key={i} className={i < log.sets.length ? "dot on" : i === log.sets.length ? "dot now" : "dot"} />
        ))}
      </div>

      {exercise.mode === "timed" ? (
        <div className="timed-block">
          <p className="pending-num">{formatElapsed(workMs || exercise.targetSeconds * 1000)}</p>
          {store.active.workStartedAt == null ? (
            <button
              type="button"
              className="btn-ghost wide"
              onClick={() => dispatch({ type: "start-work", now: Date.now() })}
            >
              Start timer
            </button>
          ) : (
            <button type="button" className="btn-ghost wide" onClick={() => dispatch({ type: "stop-work" })}>
              Stop
            </button>
          )}
          <button type="button" className="btn-primary" onClick={logSet}>
            Log {formatElapsed(workMs || exercise.targetSeconds * 1000)}
          </button>
        </div>
      ) : (
        <>
          <div className="rep-row">
            <button
              type="button"
              className="step-btn"
              onClick={() => dispatch({ type: "adjust-pending-reps", delta: -1 })}
            >
              −
            </button>
            <p className="pending-num">{store.active.pendingReps}</p>
            <button
              type="button"
              className="step-btn"
              onClick={() => dispatch({ type: "adjust-pending-reps", delta: 1 })}
            >
              +
            </button>
          </div>
          <button type="button" className="btn-primary" onClick={logSet}>
            Log {store.active.pendingReps} reps
          </button>
        </>
      )}

      {log.sets.length > 0 ? (
        <button type="button" className="text-link center" onClick={() => dispatch({ type: "undo-set", now: Date.now() })}>
          Undo last set
        </button>
      ) : null}

      {log.sets.length >= exercise.targetSets && nextExercise ? (
        <button
          type="button"
          className="btn-ghost wide"
          onClick={() => {
            dispatch({ type: "select-exercise", exerciseId: nextExercise.id, now: Date.now() });
            go({ name: "exercise", id: nextExercise.id });
          }}
        >
          Next: {nextExercise.name}
        </button>
      ) : null}

      {log.sets.length >= exercise.targetSets && !nextExercise ? (
        <button
          type="button"
          className="btn-ghost wide"
          onClick={() => go({ name: "workout" })}
        >
          All sets done — back to list
        </button>
      ) : null}

      <ol className="set-log">
        {log.sets.map((set, index) => (
          <li key={`${set.completedAt}-${index}`}>
            <span>Set {index + 1}</span>
            <span>
              {exercise.mode === "timed"
                ? formatElapsed(set.durationMs)
                : `${set.reps} × ${formatWeight(set.weight, store.weightUnit)}`}
            </span>
            <span className="muted">{formatElapsed(set.durationMs)}</span>
          </li>
        ))}
      </ol>

      {remaining > 0 ? (
        <RestOverlay remainingMs={remaining} onSkip={() => dispatch({ type: "skip-rest", now: Date.now() })} />
      ) : null}
    </div>
  );
}

function WeightRow({
  label,
  value,
  unit,
  step,
  onAdjust,
}: {
  label: string;
  value: number;
  unit: "kg" | "lb";
  step: number;
  onAdjust: (delta: number) => void;
}) {
  return (
    <div className="weight-row">
      <p className="eyebrow">{label}</p>
      <div className="weight-ctrl">
        <button type="button" className="step-btn sm" onClick={() => onAdjust(-step)}>
          −
        </button>
        <p>{formatWeight(value, unit)}</p>
        <button type="button" className="step-btn sm" onClick={() => onAdjust(step)}>
          +
        </button>
      </div>
    </div>
  );
}
