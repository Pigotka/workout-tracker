import { createSeedStore } from "../seed";
import type { Store } from "../types";
import { isStore } from "./storage";

export type CloudBackup = {
  version: 1;
  updatedAt: number;
  store: Store;
};

export type Snapshot = {
  store: Store;
  updatedAt: number;
};

export type SyncStatus =
  | { state: "idle" }
  | { state: "syncing" }
  | { state: "synced"; at: number }
  | { state: "error"; message: string };

export function parseBackup(raw: string): CloudBackup | null {
  try {
    return backupFrom(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function serializeBackup(store: Store, updatedAt: number): string {
  const payload: CloudBackup = { version: 1, updatedAt, store };
  return JSON.stringify(payload);
}

/** Manual import accepts today's raw store or a Drive wrapper. */
export function storeFromJson(value: unknown): Store | null {
  if (isStore(value)) return value;
  return backupFrom(value)?.store ?? null;
}

function backupFrom(value: unknown): CloudBackup | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== 1) return null;
  if (typeof record.updatedAt !== "number" || !Number.isFinite(record.updatedAt)) return null;
  if (!isStore(record.store)) return null;
  return { version: 1, updatedAt: record.updatedAt, store: record.store };
}

/** Last write wins by `updatedAt`. Equal timestamps stay local and skip the upload. */
export function decideSync(local: Snapshot, remote: CloudBackup | null): Snapshot & { upload: boolean } {
  if (!remote) {
    return { store: local.store, updatedAt: local.updatedAt, upload: local.updatedAt > 0 };
  }
  if (remote.updatedAt > local.updatedAt) {
    return { store: remote.store, updatedAt: remote.updatedAt, upload: false };
  }
  if (local.updatedAt > remote.updatedAt) {
    return { store: local.store, updatedAt: local.updatedAt, upload: true };
  }
  return { store: local.store, updatedAt: local.updatedAt, upload: false };
}

/** Upload only when this cache is owned by the account the token belongs to. */
export function canUploadToAccount(ownerSub: string | null, accountSub: string | null): boolean {
  return ownerSub !== null && accountSub !== null && ownerSub === accountSub;
}

/**
 * Pick the snapshot that belongs to `accountSub`.
 * A visible cache owned by someone else is never a candidate.
 */
export function snapshotForAccount(
  visible: Snapshot & { ownerSub: string | null },
  accountSub: string,
  saved: Snapshot | null,
): Snapshot & { replaced: boolean } {
  const ownVisible = visible.ownerSub === accountSub || visible.ownerSub === null;
  const options: Snapshot[] = [];
  if (ownVisible) options.push({ store: visible.store, updatedAt: visible.updatedAt });
  if (saved) options.push(saved);
  const best = options.reduce<Snapshot | null>((winner, option) => {
    if (!winner || option.updatedAt > winner.updatedAt) return option;
    return winner;
  }, null) ?? { store: createSeedStore(), updatedAt: 0 };
  return {
    store: best.store,
    updatedAt: best.updatedAt,
    replaced: best.store !== visible.store || best.updatedAt !== visible.updatedAt,
  };
}
