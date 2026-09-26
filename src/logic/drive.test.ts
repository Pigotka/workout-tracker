import { describe, expect, it } from "vitest";
import { createSeedStore } from "../seed";
import type { Store } from "../types";
import { DriveAuthError, reconcileDrive } from "./drive";
import { serializeBackup } from "./sync";

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function media(store: Store, updatedAt: number, status = 200): Response {
  return new Response(serializeBackup(store, updatedAt), { status });
}

function history(unit: "kg" | "lb" = "kg"): Store {
  return {
    ...createSeedStore(),
    weightUnit: unit,
    sessions: [
      {
        id: "s1",
        programId: "test",
        programName: "Test",
        startedAt: 1_000,
        completedAt: 5_000,
        exercises: [],
      },
    ],
  };
}

describe("reconcileDrive", () => {
  it("lists app data and does not upload an untouched seed", async () => {
    const seen: string[] = [];
    const fetchFn: typeof fetch = async (input, init) => {
      const url = String(input);
      seen.push(`${init?.method ?? "GET"} ${url}`);
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer tok");
      expect(url.startsWith("https://www.googleapis.com/")).toBe(true);
      return json({ files: [] });
    };
    const result = await reconcileDrive("tok", () => ({ store: createSeedStore(), updatedAt: 0 }), null, fetchFn);
    expect(result).toMatchObject({ wrote: false, file: null });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain("spaces=appDataFolder");
    expect(seen[0]).toContain("train-v1.json");
  });

  it("creates the backup in appDataFolder", async () => {
    let body = "";
    const fetchFn: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("spaces=appDataFolder")) return json({ files: [] });
      expect(url).toContain("uploadType=multipart");
      expect(init?.method).toBe("POST");
      body = String(init?.body);
      return json({ id: "file-1", etag: '"e1"' });
    };
    const local = { store: { ...createSeedStore(), weightUnit: "lb" as const }, updatedAt: 10 };
    const result = await reconcileDrive("tok", () => local, null, fetchFn);
    expect(body).toContain('"parents":["appDataFolder"]');
    expect(body).toContain("train-v1.json");
    expect(body).toContain('"updatedAt":10');
    expect(result).toMatchObject({ wrote: true, file: { id: "file-1", etag: '"e1"' } });
  });

  it("uploads local history when Drive is empty or older", async () => {
    const localStore = history("lb");
    let posted = "";
    const created = await reconcileDrive(
      "tok",
      () => ({ store: localStore, updatedAt: 5_000 }),
      null,
      async (input, init) => {
        const url = String(input);
        if (url.includes("spaces=appDataFolder")) return json({ files: [] });
        posted = String(init?.body);
        return json({ id: "file-1", etag: '"e1"' });
      },
    );
    expect(created.wrote).toBe(true);
    expect(created.snapshot.store).toBe(localStore);
    expect(posted).toContain('"completedAt":5000');

    let patched = "";
    const older = await reconcileDrive(
      "tok",
      () => ({ store: localStore, updatedAt: 5_000 }),
      null,
      async (input, init) => {
        const url = String(input);
        if (url.includes("spaces=appDataFolder")) return json({ files: [{ id: "file-1", etag: '"e1"' }] });
        if (url.includes("alt=media")) return media(history(), 4_000);
        patched = String(init?.body);
        expect(init?.method).toBe("PATCH");
        return json({ id: "file-1", etag: '"e2"' });
      },
    );
    expect(older.wrote).toBe(true);
    expect(older.snapshot.store).toBe(localStore);
    expect(patched).toContain('"weightUnit":"lb"');
  });

  it("keeps a newer remote file and patches with If-Match when local is newer", async () => {
    const remote = history();
    const local = { store: history("lb"), updatedAt: 5 };
    const older = await reconcileDrive("tok", () => local, null, async (input, init) => {
      const url = String(input);
      if (url.includes("spaces=appDataFolder")) return json({ files: [{ id: "file-1", etag: '"e1"' }] });
      if (url.includes("alt=media")) return media(remote, 9);
      throw new Error(`unexpected ${init?.method} ${url}`);
    });
    expect(older.wrote).toBe(false);
    expect(older.snapshot.updatedAt).toBe(9);
    expect(older.snapshot.store).toEqual(remote);

    let match = "";
    const newer = await reconcileDrive("tok", () => ({ ...local, updatedAt: 12 }), null, async (input, init) => {
      const url = String(input);
      if (url.includes("spaces=appDataFolder")) return json({ files: [{ id: "file-1", etag: '"e1"' }] });
      if (url.includes("alt=media")) return media(remote, 9);
      match = (init?.headers as Record<string, string>)["If-Match"] ?? "";
      expect(init?.method).toBe("PATCH");
      return json({ id: "file-1", etag: '"e2"' });
    });
    expect(match).toBe('"e1"');
    expect(newer.wrote).toBe(true);
    expect(newer.snapshot.store.weightUnit).toBe("lb");
  });

  it("uses the newest duplicate and re-reads after an etag conflict", async () => {
    const oldStore = history("lb");
    const newStore = history();
    const duplicate = await reconcileDrive(
      "tok",
      () => ({ store: createSeedStore(), updatedAt: 3 }),
      null,
      async (input) => {
        const url = String(input);
        if (url.includes("spaces=appDataFolder")) {
          return json({
            files: [
              { id: "old", etag: '"a"' },
              { id: "new", etag: '"b"' },
            ],
          });
        }
        if (url.includes("/old")) return media(oldStore, 1);
        if (url.includes("/new")) return media(newStore, 8);
        throw new Error(url);
      },
    );
    expect(duplicate.wrote).toBe(false);
    expect(duplicate.snapshot.updatedAt).toBe(8);
    expect(duplicate.file?.id).toBe("new");

    let patches = 0;
    const conflict = await reconcileDrive(
      "tok",
      () => ({ store: oldStore, updatedAt: 10 }),
      null,
      async (input, init) => {
        const url = String(input);
        if (url.includes("spaces=appDataFolder")) return json({ files: [{ id: "file-1", etag: '"e1"' }] });
        if ((init?.method ?? "GET") === "PATCH") {
          patches += 1;
          return json({ error: "conflict" }, 412);
        }
        return media(newStore, patches === 0 ? 1 : 30);
      },
    );
    expect(patches).toBe(1);
    expect(conflict.wrote).toBe(false);
    expect(conflict.snapshot.updatedAt).toBe(30);
    expect(conflict.snapshot.store).toEqual(newStore);
  });

  it("refuses to overwrite an unreadable backup and surfaces auth expiry", async () => {
    await expect(
      reconcileDrive("tok", () => ({ store: createSeedStore(), updatedAt: 4 }), null, async (input) => {
        const url = String(input);
        if (url.includes("spaces=appDataFolder")) return json({ files: [{ id: "file-1", etag: '"e1"' }] });
        return new Response("nope", { status: 200 });
      }),
    ).rejects.toThrow("Drive backup is unreadable");

    await expect(
      reconcileDrive("tok", () => ({ store: createSeedStore(), updatedAt: 4 }), null, async () => json({}, 401)),
    ).rejects.toBeInstanceOf(DriveAuthError);
  });
});
