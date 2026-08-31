import { useEffect, useState } from "react";
import { HeartRateChip } from "../components/HeartRateChip";
import { Glyph } from "../components/Glyph";
import { RestOverlay } from "../components/RestOverlay";
import { liftTint } from "../logic/catalog";
import { formatElapsed, formatWeight } from "../logic/format";
import {
  formatScheme,
  nextAfterCurrent,
  schemeOf,
  setCount,
  slotsFor,
} from "../logic/prescription";
import { go } from "../logic/routes";
import { activeExercise, activeProgram } from "../logic/store";
import { useNow, useWakeLock } from "../hooks";
import { useStore } from "../store-context";
import type { Exercise } from "../types";
import { assertNever } from "../logic/util";

export function WorkoutScreen() {
  const { store, dispatch } = useStore();
  const program = activeProgram(store);
  const now = useNow(true, 250);
  const [confirmFinish, setConfirmFinish] = useState(false);
  useWakeLock(true);

  useEffect(() => {
    if (!store.active && window.location.hash.includes("workout")) go({ name: "home" });
  }, [store.active]);

  if (!store.active || !program) {
    return null;
  }

  const restElapsed =
    store.active.restStartedAt != null ? now - store.active.restStartedAt : 0;
  const slots = slotsFor(program, store.active.choices);
  const current = activeExercise(store);
  const thenLift = current
    ? nextAfterCurrent(
        program,
        current,
        store.active.choices,
        store.active.logs,
        store.active.schemes,
      )
    : undefined;

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
        <div className="session-head-end">
          <HeartRateChip />
          <button type="button" className="text-link" onClick={() => setConfirmFinish(true)}>
            Finish
          </button>
        </div>
      </header>

      <ul className="exercise-list">
        {slots.map((slot) => {
          switch (slot.kind) {
            case "single":
              return (
                <li key={slot.exercise.id}>
                  <ExerciseRow exercise={slot.exercise} />
                </li>
              );
            case "alternate":
              return (
                <li key={slot.group}>
                  <ExerciseRow exercise={slot.today} />
                </li>
              );
            case "superset":
              return (
                <li key={slot.group}>
                  <p className="slot-kicker">Supersérie</p>
                  {slot.members.map((exercise) => (
                    <ExerciseRow key={exercise.id} exercise={exercise} nested />
                  ))}
                </li>
              );
            default:
              return assertNever(slot);
          }
        })}
      </ul>

      {store.restScreen !== false && store.active.restStartedAt != null && current ? (
        <RestOverlay
          elapsedMs={restElapsed}
          targetSeconds={store.active.restTargetSeconds}
          nextName={current.name}
          nextCatalogId={current.catalogId}
          nextColor={current.color}
          thenName={thenLift && thenLift.id !== current.id ? thenLift.name : undefined}
          setDone={store.active.logs[current.id]?.sets.length ?? 0}
          setTotal={setCount(schemeOf(current, store.active.schemes))}
          onStop={() => dispatch({ type: "end-rest", now: Date.now() })}
        />
      ) : null}

      {confirmFinish ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>End workout?</h2>
            <p>Save keeps it in your log. Discard throws this session away.</p>
            <div className="modal-actions stack">
              <button type="button" className="btn-primary" onClick={() => {
                dispatch({ type: "finish-workout", now: Date.now() });
                setConfirmFinish(false);
                go({ name: "history" });
              }}>
                Save
              </button>
              <button type="button" className="btn-danger" onClick={() => {
                dispatch({ type: "discard-workout" });
                setConfirmFinish(false);
                go({ name: "home" });
              }}>
                Discard
              </button>
              <button type="button" className="btn-ghost" onClick={() => setConfirmFinish(false)}>
                Keep going
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExerciseRow({
  exercise,
  nested,
}: {
  exercise: Exercise;
  nested?: boolean;
}) {
  const { store, dispatch } = useStore();
  if (!store.active) return null;
  const log = store.active.logs[exercise.id];
  const scheme = schemeOf(exercise, store.active.schemes);
  const done = log?.sets.length ?? 0;
  const current = log?.currentWeight ?? exercise.workingWeight;
  const isActive = store.active.activeExerciseId === exercise.id;
  const open = () => {
    dispatch({ type: "select-exercise", exerciseId: exercise.id, now: Date.now() });
    go({ name: "exercise", id: exercise.id });
  };

  return (
    <div className={nested ? "nested-row" : undefined}>
      <button type="button" className={isActive ? "exercise-row current" : "exercise-row"} onClick={open}>
        <Glyph catalogId={exercise.catalogId} size="md" color={liftTint(exercise.catalogId, exercise.color)} />
        <div className="exercise-copy">
          <p className="exercise-name">{exercise.name}</p>
          <p className="muted">
            {formatWeight(current, store.weightUnit)}
            {" × "}
            {formatScheme(scheme)}
          </p>
        </div>
        <Dots total={setCount(scheme)} done={done} />
      </button>
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

