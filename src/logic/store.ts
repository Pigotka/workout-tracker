import { createSeedStore } from "../seed";
import type {
  Action,
  ActiveSession,
  Exercise,
  ExerciseLog,
  Program,
  Store,
} from "../types";
import {
  lastMaxReps,
  lastOfProgram,
  otherAlternate,
  pendingForExercise,
  pickChoices,
  pickSchemes,
  restAfterLogging,
  visibleExercises,
} from "./prescription";
import { assertNever, clamp, roundWeight } from "./util";

export function programById(store: Store, id: string): Program | undefined {
  return store.programs.find((p) => p.id === id);
}

export function exerciseById(program: Program, id: string): Exercise | undefined {
  return program.exercises.find((e) => e.id === id);
}

export function activeProgram(store: Store): Program | undefined {
  if (!store.active) return undefined;
  return programById(store, store.active.programId);
}

export function activeExercise(store: Store): Exercise | undefined {
  const program = activeProgram(store);
  if (!program || !store.active) return undefined;
  return exerciseById(program, store.active.activeExerciseId);
}

export function weightStep(unit: Store["weightUnit"]): number {
  return unit === "kg" ? 2.5 : 5;
}

function emptyLog(exercise: Exercise): ExerciseLog {
  return {
    exerciseId: exercise.id,
    currentWeight: exercise.workingWeight,
    sets: [],
  };
}

function startSession(
  program: Program,
  now: number,
  sessionId: string,
  last: ReturnType<typeof lastOfProgram>,
  lastMax: (exerciseId: string) => number | undefined,
): ActiveSession {
  const choices = pickChoices(program, last);
  const schemes = pickSchemes(program, last);
  const visible = visibleExercises(program, choices);
  const first = visible[0] ?? program.exercises[0];
  if (!first) {
    throw new Error("Program has no exercises");
  }
  const logs: Record<string, ExerciseLog> = {};
  for (const exercise of program.exercises) {
    logs[exercise.id] = emptyLog(exercise);
  }
  return {
    id: sessionId,
    programId: program.id,
    startedAt: now,
    activeExerciseId: first.id,
    restUntil: null,
    setStartedAt: now,
    workStartedAt: null,
    pendingReps: pendingForExercise(first, schemes, 0, lastMax(first.id)),
    logs,
    choices,
    schemes,
  };
}

function patchActive(store: Store, patch: Partial<ActiveSession>): Store {
  if (!store.active) return store;
  return { ...store, active: { ...store.active, ...patch } };
}

function patchLog(store: Store, exerciseId: string, patch: Partial<ExerciseLog>): Store {
  if (!store.active) return store;
  const current = store.active.logs[exerciseId];
  if (!current) return store;
  return patchActive(store, {
    logs: { ...store.active.logs, [exerciseId]: { ...current, ...patch } },
  });
}

function patchProgramExercise(
  store: Store,
  programId: string,
  exerciseId: string,
  patch: Partial<Exercise>,
): Store {
  return {
    ...store,
    programs: store.programs.map((program) => {
      if (program.id !== programId) return program;
      return {
        ...program,
        exercises: program.exercises.map((exercise) =>
          exercise.id === exerciseId ? { ...exercise, ...patch } : exercise,
        ),
      };
    }),
  };
}

export function reduce(state: Store, action: Action): Store {
  switch (action.type) {
    case "start-workout": {
      const program = programById(state, action.programId);
      if (!program || program.exercises.length === 0) return state;
      const last = lastOfProgram(state.sessions, program.id);
      return {
        ...state,
        active: startSession(program, action.now, action.sessionId, last, (id) =>
          lastMaxReps(state.sessions, id),
        ),
      };
    }
    case "select-exercise": {
      if (!state.active) return state;
      const program = programById(state, state.active.programId);
      const exercise = program ? exerciseById(program, action.exerciseId) : undefined;
      if (!exercise) return state;
      const log = state.active.logs[exercise.id];
      return patchActive(state, {
        activeExerciseId: exercise.id,
        pendingReps: pendingForExercise(
          exercise,
          state.active.schemes,
          log?.sets.length ?? 0,
          lastMaxReps(state.sessions, exercise.id),
        ),
        setStartedAt: action.now,
        workStartedAt: null,
      });
    }
    case "swap-alternate": {
      if (!state.active) return state;
      const program = programById(state, state.active.programId);
      if (!program) return state;
      const currentId = state.active.choices[action.group];
      const current = currentId ? exerciseById(program, currentId) : undefined;
      const other = current
        ? otherAlternate(program, current)
        : program.exercises.find((item) => item.alternateGroup === action.group);
      if (!other) return state;
      const log = state.active.logs[other.id];
      return patchActive(state, {
        choices: { ...state.active.choices, [action.group]: other.id },
        activeExerciseId: other.id,
        pendingReps: pendingForExercise(
          other,
          state.active.schemes,
          log?.sets.length ?? 0,
          lastMaxReps(state.sessions, other.id),
        ),
        setStartedAt: action.now,
        workStartedAt: null,
      });
    }
    case "flip-scheme": {
      if (!state.active) return state;
      const program = programById(state, state.active.programId);
      if (!program) return state;
      const sample = program.exercises.find(
        (item) => (item.schemeGroup ?? item.id) === action.group,
      );
      if (!sample) return state;
      const list = sample.schemes ?? [];
      if (list.length < 2) return state;
      const current = state.active.schemes[action.group] ?? list[0]?.id;
      const idx = list.findIndex((item) => item.id === current);
      const next = list[(idx + 1) % list.length];
      if (!next) return state;
      const exercise = activeExercise({ ...state, active: state.active }) ?? sample;
      const log = state.active.logs[exercise.id];
      const schemes = { ...state.active.schemes, [action.group]: next.id };
      return patchActive(state, {
        schemes,
        pendingReps: pendingForExercise(
          exercise,
          schemes,
          log?.sets.length ?? 0,
          lastMaxReps(state.sessions, exercise.id),
        ),
      });
    }
    case "adjust-pending-reps": {
      if (!state.active) return state;
      return patchActive(state, {
        pendingReps: clamp(state.active.pendingReps + action.delta, 0, 99),
      });
    }
    case "set-pending-reps": {
      if (!state.active) return state;
      return patchActive(state, { pendingReps: clamp(action.reps, 0, 99) });
    }
    case "log-set": {
      if (!state.active) return state;
      const program = programById(state, state.active.programId);
      const exercise = program
        ? exerciseById(program, state.active.activeExerciseId)
        : undefined;
      const log = state.active.logs[state.active.activeExerciseId];
      if (!program || !exercise || !log) return state;
      const durationMs =
        state.active.workStartedAt != null
          ? Math.max(0, action.now - state.active.workStartedAt)
          : Math.max(0, action.now - state.active.setStartedAt);
      const nextLogs = {
        ...state.active.logs,
        [exercise.id]: {
          ...log,
          sets: [
            ...log.sets,
            {
              reps: exercise.mode === "timed" ? 0 : state.active.pendingReps,
              weight: log.currentWeight,
              durationMs,
              completedAt: action.now,
            },
          ],
        },
      };
      const after = restAfterLogging(program, exercise, nextLogs);
      const nextExercise = exerciseById(program, after.nextExerciseId) ?? exercise;
      const nextLog = nextLogs[nextExercise.id];
      const restUntil =
        after.restSeconds > 0 ? action.now + after.restSeconds * 1000 : null;
      return patchActive(state, {
        logs: nextLogs,
        activeExerciseId: nextExercise.id,
        restUntil,
        setStartedAt: restUntil ?? action.now,
        workStartedAt: null,
        pendingReps: pendingForExercise(
          nextExercise,
          state.active.schemes,
          nextLog?.sets.length ?? 0,
          lastMaxReps(state.sessions, nextExercise.id),
        ),
      });
    }
    case "undo-set": {
      if (!state.active) return state;
      const id = state.active.activeExerciseId;
      const log = state.active.logs[id];
      if (!log || log.sets.length === 0) return state;
      return patchActive(patchLog(state, id, { sets: log.sets.slice(0, -1) }), {
        restUntil: null,
        setStartedAt: action.now,
        workStartedAt: null,
      });
    }
    case "skip-rest": {
      if (!state.active) return state;
      return patchActive(state, { restUntil: null, setStartedAt: action.now });
    }
    case "adjust-weight": {
      if (!state.active) return state;
      const log = state.active.logs[state.active.activeExerciseId];
      if (!log) return state;
      return patchLog(state, log.exerciseId, {
        currentWeight: roundWeight(Math.max(0, log.currentWeight + action.delta)),
      });
    }
    case "set-weight": {
      if (!state.active) return state;
      return patchLog(state, state.active.activeExerciseId, {
        currentWeight: roundWeight(Math.max(0, action.weight)),
      });
    }
    case "set-next-weight": {
      if (!state.active) return state;
      return patchProgramExercise(
        state,
        state.active.programId,
        state.active.activeExerciseId,
        { workingWeight: roundWeight(Math.max(0, action.weight)) },
      );
    }
    case "set-note": {
      const programId = state.active?.programId;
      const match = state.programs.find((program) =>
        program.exercises.some((exercise) => exercise.id === action.exerciseId),
      );
      const targetProgramId = programId ?? match?.id;
      if (!targetProgramId) return state;
      return patchProgramExercise(state, targetProgramId, action.exerciseId, {
        note: action.note,
      });
    }
    case "start-work": {
      if (!state.active) return state;
      return patchActive(state, { workStartedAt: action.now });
    }
    case "stop-work": {
      if (!state.active) return state;
      return patchActive(state, { workStartedAt: null });
    }
    case "finish-workout": {
      if (!state.active) return state;
      const program = programById(state, state.active.programId);
      if (!program) return { ...state, active: null };
      const completed = {
        id: state.active.id,
        programId: program.id,
        programName: program.name,
        startedAt: state.active.startedAt,
        completedAt: action.now,
        choices: state.active.choices,
        schemes: state.active.schemes,
        exercises: program.exercises
          .map((exercise) => {
            const log = state.active?.logs[exercise.id];
            if (!log || log.sets.length === 0) return null;
            return {
              exerciseId: exercise.id,
              name: exercise.name,
              icon: exercise.icon,
              note: exercise.note,
              schemeId: state.active?.schemes[exercise.schemeGroup ?? exercise.id],
              sets: log.sets,
            };
          })
          .filter((entry) => entry !== null),
      };
      return {
        ...state,
        active: null,
        sessions: [completed, ...state.sessions],
      };
    }
    case "discard-workout":
      return { ...state, active: null };
    case "upsert-program": {
      const exists = state.programs.some((program) => program.id === action.program.id);
      return {
        ...state,
        programs: exists
          ? state.programs.map((program) =>
              program.id === action.program.id ? action.program : program,
            )
          : [...state.programs, action.program],
      };
    }
    case "delete-program":
      return {
        ...state,
        programs: state.programs.filter((program) => program.id !== action.programId),
      };
    case "add-exercise":
      return {
        ...state,
        programs: state.programs.map((program) =>
          program.id === action.programId
            ? { ...program, exercises: [...program.exercises, action.exercise] }
            : program,
        ),
      };
    case "update-exercise":
      return {
        ...state,
        programs: state.programs.map((program) => {
          if (program.id !== action.programId) return program;
          return {
            ...program,
            exercises: program.exercises.map((exercise) =>
              exercise.id === action.exercise.id ? action.exercise : exercise,
            ),
          };
        }),
      };
    case "delete-exercise":
      return {
        ...state,
        programs: state.programs.map((program) => {
          if (program.id !== action.programId) return program;
          return {
            ...program,
            exercises: program.exercises.filter((exercise) => exercise.id !== action.exerciseId),
          };
        }),
      };
    case "move-exercise":
      return {
        ...state,
        programs: state.programs.map((program) => {
          if (program.id !== action.programId) return program;
          const index = program.exercises.findIndex((exercise) => exercise.id === action.exerciseId);
          if (index < 0) return program;
          const swapWith = action.direction === "up" ? index - 1 : index + 1;
          if (swapWith < 0 || swapWith >= program.exercises.length) return program;
          const next = [...program.exercises];
          const current = next[index];
          const other = next[swapWith];
          if (!current || !other) return program;
          next[index] = other;
          next[swapWith] = current;
          return { ...program, exercises: next };
        }),
      };
    case "set-unit":
      return { ...state, weightUnit: action.unit };
    case "replace-store":
      return action.store;
    default:
      return assertNever(action);
  }
}

export function createInitialStore(): Store {
  return createSeedStore();
}
