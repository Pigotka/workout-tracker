import { useEffect, useState } from "react";
import { Confirm } from "../components/Confirm";
import { Glyph } from "../components/Glyph";
import { formatRest } from "../logic/format";
import { go } from "../logic/routes";
import { ICON_IDS } from "../types";
import { useStore } from "../store-context";
import type { Exercise } from "../types";

const RESTS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240];
const ACCENTS = ["#d6ff3e", "#ff7a3d", "#5ad0ff", "#ff8fab", "#e8d36a", "#c9a6ff"];

export function ProgramEditScreen({ id }: { id: string }) {
  const { store, dispatch } = useStore();
  const program = store.programs.find((item) => item.id === id);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!program) go({ name: "programs" });
  }, [program]);

  if (!program) {
    return null;
  }

  const save = (patch: Partial<typeof program>) => {
    dispatch({ type: "upsert-program", program: { ...program, ...patch } });
  };

  const addExercise = () => {
    const exercise: Exercise = {
      id: crypto.randomUUID(),
      name: "New exercise",
      icon: "default",
      mode: "reps",
      targetSets: 3,
      targetReps: 8,
      targetSeconds: 45,
      restSeconds: 90,
      workingWeight: 0,
      note: "",
    };
    dispatch({ type: "add-exercise", programId: program.id, exercise });
    setOpenId(exercise.id);
  };

  return (
    <div className="screen">
      <header className="session-head">
        <button type="button" className="icon-btn" onClick={() => go({ name: "programs" })} aria-label="Back">
          ←
        </button>
        <h1 className="inline-title">Edit</h1>
        <button type="button" className="text-link danger" onClick={() => setConfirmDelete(true)}>
          Delete
        </button>
      </header>

      <label className="note-field">
        <span>Name</span>
        <input value={program.name} onChange={(event) => save({ name: event.target.value })} />
      </label>

      <div className="accent-row">
        {ACCENTS.map((color) => (
          <button
            key={color}
            type="button"
            className={program.accent === color ? "swatch on" : "swatch"}
            style={{ background: color }}
            onClick={() => save({ accent: color })}
            aria-label={`Color ${color}`}
          />
        ))}
      </div>

      <ul className="edit-ex-list">
        {program.exercises.map((exercise, index) => (
          <li key={exercise.id} className="edit-ex">
            <button type="button" className="edit-ex-head" onClick={() => setOpenId(openId === exercise.id ? null : exercise.id)}>
              <Glyph id={exercise.icon} size="sm" />
              <span>{exercise.name}</span>
              <span className="muted">
                {exercise.targetSets}×{exercise.mode === "timed" ? `${exercise.targetSeconds}s` : exercise.targetReps}
              </span>
            </button>
            {openId === exercise.id ? (
              <ExerciseEditor
                exercise={exercise}
                canUp={index > 0}
                canDown={index < program.exercises.length - 1}
                onChange={(next) =>
                  dispatch({ type: "update-exercise", programId: program.id, exercise: next })
                }
                onMove={(direction) =>
                  dispatch({ type: "move-exercise", programId: program.id, exerciseId: exercise.id, direction })
                }
                onDelete={() =>
                  dispatch({ type: "delete-exercise", programId: program.id, exerciseId: exercise.id })
                }
              />
            ) : null}
          </li>
        ))}
      </ul>

      <button type="button" className="btn-primary" onClick={addExercise}>
        Add exercise
      </button>

      {confirmDelete ? (
        <Confirm
          title={`Delete ${program.name}?`}
          body="Past sessions stay in the log. This only removes the plan."
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            dispatch({ type: "delete-program", programId: program.id });
            go({ name: "programs" });
          }}
        />
      ) : null}
    </div>
  );
}

function ExerciseEditor({
  exercise,
  canUp,
  canDown,
  onChange,
  onMove,
  onDelete,
}: {
  exercise: Exercise;
  canUp: boolean;
  canDown: boolean;
  onChange: (exercise: Exercise) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}) {
  return (
    <div className="ex-editor">
      <label className="note-field">
        <span>Name</span>
        <input value={exercise.name} onChange={(event) => onChange({ ...exercise, name: event.target.value })} />
      </label>
      <p className="eyebrow">Icon</p>
      <div className="icon-grid">
        {ICON_IDS.map((icon) => (
          <button
            key={icon}
            type="button"
            className={exercise.icon === icon ? "icon-pick on" : "icon-pick"}
            onClick={() => onChange({ ...exercise, icon })}
            aria-label={icon}
          >
            <Glyph id={icon} size="sm" />
          </button>
        ))}
      </div>
      <div className="edit-grid">
        <label>
          Sets
          <input
            type="number"
            min={1}
            max={12}
            value={exercise.targetSets}
            onChange={(event) => onChange({ ...exercise, targetSets: Number(event.target.value) || 1 })}
          />
        </label>
        {exercise.mode === "timed" ? (
          <label>
            Seconds
            <input
              type="number"
              min={5}
              max={600}
              value={exercise.targetSeconds}
              onChange={(event) =>
                onChange({ ...exercise, targetSeconds: Number(event.target.value) || 5 })
              }
            />
          </label>
        ) : (
          <label>
            Reps
            <input
              type="number"
              min={1}
              max={50}
              value={exercise.targetReps}
              onChange={(event) => onChange({ ...exercise, targetReps: Number(event.target.value) || 1 })}
            />
          </label>
        )}
        <label>
          Weight
          <input
            type="number"
            min={0}
            step={0.5}
            value={exercise.workingWeight}
            onChange={(event) =>
              onChange({ ...exercise, workingWeight: Number(event.target.value) || 0 })
            }
          />
        </label>
      </div>
      <label className="note-field">
        <span>Mode</span>
        <select
          value={exercise.mode}
          onChange={(event) =>
            onChange({ ...exercise, mode: event.target.value === "timed" ? "timed" : "reps" })
          }
        >
          <option value="reps">Reps</option>
          <option value="timed">Timed hold</option>
        </select>
      </label>
      <p className="eyebrow">Rest {formatRest(exercise.restSeconds)}</p>
      <div className="chip-row">
        {RESTS.map((rest) => (
          <button
            key={rest}
            type="button"
            className={exercise.restSeconds === rest ? "chip on" : "chip"}
            onClick={() => onChange({ ...exercise, restSeconds: rest })}
          >
            {formatRest(rest)}
          </button>
        ))}
      </div>
      <label className="note-field">
        <span>Cue</span>
        <input
          value={exercise.note}
          placeholder="This week…"
          onChange={(event) => onChange({ ...exercise, note: event.target.value })}
        />
      </label>
      <div className="editor-actions">
        <button type="button" className="btn-ghost" disabled={!canUp} onClick={() => onMove("up")}>
          Up
        </button>
        <button type="button" className="btn-ghost" disabled={!canDown} onClick={() => onMove("down")}>
          Down
        </button>
        <button type="button" className="text-link danger" onClick={onDelete}>
          Remove
        </button>
      </div>
    </div>
  );
}
