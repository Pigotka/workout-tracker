import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import { createSeedStore } from "./seed";
import { DriveAuthError, reconcileDrive, type DriveFile } from "./logic/drive";
import {
  clearGoogleSession,
  currentGoogleSession,
  freshAccessToken,
  googleClientId,
  invalidateGoogleToken,
  signInWithGoogle,
  type GoogleSession,
} from "./logic/google-auth";
import {
  clearAuthHint,
  ensureMeta,
  loadAuthHint,
  loadUserSnapshot,
  saveAuthHint,
  saveMeta,
  saveStore,
  saveUserSnapshot,
  type StoreMeta,
} from "./logic/storage";
import { canUploadToAccount, snapshotForAccount, type Snapshot, type SyncStatus } from "./logic/sync";
import type { Action, Store } from "./types";

const PUSH_DELAY_MS = 1500;

export type CloudControls = {
  configured: boolean;
  signedIn: boolean;
  email: string | null;
  status: SyncStatus;
  signIn: () => void;
  signOut: () => void;
};

export function useCloudSync(store: Store, dispatch: Dispatch<Action>): CloudControls {
  const metaRef = useRef<StoreMeta | null>(null);
  if (metaRef.current === null) metaRef.current = ensureMeta(window.localStorage, store);
  const snapRef = useRef<Snapshot | null>(null);
  if (snapRef.current === null) snapRef.current = { store, updatedAt: metaRef.current.updatedAt };
  const applied = useRef<Store | null>(null);
  const sessionRef = useRef<GoogleSession | null>(null);
  const fileRef = useRef<DriveFile | null>(null);
  const armPush = useRef(false);
  const booted = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef(Promise.resolve());
  const [status, setStatus] = useState<SyncStatus>({ state: "idle" });
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const applySnapshot = (nextStore: Store, updatedAt: number, ownerSub: string | null) => {
    const next = nextStore.restScreen === true || nextStore.restScreen === false
      ? nextStore
      : { ...nextStore, restScreen: true as const };
    applied.current = next;
    const meta = { updatedAt, ownerSub };
    metaRef.current = meta;
    snapRef.current = { store: next, updatedAt };
    saveStore(window.localStorage, next);
    saveMeta(window.localStorage, meta);
    if (ownerSub) saveUserSnapshot(window.localStorage, ownerSub, snapRef.current);
    dispatch({ type: "replace-store", store: next });
  };

  const run = (job: () => Promise<void>) => {
    const next = queue.current.then(job, job);
    queue.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  const withToken = async <T>(job: (token: string) => Promise<T>): Promise<T> => {
    const runJob = async () => {
      const token = await freshAccessToken();
      const account = currentGoogleSession();
      if (!canUploadToAccount(sessionRef.current?.profile.sub ?? null, account?.profile.sub ?? null)) {
        throw new Error("Google account changed. Sign in again.");
      }
      return job(token);
    };
    try {
      return await runJob();
    } catch (error) {
      if (!(error instanceof DriveAuthError)) throw error;
      invalidateGoogleToken();
      return runJob();
    }
  };

  const pushLatest = async () => {
    const session = sessionRef.current;
    const meta = metaRef.current;
    const snap = snapRef.current;
    if (!session || !meta || !snap || !armPush.current) return;
    if (!canUploadToAccount(meta.ownerSub, session.profile.sub) || snap.updatedAt <= 0) return;
    const result = await withToken((token) => reconcileDrive(token, () => snapRef.current ?? snap, fileRef.current));
    fileRef.current = result.file;
    const latest = snapRef.current ?? snap;
    if (result.snapshot.updatedAt > latest.updatedAt) {
      applySnapshot(result.snapshot.store, result.snapshot.updatedAt, session.profile.sub);
      return;
    }
    saveUserSnapshot(window.localStorage, session.profile.sub, latest);
  };

  const schedulePush = () => {
    if (!armPush.current || !sessionRef.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void run(async () => {
        if (!armPush.current || !sessionRef.current) return;
        setStatus({ state: "syncing" });
        try {
          await pushLatest();
          if (!armPush.current) return;
          setStatus({ state: "synced", at: Date.now() });
        } catch (error) {
          setStatus({ state: "error", message: messageOf(error) });
        }
      });
    }, PUSH_DELAY_MS);
  };

  const connect = async (prompt: "" | "select_account") => {
    const session = await signInWithGoogle(prompt);
    sessionRef.current = session;
    fileRef.current = null;
    armPush.current = true;
    setSignedIn(true);
    setEmail(session.profile.email || null);
    saveAuthHint(window.localStorage, { sub: session.profile.sub, email: session.profile.email });
    const visible = snapRef.current ?? { store, updatedAt: 0 };
    const meta = metaRef.current ?? { updatedAt: visible.updatedAt, ownerSub: null };
    const picked = snapshotForAccount(
      { ...visible, ownerSub: meta.ownerSub },
      session.profile.sub,
      loadUserSnapshot(window.localStorage, session.profile.sub),
    );
    if (picked.replaced) applySnapshot(picked.store, picked.updatedAt, session.profile.sub);
    else {
      metaRef.current = { updatedAt: picked.updatedAt, ownerSub: session.profile.sub };
      snapRef.current = { store: picked.store, updatedAt: picked.updatedAt };
      saveMeta(window.localStorage, metaRef.current);
      saveUserSnapshot(window.localStorage, session.profile.sub, snapRef.current);
    }
    const result = await withToken((token) =>
      reconcileDrive(token, () => snapRef.current ?? { store: picked.store, updatedAt: picked.updatedAt }, null),
    );
    fileRef.current = result.file;
    const latest = snapRef.current ?? { store: picked.store, updatedAt: picked.updatedAt };
    if (result.snapshot.updatedAt > latest.updatedAt) {
      applySnapshot(result.snapshot.store, result.snapshot.updatedAt, session.profile.sub);
    } else if (metaRef.current?.ownerSub === session.profile.sub) {
      saveUserSnapshot(window.localStorage, session.profile.sub, latest);
    }
  };

  const connectRef = useRef(connect);
  const runRef = useRef(run);
  const scheduleRef = useRef(schedulePush);
  connectRef.current = connect;
  runRef.current = run;
  scheduleRef.current = schedulePush;

  useEffect(() => {
    if (!booted.current) {
      booted.current = true;
      applied.current = store;
      return;
    }
    if (store === applied.current) return;
    const ownerSub = metaRef.current?.ownerSub ?? null;
    const updatedAt = Date.now();
    const meta = { updatedAt, ownerSub };
    metaRef.current = meta;
    snapRef.current = { store, updatedAt };
    saveStore(window.localStorage, store);
    saveMeta(window.localStorage, meta);
    if (ownerSub) saveUserSnapshot(window.localStorage, ownerSub, snapRef.current);
    scheduleRef.current();
  }, [store]);

  useEffect(() => {
    let cancelled = false;
    if (!googleClientId() || !loadAuthHint(window.localStorage)) return;
    void runRef.current(async () => {
      if (cancelled) return;
      setStatus({ state: "syncing" });
      try {
        await connectRef.current("");
        if (cancelled) return;
        setStatus({ state: "synced", at: Date.now() });
      } catch {
        if (cancelled) return;
        setSignedIn(sessionRef.current !== null);
        setEmail(sessionRef.current?.profile.email ?? null);
        setStatus({ state: "error", message: "Sign in to sync" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    configured: googleClientId() !== "",
    signedIn,
    email,
    status,
    signIn: () => {
      void run(async () => {
        setStatus({ state: "syncing" });
        try {
          await connect("select_account");
          setStatus({ state: "synced", at: Date.now() });
        } catch (error) {
          setSignedIn(sessionRef.current !== null);
          setEmail(sessionRef.current?.profile.email ?? null);
          setStatus({ state: "error", message: messageOf(error) });
        }
      });
    },
    signOut: () => {
      void run(async () => {
        try {
          await pushLatest();
        } catch {
          /* The per-account slot still has the last local copy. */
        }
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        armPush.current = false;
        fileRef.current = null;
        sessionRef.current = null;
        clearGoogleSession();
        clearAuthHint(window.localStorage);
        applySnapshot(createSeedStore(), 0, null);
        setSignedIn(false);
        setEmail(null);
        setStatus({ state: "idle" });
      });
    },
  };
}

function messageOf(error: unknown): string {
  const text = error instanceof Error ? error.message : "Sync failed";
  return text.slice(0, 140) || "Sync failed";
}
