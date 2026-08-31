import { createSeedStore } from "../seed";
import type { Store } from "../types";

export const STORAGE_KEY = "train:v1";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function loadStore(storage: StorageLike): Store {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createSeedStore();
    const parsed: unknown = JSON.parse(raw);
    if (!isStore(parsed)) return createSeedStore();
    return { ...parsed, restScreen: parsed.restScreen !== false };
  } catch {
    return createSeedStore();
  }
}

export function saveStore(storage: StorageLike, store: Store): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function isExercise(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.catalogId === "string"
  );
}

function isProgram(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    Array.isArray(record.exercises) &&
    record.exercises.every(isExercise)
  );
}

export function isStore(value: unknown): value is Store {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<Store>;
  return (
    record.version === 1 &&
    (record.weightUnit === "kg" || record.weightUnit === "lb") &&
    Array.isArray(record.programs) &&
    record.programs.every(isProgram) &&
    Array.isArray(record.sessions) &&
    (record.active === null ||
      (typeof record.active === "object" && record.active !== null))
  );
}

export function memoryStorage(initial?: string): StorageLike {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
  };
}
