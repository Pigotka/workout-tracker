import { useEffect } from "react";
import { Glyph } from "../components/Glyph";
import { RestOverlay } from "../components/RestOverlay";
import { WeightChart } from "../components/WeightChart";
import { liftTint } from "../logic/catalog";
import { formatElapsed, formatRest, formatWeight } from "../logic/format";
import { liftPointsFor } from "../logic/progress";
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
  const weightPoints = liftPointsFor(store.sessions, exercise.catalogId, {
    at: Date.now(),
    sets: log.sets,
  });

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
          {complete ? `Extra set` : `Set ${setIndex + 1}/${totalSets}`}
        </span>
      </header>

      <div className="hero-block">
        <Glyph catalogId={exercise.catalogId} size="lg" color={liftTint(exercise.catalogId, exercise.color)} />
        <h1>{exercise.name}</h1>
        {partner ? <p className="slot-kicker">Supersérie → {partner.name}</p> : null}
        {nextExercise && nextExercise.id !== partner?.id ? (
          <p className="slot-kicker">Next: {nextExercise.name}</p>
        ) : null}
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
        <span>{complete ? "extra set" : formatSetTarget(scheme, setIndex)}</span>
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
          {complete
            ? `Log extra ${store.active.pendingReps} reps`
            : scheme.isMax
              ? `Log ${store.active.pendingReps} MAX`
              : `Log ${store.active.pendingReps} reps`}
        </button>
        {complete ? (
          nextExercise ? (
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
          ) : (
            <button type="button" className="btn-ghost wide" onClick={() => go({ name: "workout" })}>
              Done — back to list
            </button>
          )
        ) : null}
      </>

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
              {`${set.reps} × ${formatWeight(set.weight, store.weightUnit)}`}
            </span>
            <span className="muted">
              {set.restAfterMs != null ? `rest ${formatElapsed(set.restAfterMs)}` : formatElapsed(set.durationMs)}
            </span>
          </li>
        ))}
      </ol>

      {weightPoints.length > 0 ? (
        <section className="weight-progress in-session">
          <p className="eyebrow">Weight</p>
          <p className="muted">
            {formatWeight(weightPoints.at(-1)?.weight ?? 0, store.weightUnit)} top set
          </p>
          <WeightChart points={weightPoints} color={liftTint(exercise.catalogId, exercise.color)} />
        </section>
      ) : null}

      {store.restScreen !== false && store.active.restStartedAt != null ? (
        <RestOverlay
          elapsedMs={restElapsed}
          targetSeconds={store.active.restTargetSeconds}
          nextName={exercise.name}
          nextCatalogId={exercise.catalogId}
          nextColor={exercise.color}
          thenName={nextExercise && nextExercise.id !== exercise.id ? nextExercise.name : undefined}
          setDone={log.sets.length}
          setTotal={totalSets}
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
