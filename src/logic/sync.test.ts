import { describe, expect, it } from "vitest";
import { createSeedStore } from "../seed";
import type { Store } from "../types";
import {
  clearAuthHint,
  ensureMeta,
  loadAuthHint,
  loadUserSnapshot,
  memoryStorage,
  saveAuthHint,
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

describe("decideSync", () => {
  const localStore = { ...createSeedStore(), weightUnit: "lb" as const };
  const remoteStore = { ...createSeedStore(), weightUnit: "kg" as const };

  it("downloads when the remote write is newer", () => {
    const decision = decideSync(
      { store: localStore, updatedAt: 10 },
      { version: 1, updatedAt: 20, store: remoteStore },
    );
    expect(decision.upload).toBe(false);
    expect(decision.updatedAt).toBe(20);
    expect(decision.store).toBe(remoteStore);
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
  it("stamps existing data once and leaves a fresh seed at zero", () => {
    const fresh = memoryStorage();
    expect(ensureMeta(fresh, createSeedStore(), 50).updatedAt).toBe(0);
    expect(ensureMeta(fresh, createSeedStore(), 80).updatedAt).toBe(0);

    const used = memoryStorage();
    const custom = { ...createSeedStore(), weightUnit: "lb" as const };
    expect(ensureMeta(used, custom, 50)).toEqual({ updatedAt: 50, ownerSub: null });
    expect(ensureMeta(used, custom, 80).updatedAt).toBe(50);
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
