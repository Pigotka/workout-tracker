import type {
  ActiveSession,
  CompletedSession,
  Exercise,
  ExerciseLog,
  Program,
  RepScheme,
} from "../types";

export function schemesOf(exercise: Exercise): RepScheme[] {
  if (exercise.schemes && exercise.schemes.length > 0) return exercise.schemes;
  return [
    {
      id: "default",
      label: `${exercise.targetSets}×${exercise.targetReps}`,
      sets: exercise.targetSets,
      repsMin: exercise.targetReps,
      repsMax: exercise.targetReps,
    },
  ];
}

export function schemeKey(exercise: Exercise): string {
  return exercise.schemeGroup ?? exercise.id;
}

export function schemeOf(exercise: Exercise, schemes: Record<string, string>): RepScheme {
  const list = schemesOf(exercise);
  const wanted = schemes[schemeKey(exercise)];
  const match = list.find((item) => item.id === wanted);
  const fallback = list[0];
  if (match) return match;
  if (fallback) return fallback;
  return {
    id: "default",
    label: `${exercise.targetSets}×${exercise.targetReps}`,
    sets: exercise.targetSets,
    repsMin: exercise.targetReps,
    repsMax: exercise.targetReps,
  };
}

export function setCount(scheme: RepScheme): number {
  return scheme.pyramid?.length ?? scheme.sets;
}

export function targetForSet(
  scheme: RepScheme,
  setIndex: number,
): { min: number; max: number; isMax: boolean } {
  if (scheme.isMax) return { min: 0, max: 0, isMax: true };
  const pyramid = scheme.pyramid?.[setIndex];
  if (pyramid != null) return { min: pyramid, max: pyramid, isMax: false };
  return { min: scheme.repsMin, max: scheme.repsMax, isMax: false };
}

export function pendingForSet(scheme: RepScheme, setIndex: number, lastMax?: number): number {
  const target = targetForSet(scheme, setIndex);
  if (target.isMax) return lastMax ?? 8;
  return target.max;
}

export function formatScheme(scheme: RepScheme): string {
  if (scheme.label) return scheme.label;
  if (scheme.isMax) return `${scheme.sets} × MAX`;
  if (scheme.pyramid && scheme.pyramid.length > 0) return scheme.pyramid.join(" ");
  if (scheme.repsMin === scheme.repsMax) return `${scheme.sets} × ${scheme.repsMin}`;
  return `${scheme.sets} × ${scheme.repsMin}–${scheme.repsMax}`;
}

export function formatSetTarget(scheme: RepScheme, setIndex: number): string {
  const target = targetForSet(scheme, setIndex);
  if (target.isMax) return "MAX";
  if (target.min === target.max) return `${target.max} reps`;
  return `${target.min}–${target.max} reps`;
}

export type SchemeKind = "fixed" | "range" | "pyramid" | "max";

export function schemeKindOf(scheme: RepScheme): SchemeKind {
  if (scheme.isMax) return "max";
  if (scheme.pyramid && scheme.pyramid.length > 0) return "pyramid";
  if (scheme.repsMin !== scheme.repsMax) return "range";
  return "fixed";
}

export function parsePyramid(text: string): number[] {
  return text
    .split(/[,;\s]+/)
    .map((part) => Number(part))
    .filter((n) => Number.isInteger(n) && n > 0 && n <= 99);
}

export function buildScheme(input: {
  kind: SchemeKind;
  sets: number;
  reps: number;
  repsMin: number;
  repsMax: number;
  pyramid: number[];
}): RepScheme {
  const sets = Math.max(1, Math.min(12, Math.round(input.sets) || 1));
  const reps = Math.max(1, Math.min(50, Math.round(input.reps) || 1));
  const repsMin = Math.max(1, Math.min(50, Math.round(input.repsMin) || 1));
  const repsMax = Math.max(1, Math.min(50, Math.round(input.repsMax) || 1));
  if (input.kind === "max") {
    return { id: "default", label: `${sets} × MAX`, sets, repsMin: 0, repsMax: 0, isMax: true };
  }
  if (input.kind === "pyramid") {
    const pyramid = input.pyramid.length > 0 ? input.pyramid.slice(0, 12) : [reps];
    return {
      id: "default",
      label: pyramid.join(" "),
      sets: pyramid.length,
      repsMin: pyramid[0] ?? reps,
      repsMax: pyramid[0] ?? reps,
      pyramid,
    };
  }
  if (input.kind === "range") {
    const min = Math.min(repsMin, repsMax);
    const max = Math.max(repsMin, repsMax);
    return { id: "default", label: `${sets} × ${min}–${max}`, sets, repsMin: min, repsMax: max };
  }
  return { id: "default", label: `${sets} × ${reps}`, sets, repsMin: reps, repsMax: reps };
}

export function withScheme(exercise: Exercise, scheme: RepScheme): Exercise {
  return {
    ...exercise,
    targetSets: setCount(scheme),
    targetReps: scheme.isMax ? Math.max(1, exercise.targetReps) : scheme.repsMax || scheme.repsMin || 1,
    schemes: [scheme],
  };
}

export function lastOfProgram(
  sessions: CompletedSession[],
  programId: string,
): CompletedSession | undefined {
  return sessions.find((session) => session.programId === programId);
}

export function pickChoices(
  program: Program,
  last: CompletedSession | undefined,
): Record<string, string> {
  const choices: Record<string, string> = {};
  const groups = new Map<string, Exercise[]>();
  for (const exercise of program.exercises) {
    if (!exercise.alternateGroup) continue;
    const list = groups.get(exercise.alternateGroup) ?? [];
    list.push(exercise);
    groups.set(exercise.alternateGroup, list);
  }
  for (const [group, members] of groups) {
    const first = members[0];
    if (!first) continue;
    const lastId = last?.choices?.[group];
    const lastIndex = members.findIndex((item) => item.id === lastId);
    if (lastIndex >= 0) {
      const next = members[(lastIndex + 1) % members.length];
      choices[group] = next?.id ?? first.id;
    } else {
      const used = members.find((item) =>
        last?.exercises.some((logged) => logged.exerciseId === item.id && logged.sets.length > 0),
      );
      if (!used) {
        choices[group] = first.id;
      } else {
        const idx = members.findIndex((item) => item.id === used.id);
        const next = members[(idx + 1) % members.length];
        choices[group] = next?.id ?? first.id;
      }
    }
  }
  return choices;
}

export function pickSchemes(program: Program): Record<string, string> {
  const schemes: Record<string, string> = {};
  for (const exercise of program.exercises) {
    const first = schemesOf(exercise)[0];
    if (first) schemes[schemeKey(exercise)] = first.id;
  }
  return schemes;
}

export function visibleExercises(program: Program, choices: Record<string, string>): Exercise[] {
  return program.exercises.filter((exercise) => {
    if (!exercise.alternateGroup) return true;
    return choices[exercise.alternateGroup] === exercise.id;
  });
}

export function otherAlternate(
  program: Program,
  exercise: Exercise,
): Exercise | undefined {
  if (!exercise.alternateGroup) return undefined;
  return program.exercises.find(
    (item) => item.alternateGroup === exercise.alternateGroup && item.id !== exercise.id,
  );
}

export function supersetPartner(program: Program, exercise: Exercise): Exercise | undefined {
  if (!exercise.supersetGroup) return undefined;
  return program.exercises.find(
    (item) => item.supersetGroup === exercise.supersetGroup && item.id !== exercise.id,
  );
}

export function lastMaxReps(sessions: CompletedSession[], exerciseId: string): number | undefined {
  for (const session of sessions) {
    const found = session.exercises.find((item) => item.exerciseId === exerciseId);
    if (found && found.sets.length > 0) {
      return Math.max(...found.sets.map((set) => set.reps));
    }
  }
  return undefined;
}

export function lastLoggedReps(
  log: ExerciseLog | undefined,
  sessions: CompletedSession[],
  exerciseId: string,
  schemeId?: string,
): number | undefined {
  const fromNow = [...(log?.sets ?? [])].reverse().find((set) => set.reps > 0)?.reps;
  if (fromNow != null) return fromNow;
  for (const session of sessions) {
    const found = session.exercises.find((item) => item.exerciseId === exerciseId);
    if (!found || found.sets.length === 0) continue;
    if (schemeId && found.schemeId && found.schemeId !== schemeId) continue;
    const fromLast = [...found.sets].reverse().find((set) => set.reps > 0)?.reps;
    if (fromLast != null) return fromLast;
  }
  return undefined;
}

export function pendingForExercise(
  exercise: Exercise,
  schemes: Record<string, string>,
  setIndex: number,
  lastLogged?: number,
): number {
  if (exercise.mode === "timed") return exercise.targetSeconds;
  const scheme = schemeOf(exercise, schemes);
  const target = targetForSet(scheme, setIndex);
  if (target.isMax) return lastLogged ?? 8;
  if (scheme.pyramid && scheme.pyramid.length > 0) {
    return target.max > 0 ? target.max : (lastLogged ?? 8);
  }
  if (lastLogged != null && lastLogged > 0) return lastLogged;
  return target.max;
}

export function restAfterLogging(
  program: Program,
  exercise: Exercise,
  logs: Record<string, ExerciseLog>,
  schemes: Record<string, string> = {},
  choices: Record<string, string> = {},
): { restSeconds: number; nextExerciseId: string } {
  const partner = supersetPartner(program, exercise);
  const mine = logs[exercise.id]?.sets.length ?? 0;
  if (partner) {
    const theirs = logs[partner.id]?.sets.length ?? 0;
    if (mine > theirs) {
      return { restSeconds: 0, nextExerciseId: partner.id };
    }
    if (isComplete(exercise, logs[exercise.id], schemes) && isComplete(partner, logs[partner.id], schemes)) {
      const next = nextAfterCurrent(program, exercise, choices, logs, schemes);
      return {
        restSeconds: exercise.restSeconds,
        nextExerciseId: next?.id ?? exercise.id,
      };
    }
    const first =
      program.exercises.find((item) => item.supersetGroup === exercise.supersetGroup) ?? exercise;
    return { restSeconds: exercise.restSeconds, nextExerciseId: first.id };
  }
  if (isComplete(exercise, logs[exercise.id], schemes)) {
    const next = nextAfterCurrent(program, exercise, choices, logs, schemes);
    if (next) {
      return { restSeconds: exercise.restSeconds, nextExerciseId: next.id };
    }
  }
  return { restSeconds: exercise.restSeconds, nextExerciseId: exercise.id };
}

export function isComplete(
  exercise: Exercise,
  log: ExerciseLog | undefined,
  schemes: Record<string, string>,
): boolean {
  return (log?.sets.length ?? 0) >= setCount(schemeOf(exercise, schemes));
}

export function nextAfterCurrent(
  program: Program,
  current: Exercise,
  choices: Record<string, string>,
  logs: Record<string, ExerciseLog>,
  schemes: Record<string, string>,
): Exercise | undefined {
  const visible = visibleExercises(program, choices);
  const idx = visible.findIndex((item) => item.id === current.id);
  const start = idx >= 0 ? idx + 1 : 0;
  for (let i = start; i < visible.length; i += 1) {
    const item = visible[i];
    if (item && !isComplete(item, logs[item.id], schemes)) return item;
  }
  return undefined;
}

export type Slot =
  | { kind: "single"; exercise: Exercise }
  | { kind: "alternate"; group: string; members: Exercise[]; today: Exercise }
  | { kind: "superset"; group: string; members: Exercise[] };

export function slotsFor(
  program: Program,
  choices: Record<string, string>,
): Slot[] {
  const slots: Slot[] = [];
  const seen = new Set<string>();
  for (const exercise of program.exercises) {
    if (exercise.alternateGroup) {
      const group = exercise.alternateGroup;
      if (seen.has(`a:${group}`)) continue;
      seen.add(`a:${group}`);
      const members = program.exercises.filter((item) => item.alternateGroup === group);
      const today = members.find((item) => item.id === choices[group]) ?? members[0];
      if (!today) continue;
      slots.push({ kind: "alternate", group, members, today });
      continue;
    }
    if (exercise.supersetGroup) {
      if (seen.has(`s:${exercise.supersetGroup}`)) continue;
      seen.add(`s:${exercise.supersetGroup}`);
      const members = program.exercises.filter(
        (item) => item.supersetGroup === exercise.supersetGroup,
      );
      slots.push({ kind: "superset", group: exercise.supersetGroup, members });
      continue;
    }
    slots.push({ kind: "single", exercise });
  }
  return slots;
}

export function needsSetup(program: Program): boolean {
  return program.exercises.some((exercise) => Boolean(exercise.alternateGroup));
}

export function alternateGroups(program: Program): { group: string; members: Exercise[] }[] {
  const seen = new Set<string>();
  const groups: { group: string; members: Exercise[] }[] = [];
  for (const exercise of program.exercises) {
    if (!exercise.alternateGroup || seen.has(exercise.alternateGroup)) continue;
    seen.add(exercise.alternateGroup);
    groups.push({
      group: exercise.alternateGroup,
      members: program.exercises.filter((item) => item.alternateGroup === exercise.alternateGroup),
    });
  }
  return groups;
}

export function pairWithNext(
  exercises: Exercise[],
  index: number,
  kind: "superset" | "alternate",
  groupId: string,
): Exercise[] {
  const first = exercises[index];
  const second = exercises[index + 1];
  if (!first || !second) return exercises;
  return exercises.map((exercise, i) => {
    if (i !== index && i !== index + 1) return exercise;
    const cleared: Exercise = {
      ...exercise,
      alternateGroup: undefined,
      supersetGroup: undefined,
      schemeGroup: undefined,
    };
    if (kind === "alternate") {
      return { ...cleared, alternateGroup: groupId };
    }
    return {
      ...cleared,
      supersetGroup: groupId,
      restSeconds: i === index ? 0 : Math.max(exercise.restSeconds, 45),
    };
  });
}

export function unpairExercise(exercises: Exercise[], exerciseId: string): Exercise[] {
  const target = exercises.find((item) => item.id === exerciseId);
  if (!target) return exercises;
  const group = target.alternateGroup ?? target.supersetGroup;
  if (!group) return exercises;
  return exercises.map((exercise) => {
    if (exercise.alternateGroup !== group && exercise.supersetGroup !== group) return exercise;
    return {
      ...exercise,
      alternateGroup: undefined,
      supersetGroup: undefined,
      schemeGroup: exercise.schemeGroup === group ? undefined : exercise.schemeGroup,
    };
  });
}

export function pairLabel(exercise: Exercise, program: Program): string | undefined {
  if (exercise.alternateGroup) {
    const other = otherAlternate(program, exercise);
    return other ? `Alternate with ${other.name}` : "Alternate";
  }
  if (exercise.supersetGroup) {
    const other = supersetPartner(program, exercise);
    return other ? `Superset with ${other.name}` : "Superset";
  }
  return undefined;
}

export function withSessionDefaults(active: ActiveSession): ActiveSession {
  return {
    ...active,
    choices: active.choices ?? {},
    schemes: active.schemes ?? {},
  };
}
