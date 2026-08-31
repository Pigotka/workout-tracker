import { useEffect } from "react";
import { Glyph } from "../components/Glyph";
import { RestOverlay } from "../components/RestOverlay";
import { formatElapsed, formatRest, formatWeight } from "../logic/format";
import {
  formatSetTarget,
  nextAfterCurrent,
  schemeOf,
  setCount,
  supersetPartner,
} from "../logic/prescription";
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
      go({ name: "exercise", id: store.active.activeExerciseId });
    }
  }, [exerciseId, program, store.active]);

  if (!store.active || !program) {
    return null;
  }

  const exercise = activeExercise(store) ?? program.exercises.find((item) => item.id === exerciseId);
  const log = exercise ? store.active.logs[exercise.id] : undefined;
  if (!exercise || !log) {
    return null;
  }

  const restElapsed =
    store.active.restStartedAt != null ? now - store.active.restStartedAt : 0;
  const step = weightStep(store.weightUnit);
  const scheme = schemeOf(exercise, store.active.schemes);
  const totalSets = setCount(scheme);
  const setIndex = log.sets.length;
  const workMs = store.active.workStartedAt != null ? now - store.active.workStartedAt : 0;
  const partner = supersetPartner(program, exercise);
  const complete = setIndex >= totalSets;
  const nextExercise = nextAfterCurrent(
    program,
    exercise,
    store.active.choices,
    store.active.logs,
    store.active.schemes,
  );

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
          Set {Math.min(setIndex + 1, totalSets)}/{totalSets}
        </span>
      </header>

      <div className="hero-block">
        <Glyph catalogId={exercise.catalogId} size="lg" />
        <h1>{exercise.name}</h1>
        {partner ? <p className="slot-kicker">Supersérie → {partner.name}</p> : null}
        {exercise.note ? <p className="session-note">{exercise.note}</p> : null}
      </div>

      <div className="weight-grid single">
        <WeightRow
          label="Weight"
          value={log.currentWeight}
          unit={store.weightUnit}
          step={step}
          onAdjust={(delta) => dispatch({ type: "adjust-weight", delta })}
        />
      </div>

      <div className="set-meta">
        <span>{exercise.mode === "timed" ? `${exercise.targetSeconds}s hold` : formatSetTarget(scheme, setIndex)}</span>
        <span>
          {partner && (store.active.logs[partner.id]?.sets.length ?? 0) < log.sets.length + 1
            ? "then partner"
            : formatRest(exercise.restSeconds)}
        </span>
      </div>

      <div className="dots-lg">
        {Array.from({ length: Math.max(totalSets, log.sets.length) }, (_, i) => (
          <i key={i} className={i < log.sets.length ? "dot on" : i === log.sets.length ? "dot now" : "dot"} />
        ))}
      </div>

      {complete ? (
        nextExercise ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              dispatch({ type: "select-exercise", exerciseId: nextExercise.id, now: Date.now() });
              go({ name: "exercise", id: nextExercise.id });
            }}
          >
            Next: {nextExercise.name}
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => go({ name: "workout" })}>
            All sets done — back to list
          </button>
        )
      ) : exercise.mode === "timed" ? (
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
            {scheme.isMax ? `Log ${store.active.pendingReps} MAX` : `Log ${store.active.pendingReps} reps`}
          </button>
        </>
      )}

      {log.sets.length > 0 ? (
        <button type="button" className="text-link center" onClick={() => dispatch({ type: "undo-set", now: Date.now() })}>
          Undo last set
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
            <span className="muted">
              {set.restAfterMs != null ? `rest ${formatElapsed(set.restAfterMs)}` : formatElapsed(set.durationMs)}
            </span>
          </li>
        ))}
      </ol>

      {store.active.restStartedAt != null ? (
        <RestOverlay
          elapsedMs={restElapsed}
          targetSeconds={store.active.restTargetSeconds}
          onStop={() => dispatch({ type: "end-rest", now: Date.now() })}
        />
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
        <button type="button" className="step-btn" onClick={() => onAdjust(-step)}>
          −
        </button>
        <p>{formatWeight(value, unit)}</p>
        <button type="button" className="step-btn" onClick={() => onAdjust(step)}>
          +
        </button>
      </div>
    </div>
  );
}
