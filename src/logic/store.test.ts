import { describe, expect, it } from "vitest";
import { createSeedStore } from "../seed";
import { formatElapsed, formatWeight } from "./format";
import {
  pickChoices,
  pickSchemes,
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
  it("starts Trénink 1 on dřep with rozpis A", () => {
    const next = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    expect(next.active?.programId).toBe("t1");
    expect(next.active?.activeExerciseId).toBe("t1-drep");
    expect(next.active?.choices["t1-quads"]).toBe("t1-drep");
    expect(next.active?.schemes["t1-quads"]).toBe("A");
    expect(next.active?.pendingReps).toBe(6);
  });

  it("logs a set and starts rest", () => {
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
    expect(s.active?.restUntil).toBe(t0 + 40_000 + 180_000);
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
    expect(s.active?.restUntil).toBeNull();
    expect(s.active?.activeExerciseId).toBe("t1-zakop");
    s = reduce(s, { type: "log-set", now: t0 + 40_000 });
    expect(s.active?.restUntil).toBe(t0 + 40_000 + 45_000);
    expect(s.active?.activeExerciseId).toBe("t1-zakop");
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

  it("rotates movement and A/B on the next session", () => {
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
    expect(s.active?.schemes["t1-quads"]).toBe("B");
    expect(s.active?.pendingReps).toBe(12);
  });

  it("keeps next weight on the program immediately", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "t1",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "set-next-weight", weight: 80 });
    const drep = s.programs[0]?.exercises[0];
    expect(drep?.workingWeight).toBe(80);
    expect(s.active?.logs["t1-drep"]?.currentWeight).toBe(0);
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
    expect(s.active?.restUntil).toBeNull();
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

  it("rotates choices and schemes from the last session", () => {
    const program = createSeedStore().programs[0];
    if (!program) throw new Error("missing program");
    const last = {
      id: "x",
      programId: "t1",
      programName: "Trénink 1",
      startedAt: t0,
      completedAt: t0,
      choices: { "t1-quads": "t1-drep", "t1-pull": "t1-shyby" },
      schemes: { "t1-quads": "A" },
      exercises: [],
    };
    expect(pickChoices(program, last)["t1-quads"]).toBe("t1-legpress");
    expect(pickSchemes(program, last)["t1-quads"]).toBe("B");
    expect(pickChoices(program, undefined)["t1-quads"]).toBe("t1-drep");
    expect(pickSchemes(program, undefined)["t1-quads"]).toBe("A");
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
