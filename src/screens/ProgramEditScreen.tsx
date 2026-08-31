import { useEffect, useRef, useState } from "react";
import { Confirm } from "../components/Confirm";
import { Glyph } from "../components/Glyph";
import { PickerSheet } from "../components/PickerSheet";
import { FALLBACK_ID, CATALOG, BODY_PARTS, BODY_SWATCHES, bodyColor, bodyLabel, liftTint, searchCatalog, type CatalogEntry } from "../logic/catalog";
import { formatRest } from "../logic/format";
import {
  buildScheme,
  formatScheme,
  pairLabel,
  parsePyramid,
  schemeKindOf,
  schemesOf,
  withScheme,
} from "../logic/prescription";
import type { SchemeKind } from "../logic/prescription";
import { go } from "../logic/routes";
import { useStore } from "../store-context";
import type { Exercise, Program, RepScheme } from "../types";

const RESTS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240];

function hexEq(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="picker-btn" aria-label="Color" onClick={() => setOpen(true)}>
        <span className="swatch" style={{ background: value }} />
        <span>Color</span>
      </button>
      {open ? (
        <PickerSheet title="Color" onClose={() => setOpen(false)}>
          <div className="accent-row">
            {BODY_SWATCHES.map((item) => (
              <button
                key={item.part}
                type="button"
                className={hexEq(value, item.color) ? "swatch on" : "swatch"}
                style={{ background: item.color }}
                aria-label={item.label}
                aria-pressed={hexEq(value, item.color)}
                onClick={() => {
                  onChange(item.color);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </PickerSheet>
      ) : null}
    </>
  );
}

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
      catalogId: FALLBACK_ID,
      targetSets: 3,
      targetReps: 8,
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

      <ColorPicker value={program.accent} onChange={(color) => save({ accent: color })} />

      <ul className="edit-ex-list">
        {program.exercises.map((exercise, index) => {
          const pairing = pairLabel(exercise, program);
          return (
            <li key={exercise.id} className="edit-ex">
              <button
                type="button"
                className="edit-ex-head"
                onClick={() => setOpenId(openId === exercise.id ? null : exercise.id)}
              >
                <Glyph catalogId={exercise.catalogId} size="sm" color={liftTint(exercise.catalogId, exercise.color)} />
                <span>
                  {exercise.name}
                  {pairing ? <span className="pair-badge">{pairing}</span> : null}
                </span>
                <span className="muted">
                  {formatScheme(schemesOf(exercise)[0] ?? fallbackScheme(exercise))}
                </span>
              </button>
              {openId === exercise.id ? (
                <ExerciseEditor
                  program={program}
                  exercise={exercise}
                  index={index}
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
                  onPair={(kind) =>
                    dispatch({
                      type: "pair-with-next",
                      programId: program.id,
                      exerciseId: exercise.id,
                      kind,
                      groupId: crypto.randomUUID(),
                    })
                  }
                  onUnpair={() => dispatch({ type: "unpair", programId: program.id, exerciseId: exercise.id })}
                />
              ) : null}
            </li>
          );
        })}
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
  program,
  exercise,
  index,
  canUp,
  canDown,
  onChange,
  onMove,
  onDelete,
  onPair,
  onUnpair,
}: {
  program: Program;
  exercise: Exercise;
  index: number;
  canUp: boolean;
  canDown: boolean;
  onChange: (exercise: Exercise) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
  onPair: (kind: "superset" | "alternate") => void;
  onUnpair: () => void;
}) {
  const next = program.exercises[index + 1];
  const pairing = pairLabel(exercise, program);
  const nameRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [part, setPart] = useState("");
  const tint = liftTint(exercise.catalogId, exercise.color);

  const pickEntry = (entry: CatalogEntry) => {
    const untitled = exercise.name === "" || exercise.name === "New exercise";
    onChange({
      ...exercise,
      catalogId: entry.id,
      name: untitled ? entry.name : exercise.name,
      color: undefined,
    });
    setPickerOpen(false);
  };

  return (
    <div className="ex-editor">
      <label className="note-field">
        <span>Name</span>
        <input
          ref={nameRef}
          value={exercise.name}
          onChange={(event) => onChange({ ...exercise, name: event.target.value })}
        />
      </label>
      <div className="picker-row">
        <button
          type="button"
          className="picker-btn"
          onClick={() => {
            setQuery("");
            setPart("");
            setPickerOpen(true);
          }}
          aria-label="Choose picture"
        >
          <Glyph catalogId={exercise.catalogId} size="sm" color={tint} />
          <span>Picture</span>
        </button>
        <ColorPicker value={tint} onChange={(color) => onChange({ ...exercise, color })} />
      </div>
      {pickerOpen ? (
        <PickerSheet title="Choose picture" onClose={() => setPickerOpen(false)}>
          <button
            type="button"
            className="catalog-row"
            onClick={() => {
              setPickerOpen(false);
              queueMicrotask(() => nameRef.current?.focus());
            }}
          >
            <Glyph catalogId={exercise.catalogId} size="sm" color={tint} />
            <span>Custom</span>
          </button>
          <div className="chip-row">
            <button
              type="button"
              className={part === "" ? "chip on" : "chip"}
              onClick={() => setPart("")}
            >
              All
            </button>
            {BODY_PARTS.map((id) => (
              <button
                key={id}
                type="button"
                className={part === id ? "chip on" : "chip"}
                style={{ boxShadow: `inset 0 0 0 2px ${bodyColor(id)}` }}
                onClick={() => setPart(id)}
              >
                {bodyLabel(id)}
              </button>
            ))}
          </div>
          <label className="note-field catalog-search">
            <span>Search</span>
            <input
              type="search"
              value={query}
              placeholder="English name"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <ul className="catalog-list">
            {searchCatalog(query, CATALOG, part)
              .slice(0, query.trim() || part ? 80 : 40)
              .map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={exercise.catalogId === entry.id ? "catalog-row on" : "catalog-row"}
                    onClick={() => pickEntry(entry)}
                  >
                    <Glyph catalogId={entry.id} size="sm" color={liftTint(entry.id)} />
                    <span>{entry.name}</span>
                  </button>
                </li>
              ))}
          </ul>
        </PickerSheet>
      ) : null}
      <div className="edit-grid">
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
      <SchemeEditor exercise={exercise} onChange={onChange} />
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
      <p className="eyebrow">Pairing</p>
      {pairing ? (
        <div className="pair-banner">
          <p>{pairing}</p>
          <button type="button" className="text-link" onClick={onUnpair}>
            Unpair
          </button>
        </div>
      ) : next ? (
        <div className="pair-actions">
          <button type="button" className="btn-ghost" onClick={() => onPair("superset")}>
            Superset with {next.name}
          </button>
          <button type="button" className="btn-ghost" onClick={() => onPair("alternate")}>
            Alternate with {next.name}
          </button>
        </div>
      ) : (
        <p className="muted">Add another exercise below, then pair them here.</p>
      )}
      <label className="note-field">
        <span>Note</span>
        <input
          value={exercise.note}
          placeholder="Pause, tempo, band…"
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

const SCHEME_KINDS: { id: SchemeKind; label: string }[] = [
  { id: "fixed", label: "Fixed" },
  { id: "range", label: "Range" },
  { id: "pyramid", label: "Pyramid" },
  { id: "max", label: "MAX" },
];

function fallbackScheme(exercise: Exercise): RepScheme {
  return schemesOf(exercise)[0] ?? buildScheme({
    kind: "fixed",
    sets: exercise.targetSets,
    reps: exercise.targetReps,
    repsMin: exercise.targetReps,
    repsMax: exercise.targetReps,
    pyramid: [],
  });
}

function patchScheme(
  exercise: Exercise,
  patch: Partial<{
    kind: SchemeKind;
    sets: number;
    reps: number;
    repsMin: number;
    repsMax: number;
    pyramid: number[];
  }>,
): Exercise {
  const current = fallbackScheme(exercise);
  const kind = patch.kind ?? schemeKindOf(current);
  return withScheme(
    exercise,
    buildScheme({
      kind,
      sets: patch.sets ?? current.sets,
      reps: patch.reps ?? (current.repsMax || current.repsMin || exercise.targetReps),
      repsMin: patch.repsMin ?? current.repsMin,
      repsMax: patch.repsMax ?? current.repsMax,
      pyramid: patch.pyramid ?? current.pyramid ?? [],
    }),
  );
}

function SchemeEditor({
  exercise,
  onChange,
}: {
  exercise: Exercise;
  onChange: (exercise: Exercise) => void;
}) {
  const current = fallbackScheme(exercise);
  const kind = schemeKindOf(current);
  const [pyramidText, setPyramidText] = useState((current.pyramid ?? []).join(" "));

  return (
    <div className="scheme-editor">
      <p className="eyebrow">Reps {formatScheme(current)}</p>
      <div className="chip-row">
        {SCHEME_KINDS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={kind === item.id ? "chip on" : "chip"}
            onClick={() => {
              const next = patchScheme(exercise, { kind: item.id });
              setPyramidText((schemesOf(next)[0]?.pyramid ?? []).join(" "));
              onChange(next);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {kind === "pyramid" ? (
        <label className="note-field">
          <span>Pyramid reps</span>
          <input
            value={pyramidText}
            placeholder="10 10 10 8 8 8 6 4"
            onChange={(event) => {
              const text = event.target.value;
              setPyramidText(text);
              const parsed = parsePyramid(text);
              if (parsed.length > 0) onChange(patchScheme(exercise, { kind: "pyramid", pyramid: parsed }));
            }}
          />
          <span className="muted">One number per set, spaces or commas. Example: 10 8 6 4</span>
        </label>
      ) : (
        <div className="edit-grid">
          <label>
            Sets
            <input
              type="number"
              min={1}
              max={12}
              value={current.sets}
              onChange={(event) =>
                onChange(patchScheme(exercise, { sets: Number(event.target.value) || 1 }))
              }
            />
          </label>
          {kind === "fixed" ? (
            <label>
              Reps
              <input
                type="number"
                min={1}
                max={50}
                value={current.repsMax}
                onChange={(event) =>
                  onChange(patchScheme(exercise, { reps: Number(event.target.value) || 1 }))
                }
              />
            </label>
          ) : null}
          {kind === "range" ? (
            <>
              <label>
                Min
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={current.repsMin}
                  onChange={(event) =>
                    onChange(patchScheme(exercise, { repsMin: Number(event.target.value) || 1 }))
                  }
                />
              </label>
              <label>
                Max
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={current.repsMax}
                  onChange={(event) =>
                    onChange(patchScheme(exercise, { repsMax: Number(event.target.value) || 1 }))
                  }
                />
              </label>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
