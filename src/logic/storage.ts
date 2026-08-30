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
    return parsed;
  } catch {
    return createSeedStore();
  }
}

export function saveStore(storage: StorageLike, store: Store): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function isStore(value: unknown): value is Store {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<Store>;
  return (
    record.version === 1 &&
    (record.weightUnit === "kg" || record.weightUnit === "lb") &&
    Array.isArray(record.programs) &&
    Array.isArray(record.sessions)
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
