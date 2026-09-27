import { parseBackup, serializeBackup, decideSync, type CloudBackup, type Snapshot } from "./sync";

export const BACKUP_NAME = "train-v1.json";

const FILES = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

export type DriveFile = {
  id: string;
  etag: string;
};

export class DriveAuthError extends Error {
  constructor() {
    super("Google session expired");
    this.name = "DriveAuthError";
  }
}

export type ReconcileResult = {
  snapshot: Snapshot;
  file: DriveFile | null;
  wrote: boolean;
};

type FetchFn = typeof fetch;

export async function reconcileDrive(
  token: string,
  getLocal: () => Snapshot,
  known: DriveFile | null,
  fetchFn: FetchFn = fetch,
): Promise<ReconcileResult> {
  const remote = await loadRemote(token, known, fetchFn);
  const decision = decideSync(getLocal(), remote?.backup ?? null);
  if (!remote) {
    if (!decision.upload) return { snapshot: decision, file: null, wrote: false };
    const created = await createFile(token, decision, fetchFn);
    return { snapshot: decision, file: created, wrote: true };
  }
  if (!decision.upload) {
    return { snapshot: { store: decision.store, updatedAt: decision.updatedAt }, file: remote.file, wrote: false };
  }
  const latest = decideSync(getLocal(), remote.backup);
  if (!latest.upload) {
    return { snapshot: { store: latest.store, updatedAt: latest.updatedAt }, file: remote.file, wrote: false };
  }
  const wrote = await updateFile(token, remote.file, latest, fetchFn);
  if (!wrote.conflict) {
    return { snapshot: { store: latest.store, updatedAt: latest.updatedAt }, file: wrote.file, wrote: true };
  }
  // ponytail: one etag retry. A second 412 surfaces as an error; the next edit syncs again.
  const again = await readFile(token, remote.file.id, remote.file.etag, fetchFn);
  if (!again) {
    const created = await createFile(token, latest, fetchFn);
    return { snapshot: { store: latest.store, updatedAt: latest.updatedAt }, file: created, wrote: true };
  }
  const retry = decideSync(getLocal(), again.backup);
  if (!retry.upload) {
    return {
      snapshot: { store: retry.store, updatedAt: retry.updatedAt },
      file: { id: remote.file.id, etag: again.etag },
      wrote: false,
    };
  }
  const second = await updateFile(token, { id: remote.file.id, etag: again.etag }, retry, fetchFn);
  if (second.conflict) throw new Error("Drive backup changed while syncing");
  return { snapshot: { store: retry.store, updatedAt: retry.updatedAt }, file: second.file, wrote: true };
}

async function loadRemote(
  token: string,
  known: DriveFile | null,
  fetchFn: FetchFn,
): Promise<{ file: DriveFile; backup: CloudBackup } | null> {
  if (known) {
    const read = await readFile(token, known.id, known.etag, fetchFn);
    if (read) return { file: { id: known.id, etag: read.etag }, backup: read.backup };
  }
  const files = await listFiles(token, fetchFn);
  // ponytail: duplicate appData files can exist if two devices create at once; keep the newest updatedAt.
  let best: { file: DriveFile; backup: CloudBackup } | null = null;
  for (const file of files) {
    const read = await readFile(token, file.id, file.etag, fetchFn);
    if (!read) continue;
    if (!best || read.backup.updatedAt > best.backup.updatedAt) {
      best = { file: { id: file.id, etag: read.etag || file.etag }, backup: read.backup };
    }
  }
  return best;
}

async function listFiles(token: string, fetchFn: FetchFn): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name = '${BACKUP_NAME}' and trashed = false`,
    fields: "files(id,name)",
    pageSize: "10",
  });
  const res = await fetchFn(`${FILES}?${params}`, { headers: authHeaders(token) });
  await assertOk(res);
  const body: unknown = await res.json();
  if (typeof body !== "object" || body === null) return [];
  const files = (body as { files?: unknown }).files;
  if (!Array.isArray(files)) return [];
  return files.flatMap((file) => {
    const parsed = fileFrom(file);
    return parsed ? [{ id: parsed.id, etag: "" }] : [];
  });
}

async function readFile(
  token: string,
  id: string,
  fallbackEtag: string,
  fetchFn: FetchFn,
): Promise<{ backup: CloudBackup; etag: string } | null> {
  const res = await fetchFn(`${FILES}/${encodeURIComponent(id)}?alt=media`, {
    headers: authHeaders(token),
  });
  if (res.status === 404) return null;
  await assertOk(res);
  const backup = parseBackup(await res.text());
  if (!backup) throw new Error("Drive backup is unreadable");
  return { backup, etag: res.headers.get("ETag") || fallbackEtag };
}

async function createFile(token: string, snapshot: Snapshot, fetchFn: FetchFn): Promise<DriveFile> {
  const boundary = "train_backup";
  const meta = JSON.stringify({ name: BACKUP_NAME, parents: ["appDataFolder"] });
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    meta,
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    serializeBackup(snapshot.store, snapshot.updatedAt),
    `--${boundary}--`,
    "",
  ].join("\r\n");
  const res = await fetchFn(`${UPLOAD}?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  await assertOk(res);
  const file = fileFrom(await res.json());
  if (!file) throw new Error("Drive did not return a backup file");
  return { id: file.id, etag: headerEtag(res) };
}

async function updateFile(
  token: string,
  file: DriveFile,
  snapshot: Snapshot,
  fetchFn: FetchFn,
): Promise<{ conflict: true } | { conflict: false; file: DriveFile }> {
  const headers: Record<string, string> = {
    ...authHeaders(token),
    "Content-Type": "application/json",
  };
  if (file.etag) headers["If-Match"] = file.etag;
  const res = await fetchFn(`${UPLOAD}/${encodeURIComponent(file.id)}?uploadType=media&fields=id`, {
    method: "PATCH",
    headers,
    body: serializeBackup(snapshot.store, snapshot.updatedAt),
  });
  if (res.status === 412) return { conflict: true };
  await assertOk(res);
  const parsed = fileFrom(await res.json());
  return { conflict: false, file: { id: parsed?.id ?? file.id, etag: headerEtag(res) } };
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function headerEtag(res: Response): string {
  return res.headers.get("ETag") || "";
}

async function assertOk(res: Response): Promise<void> {
  if (res.ok) return;
  if (res.status === 401) throw new DriveAuthError();
  const detail = await errorDetail(res);
  if (res.status === 403) {
    throw new Error(detail ? `Drive access was denied: ${detail}` : "Drive access was denied");
  }
  throw new Error(detail ? `Drive request failed (${res.status}): ${detail}` : `Drive request failed (${res.status})`);
}

async function errorDetail(res: Response): Promise<string> {
  try {
    const text = (await res.text()).trim().replace(/\s+/g, " ");
    if (!text) return "";
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null) {
        const record = parsed as { error?: { message?: unknown } | string; message?: unknown };
        const nested = record.error;
        const message =
          typeof nested === "object" && nested !== null && typeof nested.message === "string"
            ? nested.message
            : typeof nested === "string"
              ? nested
              : typeof record.message === "string"
                ? record.message
                : "";
        if (message) return message.slice(0, 160);
      }
    } catch {
      /* use the raw body */
    }
    return text.slice(0, 160);
  } catch {
    return "";
  }
}

function fileFrom(value: unknown): { id: string } | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id) return null;
  return { id: record.id };
}
