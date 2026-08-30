import { createSeedStore } from "../seed";
import type { Store } from "../types";

export const STORAGE_KEY = "train:v1";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

const DEFAULT_PPL = new Set(["push", "pull", "legs"]);

export function loadStore(storage: StorageLike): Store {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createSeedStore();
    const parsed: unknown = JSON.parse(raw);
    if (!isStore(parsed)) return createSeedStore();
    return migrate(parsed);
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
    (record.version === 1 || record.version === 2) &&
    (record.weightUnit === "kg" || record.weightUnit === "lb") &&
    Array.isArray(record.programs) &&
    Array.isArray(record.sessions)
  );
}

function migrate(store: Store): Store {
  let next = store;
  if (store.version !== 2) {
    const ids = store.programs.map((program) => program.id);
    const onlySeedPpl = ids.length === 3 && ids.every((id) => DEFAULT_PPL.has(id));
    if (onlySeedPpl) {
      const seed = createSeedStore();
      next = {
        ...seed,
        weightUnit: store.weightUnit,
        sessions: store.sessions,
      };
    } else {
      const seed = createSeedStore();
      const hasT1 = store.programs.some((program) => program.id === "t1");
      next = {
        ...store,
        version: 2,
        programs: hasT1 ? store.programs : [...seed.programs, ...store.programs],
      };
    }
  }
  return { ...next, active: normalizeActive(next.active) };
}

function normalizeActive(active: Store["active"]): Store["active"] {
  if (!active) return null;
  return {
    ...active,
    restStartedAt: active.restStartedAt ?? null,
    restTargetSeconds: active.restTargetSeconds ?? 0,
    choices: active.choices ?? {},
    schemes: active.schemes ?? {},
  };
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
