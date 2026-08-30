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
  lastLoggedReps,
  lastOfProgram,
  otherAlternate,
  pairWithNext,
  pendingForExercise,
  pickChoices,
  pickSchemes,
  restAfterLogging,
  schemeOf,
  unpairExercise,
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
  sessions: Store["sessions"],
  choiceOverride?: Record<string, string>,
  schemeOverride?: Record<string, string>,
): ActiveSession {
  const choices = choiceOverride ?? pickChoices(program, last);
  const schemes = schemeOverride ?? pickSchemes(program);
  const visible = visibleExercises(program, choices);
  const first = visible[0] ?? program.exercises[0];
  if (!first) {
    throw new Error("Program has no exercises");
  }
  const logs: Record<string, ExerciseLog> = {};
  for (const exercise of program.exercises) {
    logs[exercise.id] = emptyLog(exercise);
  }
  const scheme = schemeOf(first, schemes);
  return {
    id: sessionId,
    programId: program.id,
    startedAt: now,
    activeExerciseId: first.id,
    restStartedAt: null,
    restTargetSeconds: 0,
    setStartedAt: now,
    workStartedAt: null,
    pendingReps: pendingForExercise(
      first,
      schemes,
      0,
      lastLoggedReps(undefined, sessions, first.id, scheme.id),
    ),
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
        active: startSession(
          program,
          action.now,
          action.sessionId,
          last,
          state.sessions,
          action.choices,
          action.schemes,
        ),
      };
    }
    case "select-exercise": {
      if (!state.active) return state;
      const program = programById(state, state.active.programId);
      const exercise = program ? exerciseById(program, action.exerciseId) : undefined;
      if (!exercise) return state;
      if (state.active.activeExerciseId === exercise.id) {
        return patchActive(state, { setStartedAt: action.now, workStartedAt: null });
      }
      const log = state.active.logs[exercise.id];
      const scheme = schemeOf(exercise, state.active.schemes);
      return patchActive(state, {
        activeExerciseId: exercise.id,
        pendingReps: pendingForExercise(
          exercise,
          state.active.schemes,
          log?.sets.length ?? 0,
          lastLoggedReps(log, state.sessions, exercise.id, scheme.id),
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
      const scheme = schemeOf(other, state.active.schemes);
      return patchActive(state, {
        choices: { ...state.active.choices, [action.group]: other.id },
        activeExerciseId: other.id,
        pendingReps: pendingForExercise(
          other,
          state.active.schemes,
          log?.sets.length ?? 0,
          lastLoggedReps(log, state.sessions, other.id, scheme.id),
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
      const scheme = schemeOf(exercise, schemes);
      return patchActive(state, {
        schemes,
        pendingReps: pendingForExercise(
          exercise,
          schemes,
          log?.sets.length ?? 0,
          lastLoggedReps(log, state.sessions, exercise.id, scheme.id),
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
      const after = restAfterLogging(
        program,
        exercise,
        nextLogs,
        state.active.schemes,
        state.active.choices,
      );
      const nextExercise = exerciseById(program, after.nextExerciseId) ?? exercise;
      const nextLog = nextLogs[nextExercise.id];
      const nextScheme = schemeOf(nextExercise, state.active.schemes);
      const restStartedAt = after.restSeconds > 0 ? action.now : null;
      let nextState = patchActive(state, {
        logs: nextLogs,
        activeExerciseId: nextExercise.id,
        restStartedAt,
        restTargetSeconds: after.restSeconds,
        setStartedAt: restStartedAt ?? action.now,
        workStartedAt: null,
        pendingReps: pendingForExercise(
          nextExercise,
          state.active.schemes,
          nextLog?.sets.length ?? 0,
          lastLoggedReps(nextLog, state.sessions, nextExercise.id, nextScheme.id),
        ),
      });
      nextState = patchProgramExercise(nextState, program.id, exercise.id, {
        workingWeight: log.currentWeight,
      });
      return nextState;
    }
    case "undo-set": {
      if (!state.active) return state;
      const id = state.active.activeExerciseId;
      const log = state.active.logs[id];
      if (!log || log.sets.length === 0) return state;
      return patchActive(patchLog(state, id, { sets: log.sets.slice(0, -1) }), {
        restStartedAt: null,
        restTargetSeconds: 0,
        setStartedAt: action.now,
        workStartedAt: null,
      });
    }
    case "end-rest": {
      if (!state.active?.restStartedAt) return state;
      const restMs = Math.max(0, action.now - state.active.restStartedAt);
      let latest: { exerciseId: string; index: number; at: number } | undefined;
      for (const [exerciseId, log] of Object.entries(state.active.logs)) {
        log.sets.forEach((set, index) => {
          if (!latest || set.completedAt > latest.at) {
            latest = { exerciseId, index, at: set.completedAt };
          }
        });
      }
      let next: Store = patchActive(state, {
        restStartedAt: null,
        restTargetSeconds: 0,
        setStartedAt: action.now,
      });
      if (latest) {
        const target = latest;
        const log = next.active?.logs[target.exerciseId];
        if (log) {
          const sets = log.sets.map((set, index) =>
            index === target.index ? { ...set, restAfterMs: restMs } : set,
          );
          next = patchLog(next, target.exerciseId, { sets });
        }
      }
      return next;
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
    case "pair-with-next":
      return {
        ...state,
        programs: state.programs.map((program) => {
          if (program.id !== action.programId) return program;
          const index = program.exercises.findIndex((exercise) => exercise.id === action.exerciseId);
          if (index < 0) return program;
          return {
            ...program,
            exercises: pairWithNext(program.exercises, index, action.kind, action.groupId),
          };
        }),
      };
    case "unpair":
      return {
        ...state,
        programs: state.programs.map((program) => {
          if (program.id !== action.programId) return program;
          return { ...program, exercises: unpairExercise(program.exercises, action.exerciseId) };
        }),
      };
    case "set-unit":
      return { ...state, weightUnit: action.unit };
    case "set-icon-style":
      return { ...state, iconStyle: action.style };
    case "replace-store":
      return action.store;
    default:
      return assertNever(action);
  }
}

export function createInitialStore(): Store {
  return createSeedStore();
}
