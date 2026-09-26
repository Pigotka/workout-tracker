import { describe, expect, it } from "vitest";
import { createSeedStore } from "../seed";
import type { Store } from "../types";
import {
  clearAuthHint,
  ensureMeta,
  loadAuthHint,
  loadStore,
  loadUserSnapshot,
  memoryStorage,
  saveAuthHint,
  saveStore,
  saveUserSnapshot,
} from "./storage";
import {
  canUploadToAccount,
  decideSync,
  parseBackup,
  serializeBackup,
  snapshotForAccount,
  storeFromJson,
} from "./sync";

function owned(store: Store, updatedAt: number, ownerSub: string | null) {
  return { store, updatedAt, ownerSub };
}

function worked(completedAt: number, unit: "kg" | "lb" = "kg"): Store {
  return {
    ...createSeedStore(),
    weightUnit: unit,
    sessions: [
      {
        id: "s",
        programId: "test",
        programName: "Test",
        startedAt: completedAt - 10,
        completedAt,
        exercises: [],
      },
    ],
  };
}

describe("decideSync", () => {
  const localStore = worked(30, "lb");
  const remoteStore = worked(20, "kg");

  it("downloads when the remote write is newer and has real data", () => {
    const newer = worked(40);
    const decision = decideSync(
      { store: localStore, updatedAt: 10 },
      { version: 1, updatedAt: 20, store: newer },
    );
    expect(decision.upload).toBe(false);
    expect(decision.updatedAt).toBe(20);
    expect(decision.store).toBe(newer);
  });

  it("uploads when the local write is newer", () => {
    const decision = decideSync(
      { store: localStore, updatedAt: 30 },
      { version: 1, updatedAt: 20, store: remoteStore },
    );
    expect(decision).toMatchObject({ upload: true, updatedAt: 30, store: localStore });
  });

  it("keeps the local copy when timestamps match", () => {
    const decision = decideSync(
      { store: localStore, updatedAt: 20 },
      { version: 1, updatedAt: 20, store: remoteStore },
    );
    expect(decision.upload).toBe(false);
    expect(decision.store).toBe(localStore);
  });

  it("does not upload an untouched seed and does upload real local data", () => {
    expect(decideSync({ store: createSeedStore(), updatedAt: 0 }, null).upload).toBe(false);
    expect(decideSync({ store: localStore, updatedAt: 5 }, null)).toMatchObject({
      upload: true,
      updatedAt: 5,
    });
  });

  it("keeps local history when Drive is empty or older, and uploads it", () => {
    const local = { store: worked(5_000), updatedAt: 5_000 };
    const empty = decideSync(local, null);
    expect(empty.upload).toBe(true);
    expect(empty.store).toBe(local.store);
    expect(empty.updatedAt).toBe(5_000);

    const older = decideSync(local, { version: 1, updatedAt: 4_000, store: worked(4_000, "lb") });
    expect(older.upload).toBe(true);
    expect(older.store).toBe(local.store);
  });

  it("does not replace local history with a newer empty Drive backup", () => {
    const local = { store: worked(5_000), updatedAt: 5_000 };
    const decision = decideSync(local, { version: 1, updatedAt: 9_000, store: createSeedStore() });
    expect(decision.store).toBe(local.store);
    expect(decision.upload).toBe(true);
  });
});

describe("canUploadToAccount", () => {
  it("allows only the account that owns the cache", () => {
    expect(canUploadToAccount("wife", "wife")).toBe(true);
    expect(canUploadToAccount("husband", "wife")).toBe(false);
    expect(canUploadToAccount(null, "wife")).toBe(false);
    expect(canUploadToAccount("wife", null)).toBe(false);
  });
});

describe("snapshotForAccount", () => {
  const husband = { ...createSeedStore(), weightUnit: "lb" as const };
  const wife = { ...createSeedStore(), weightUnit: "kg" as const };

  it("never returns another account's visible cache", () => {
    const picked = snapshotForAccount(owned(husband, 90, "husband"), "wife", {
      store: wife,
      updatedAt: 10,
    });
    expect(picked.store).toBe(wife);
    expect(picked.store).not.toBe(husband);

    const empty = snapshotForAccount(owned(husband, 90, "husband"), "wife", null);
    expect(empty.store).not.toBe(husband);
    expect(empty.updatedAt).toBe(0);
    expect(empty.store.weightUnit).toBe("kg");
  });

  it("claims an unsigned cache and prefers a newer per-account slot", () => {
    const claimed = snapshotForAccount(owned(husband, 15, null), "husband", null);
    expect(claimed.store).toBe(husband);
    expect(claimed.replaced).toBe(false);

    const slot = snapshotForAccount(owned(createSeedStore(), 0, null), "husband", {
      store: husband,
      updatedAt: 15,
    });
    expect(slot.store).toBe(husband);
    expect(slot.replaced).toBe(true);
  });
});

describe("backup json", () => {
  it("round-trips a versioned backup and still accepts a raw store import", () => {
    const store = createSeedStore();
    const raw = serializeBackup(store, 42);
    expect(parseBackup(raw)).toEqual({ version: 1, updatedAt: 42, store });
    expect(parseBackup(JSON.stringify(store))).toBeNull();
    expect(storeFromJson(store)).toBe(store);
    expect(storeFromJson(JSON.parse(raw))).toEqual(store);
    expect(storeFromJson({ version: 1, updatedAt: 1 })).toBeNull();
  });
});

describe("account storage", () => {
  it("stamps existing history from the last workout and does not rewrite train:v1", () => {
    const fresh = memoryStorage();
    expect(ensureMeta(fresh, createSeedStore()).updatedAt).toBe(0);
    expect(ensureMeta(fresh, createSeedStore()).updatedAt).toBe(0);

    const used = memoryStorage();
    const history = worked(2_500);
    saveStore(used, history);
    expect(ensureMeta(used, history)).toEqual({ updatedAt: 2_500, ownerSub: null });
    expect(ensureMeta(used, history).updatedAt).toBe(2_500);
    expect(loadStore(used).sessions[0]?.completedAt).toBe(2_500);

    const edited = memoryStorage();
    const custom = { ...createSeedStore(), weightUnit: "lb" as const };
    expect(ensureMeta(edited, custom)).toEqual({ updatedAt: 1, ownerSub: null });
  });

  it("keeps each account's slot and drops the auth hint on sign-out", () => {
    const mem = memoryStorage();
    const alice = { ...createSeedStore(), weightUnit: "lb" as const };
    saveUserSnapshot(mem, "alice", { store: alice, updatedAt: 5 });
    saveUserSnapshot(mem, "bob", { store: createSeedStore(), updatedAt: 9 });
    expect(loadUserSnapshot(mem, "alice")).toMatchObject({ updatedAt: 5, store: { weightUnit: "lb" } });
    expect(loadUserSnapshot(mem, "bob")?.updatedAt).toBe(9);
    expect(loadUserSnapshot(mem, "../bob")).toBeNull();

    saveAuthHint(mem, { sub: "alice", email: "a@example.com" });
    expect(loadAuthHint(mem)?.email).toBe("a@example.com");
    clearAuthHint(mem);
    expect(loadAuthHint(mem)).toBeNull();
  });
});
