import { describe, expect, it } from "vitest";
import { createSeedStore } from "../seed";
import { formatElapsed, formatWeight } from "./format";
import {
  buildScheme,
  needsSetup,
  parsePyramid,
  pendingForExercise,
  pickChoices,
  pickSchemes,
  pairWithNext,
  restAfterLogging,
  slotsFor,
} from "./prescription";
import { parseHash, hashFor } from "./routes";
import { currentStreak, thisWeekCount } from "./stats";
import { loadStore, memoryStorage, saveStore } from "./storage";
import { reduce } from "./store";
import type { ExerciseLog, Store } from "../types";

const t0 = Date.parse("2026-08-30T10:00:00");

function store(): Store {
  return createSeedStore();
}

describe("reduce", () => {
  it("starts Trénink 1 on dřep using that lift's own reps", () => {
    const next = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    expect(next.active?.programId).toBe("t1");
    expect(next.active?.activeExerciseId).toBe("t1-drep");
    expect(next.active?.choices["t1-quads"]).toBe("t1-drep");
    expect(next.active?.schemes["t1-drep"]).toBe("default");
    expect(next.active?.pendingReps).toBe(6);
  });

  it("logs a set and starts rest that counts up", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "log-set", now: t0 + 40_000 });
    const log = s.active?.logs["t1-drep"];
    expect(log?.sets).toHaveLength(1);
    expect(log?.sets[0]?.reps).toBe(6);
    expect(s.active?.restStartedAt).toBe(t0 + 40_000);
    expect(s.active?.restTargetSeconds).toBe(180);
  });

  it("does not rest between superset halves", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "select-exercise", exerciseId: "t1-predkop", now: t0 });
    s = reduce(s, { type: "log-set", now: t0 + 20_000 });
    expect(s.active?.restStartedAt).toBeNull();
    expect(s.active?.activeExerciseId).toBe("t1-zakop");
    s = reduce(s, { type: "log-set", now: t0 + 40_000 });
    expect(s.active?.restStartedAt).toBe(t0 + 40_000);
    expect(s.active?.restTargetSeconds).toBe(45);
    expect(s.active?.activeExerciseId).toBe("t1-predkop");
  });

  it("swaps dřep for legpress", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "swap-alternate", group: "t1-quads", now: t0 + 1 });
    expect(s.active?.choices["t1-quads"]).toBe("t1-legpress");
    expect(s.active?.activeExerciseId).toBe("t1-legpress");
  });

  it("rotates the alternate movement but keeps each lift's own reps", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    s = reduce(s, { type: "finish-workout", now: t0 + 30 * 60 * 1000 });
    s = reduce(s, {
      type: "start-workout",
      programId: "t1",
      now: t0 + 2 * 86_400_000,
      sessionId: "s2",
    });
    expect(s.active?.choices["t1-quads"]).toBe("t1-legpress");
    expect(s.active?.schemes["t1-legpress"]).toBe("default");
    expect(s.active?.pendingReps).toBe(12);
  });

  it("moves to the next lift after the last set, not an earlier unfinished one", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    for (let i = 0; i < 6; i += 1) {
      s = reduce(s, { type: "log-set", now: t0 + (i + 1) * 1000 });
      if (s.active?.restStartedAt) {
        s = reduce(s, { type: "end-rest", now: t0 + (i + 1) * 1000 + 500 });
      }
    }
    expect(s.active?.logs["t1-drep"]?.sets).toHaveLength(6);
    expect(s.active?.activeExerciseId).toBe("t1-predkop");
    expect(s.active?.pendingReps).toBe(10);
  });

  it("follows pyramid reps set by set", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
      choices: { "t1-quads": "t1-drep", "t1-pull": "t1-pritahy" },
    });
    s = reduce(s, { type: "select-exercise", exerciseId: "t1-pritahy", now: t0 });
    expect(s.active?.pendingReps).toBe(10);
    s = reduce(s, { type: "log-set", now: t0 + 1 });
    s = reduce(s, { type: "end-rest", now: t0 + 2 });
    s = reduce(s, { type: "log-set", now: t0 + 3 });
    s = reduce(s, { type: "end-rest", now: t0 + 4 });
    s = reduce(s, { type: "log-set", now: t0 + 5 });
    s = reduce(s, { type: "end-rest", now: t0 + 6 });
    expect(s.active?.logs["t1-pritahy"]?.sets).toHaveLength(3);
    expect(s.active?.pendingReps).toBe(8);
  });

  it("keeps last logged reps for the next set", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "set-pending-reps", reps: 4 });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    expect(s.active?.logs["t1-drep"]?.sets[0]?.reps).toBe(4);
    expect(s.active?.pendingReps).toBe(4);
    s = reduce(s, { type: "end-rest", now: t0 + 20_000 });
    s = reduce(s, { type: "select-exercise", exerciseId: "t1-drep", now: t0 + 21_000 });
    expect(s.active?.pendingReps).toBe(4);
  });

  it("writes logged weight onto the plan for next time", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "set-weight", weight: 80 });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    expect(s.active?.logs["t1-drep"]?.currentWeight).toBe(80);
    expect(s.programs[0]?.exercises[0]?.workingWeight).toBe(80);
    s = reduce(s, { type: "finish-workout", now: t0 + 30 * 60 * 1000 });
    s = reduce(s, {
      type: "start-workout",
      programId: "t1",
      now: t0 + 2 * 86_400_000,
      sessionId: "s2",
      choices: { "t1-quads": "t1-drep", "t1-pull": "t1-shyby" },
      schemes: { "t1-quads": "A" },
    });
    expect(s.active?.logs["t1-drep"]?.currentWeight).toBe(80);
  });

  it("records rest duration when rest is stopped", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    s = reduce(s, { type: "end-rest", now: t0 + 91_000 });
    expect(s.active?.restStartedAt).toBeNull();
    expect(s.active?.logs["t1-drep"]?.sets[0]?.restAfterMs).toBe(90_000);
  });

  it("discards an in-progress workout", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    s = reduce(s, { type: "discard-workout" });
    expect(s.active).toBeNull();
    expect(s.sessions).toHaveLength(0);
  });

  it("pairs neighboring exercises as a superset or alternate", () => {
    let s = reduce(store(), {
      type: "pair-with-next",
      programId: "t1",
      exerciseId: "t1-incline",
      kind: "alternate",
      groupId: "g-alt",
    });
    const incline = s.programs[0]?.exercises.find((item) => item.id === "t1-incline");
    const military = s.programs[0]?.exercises.find((item) => item.id === "t1-military");
    expect(incline?.alternateGroup).toBe("g-alt");
    expect(military?.alternateGroup).toBe("g-alt");
    s = reduce(s, { type: "unpair", programId: "t1", exerciseId: "t1-incline" });
    expect(s.programs[0]?.exercises.find((item) => item.id === "t1-incline")?.alternateGroup).toBeUndefined();
    s = reduce(s, {
      type: "pair-with-next",
      programId: "t1",
      exerciseId: "t1-incline",
      kind: "superset",
      groupId: "g-ss",
    });
    expect(s.programs[0]?.exercises.find((item) => item.id === "t1-incline")?.supersetGroup).toBe("g-ss");
    expect(s.programs[0]?.exercises.find((item) => item.id === "t1-military")?.supersetGroup).toBe("g-ss");
  });

  it("persists notes onto the program exercise", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "set-note", exerciseId: "t1-drep", note: "hlouběji" });
    expect(s.programs[0]?.exercises[0]?.note).toBe("hlouběji");
  });

  it("switches the icon style", () => {
    const next = reduce(store(), { type: "set-icon-style", style: "effort" });
    expect(next.iconStyle).toBe("effort");
  });

  it("finishes a workout into history", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    s = reduce(s, { type: "finish-workout", now: t0 + 30 * 60 * 1000 });
    expect(s.active).toBeNull();
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0]?.programName).toBe("Trénink 1");
    expect(s.sessions[0]?.exercises[0]?.sets).toHaveLength(1);
    expect(s.sessions[0]?.choices?.["t1-quads"]).toBe("t1-drep");
  });

  it("undoes the last set", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    s = reduce(s, { type: "undo-set", now: t0 + 2000 });
    expect(s.active?.logs["t1-drep"]?.sets).toHaveLength(0);
    expect(s.active?.restStartedAt).toBeNull();
  });
});

describe("prescription", () => {
  it("builds slots for the day without duplicating alternates", () => {
    const program = createSeedStore().programs[0];
    if (!program) throw new Error("missing program");
    const slots = slotsFor(program, { "t1-quads": "t1-drep", "t1-pull": "t1-shyby" });
    expect(slots.map((slot) => slot.kind)).toEqual([
      "alternate",
      "superset",
      "alternate",
      "single",
      "single",
      "superset",
      "single",
    ]);
  });

  it("rotates alternate choices but not a shared rozpis", () => {
    const program = createSeedStore().programs[0];
    if (!program) throw new Error("missing program");
    const last = {
      id: "x",
      programId: "t1",
      programName: "Trénink 1",
      startedAt: t0,
      completedAt: t0,
      choices: { "t1-quads": "t1-drep", "t1-pull": "t1-shyby" },
      schemes: { "t1-drep": "default" },
      exercises: [],
    };
    expect(pickChoices(program, last)["t1-quads"]).toBe("t1-legpress");
    expect(pickSchemes(program)["t1-drep"]).toBe("default");
    expect(pickSchemes(program)["t1-legpress"]).toBe("default");
    expect(pickChoices(program, undefined)["t1-quads"]).toBe("t1-drep");
  });

  it("only needs a Today screen when the plan has alternates", () => {
    const program = createSeedStore().programs[0];
    if (!program) throw new Error("missing program");
    expect(needsSetup(program)).toBe(true);
    expect(needsSetup({ ...program, exercises: program.exercises.filter((item) => !item.alternateGroup) })).toBe(
      false,
    );
  });

  it("parses pyramid reps and builds a scheme from them", () => {
    expect(parsePyramid("10, 10, 10, 8, 8, 8, 6, 4")).toEqual([10, 10, 10, 8, 8, 8, 6, 4]);
    expect(parsePyramid("10 8 6 4")).toEqual([10, 8, 6, 4]);
    const scheme = buildScheme({
      kind: "pyramid",
      sets: 3,
      reps: 8,
      repsMin: 8,
      repsMax: 8,
      pyramid: [10, 8, 6, 4],
    });
    expect(scheme.pyramid).toEqual([10, 8, 6, 4]);
    expect(scheme.sets).toBe(4);
  });

  it("uses the planned pyramid number when last logged would otherwise stick", () => {
    const exercise = createSeedStore().programs[0]?.exercises.find((item) => item.id === "t1-pritahy");
    if (!exercise) throw new Error("missing pyramid lift");
    expect(pendingForExercise(exercise, {}, 3, 10)).toBe(8);
    expect(pendingForExercise(exercise, {}, 0)).toBe(10);
  });

  it("rests only after both superset lifts", () => {
    const program = createSeedStore().programs[0];
    if (!program) throw new Error("missing program");
    const predkop = program.exercises.find((item) => item.id === "t1-predkop");
    const zakop = program.exercises.find((item) => item.id === "t1-zakop");
    if (!predkop || !zakop) throw new Error("missing superset");
    const empty: ExerciseLog = { exerciseId: "t1-predkop", currentWeight: 0, sets: [] };
    const afterFirst = restAfterLogging(program, predkop, {
      "t1-predkop": {
        ...empty,
        sets: [{ reps: 10, weight: 0, durationMs: 1, completedAt: t0 }],
      },
      "t1-zakop": { exerciseId: "t1-zakop", currentWeight: 0, sets: [] },
    });
    expect(afterFirst.nextExerciseId).toBe("t1-zakop");
    expect(afterFirst.restSeconds).toBe(0);
    const afterPair = restAfterLogging(program, zakop, {
      "t1-predkop": {
        ...empty,
        sets: [{ reps: 10, weight: 0, durationMs: 1, completedAt: t0 }],
      },
      "t1-zakop": {
        exerciseId: "t1-zakop",
        currentWeight: 0,
        sets: [{ reps: 10, weight: 0, durationMs: 1, completedAt: t0 }],
      },
    });
    expect(afterPair.restSeconds).toBe(45);
    expect(afterPair.nextExerciseId).toBe("t1-predkop");
  });

  it("pairs the next lift as a superset", () => {
    const program = createSeedStore().programs[0];
    if (!program) throw new Error("missing program");
    const next = pairWithNext(program.exercises, 6, "superset", "g1");
    expect(next[6]?.supersetGroup).toBe("g1");
    expect(next[7]?.supersetGroup).toBe("g1");
  });
});

describe("storage", () => {
  it("round-trips a store and survives reload", () => {
    const mem = memoryStorage();
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s9",
    });
    s = reduce(s, { type: "log-set", now: t0 + 5000 });
    saveStore(mem, s);
    const loaded = loadStore(mem);
    expect(loaded.active?.id).toBe("s9");
    expect(loaded.active?.logs["t1-drep"]?.sets).toHaveLength(1);
  });

  it("falls back to seed when empty or corrupt", () => {
    expect(loadStore(memoryStorage()).programs).toHaveLength(1);
    expect(loadStore(memoryStorage("{not json")).programs[0]?.id).toBe("t1");
  });

  it("replaces the old Push/Pull/Legs seed", () => {
    const mem = memoryStorage(
      JSON.stringify({
        version: 1,
        weightUnit: "kg",
        programs: [
          { id: "push", name: "Push", accent: "#fff", exercises: [] },
          { id: "pull", name: "Pull", accent: "#fff", exercises: [] },
          { id: "legs", name: "Legs", accent: "#fff", exercises: [] },
        ],
        sessions: [],
        active: null,
      }),
    );
    expect(loadStore(mem).programs[0]?.id).toBe("t1");
  });
});

describe("format", () => {
  it("formats timers and bodyweight", () => {
    expect(formatElapsed(65_000)).toBe("1:05");
    expect(formatWeight(0, "kg")).toBe("BW");
    expect(formatWeight(62.5, "kg")).toBe("62.5 kg");
  });
});

describe("routes", () => {
  it("parses and serializes hashes", () => {
    expect(parseHash("#/workout/exercise/t1-drep")).toEqual({
      name: "exercise",
      id: "t1-drep",
    });
    expect(parseHash("#/setup/t1")).toEqual({ name: "setup", id: "t1" });
    expect(hashFor({ name: "setup", id: "t1" })).toBe("#/setup/t1");
    expect(hashFor({ name: "programs" })).toBe("#/programs");
  });
});

describe("stats", () => {
  it("counts this week and streak", () => {
    const sessions = [
      {
        id: "a",
        programId: "t1",
        programName: "Trénink 1",
        startedAt: Date.parse("2026-08-30T09:00:00"),
        completedAt: Date.parse("2026-08-30T10:00:00"),
        exercises: [],
      },
      {
        id: "b",
        programId: "t1",
        programName: "Trénink 1",
        startedAt: Date.parse("2026-08-29T09:00:00"),
        completedAt: Date.parse("2026-08-29T10:00:00"),
        exercises: [],
      },
    ];
    expect(thisWeekCount(sessions, t0)).toBe(2);
    expect(currentStreak(sessions, t0)).toBe(2);
  });
});
