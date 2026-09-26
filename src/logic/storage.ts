import { SEED_PROGRAMS, createSeedStore } from "../seed";
import type { Store } from "../types";

export const STORAGE_KEY = "train:v1";
export const META_KEY = "train:v1:meta";
export const AUTH_HINT_KEY = "train:auth";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type StoreMeta = {
  updatedAt: number;
  ownerSub: string | null;
};

export type AuthHint = {
  sub: string;
  email: string;
};

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

export function isUntouchedSeed(store: Store): boolean {
  if (store.sessions.length > 0 || store.active) return false;
  if (store.weightUnit !== "kg" || store.restScreen === false) return false;
  return JSON.stringify(store.programs) === JSON.stringify(SEED_PROGRAMS);
}

export function readMeta(storage: StorageLike): StoreMeta | null {
  try {
    const raw = storage.getItem(META_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.updatedAt !== "number" || !Number.isFinite(record.updatedAt)) return null;
    if (record.ownerSub !== null && typeof record.ownerSub !== "string") return null;
    return { updatedAt: record.updatedAt, ownerSub: record.ownerSub };
  } catch {
    return null;
  }
}

export function saveMeta(storage: StorageLike, meta: StoreMeta): void {
  storage.setItem(META_KEY, JSON.stringify(meta));
}

/** Existing histories get a timestamp once so the first sign-in uploads them. A fresh seed stays at 0 so it cannot clobber a remote backup. */
export function ensureMeta(storage: StorageLike, store: Store, now = Date.now()): StoreMeta {
  const existing = readMeta(storage);
  if (existing) return existing;
  const meta = { updatedAt: isUntouchedSeed(store) ? 0 : now, ownerSub: null };
  saveMeta(storage, meta);
  return meta;
}

function userKey(sub: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(sub)) return null;
  return `train:v1:user:${sub}`;
}

export function loadUserSnapshot(
  storage: StorageLike,
  sub: string,
): { store: Store; updatedAt: number } | null {
  const key = userKey(sub);
  if (!key) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.updatedAt !== "number" || !Number.isFinite(record.updatedAt)) return null;
    if (!isStore(record.store)) return null;
    return { store: record.store, updatedAt: record.updatedAt };
  } catch {
    return null;
  }
}

export function saveUserSnapshot(
  storage: StorageLike,
  sub: string,
  snapshot: { store: Store; updatedAt: number },
): void {
  const key = userKey(sub);
  if (!key) return;
  storage.setItem(key, JSON.stringify(snapshot));
}

export function loadAuthHint(storage: StorageLike): AuthHint | null {
  try {
    const raw = storage.getItem(AUTH_HINT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.sub !== "string" || !record.sub) return null;
    return { sub: record.sub, email: typeof record.email === "string" ? record.email : "" };
  } catch {
    return null;
  }
}

export function saveAuthHint(storage: StorageLike, hint: AuthHint): void {
  storage.setItem(AUTH_HINT_KEY, JSON.stringify(hint));
}

export function clearAuthHint(storage: StorageLike): void {
  storage.setItem(AUTH_HINT_KEY, "");
}

export function memoryStorage(initial?: string): StorageLike {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(STORAGE_KEY, initial);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, next) => {
      values.set(key, next);
    },
  };
}
