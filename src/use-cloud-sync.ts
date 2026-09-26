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
import {
  canUploadToAccount,
  hasUserData,
  preferUserData,
  snapshotForAccount,
  type Snapshot,
  type SyncStatus,
} from "./logic/sync";
import type { Action, Store } from "./types";

const PUSH_DELAY_MS = 1500;

export type CloudControls = {
  configured: boolean;
  signedIn: boolean;
  email: string | null;
  status: SyncStatus;
  pendingSwitch: { email: string } | null;
  signIn: () => void;
  signOut: () => void;
  confirmSwitch: () => void;
  cancelSwitch: () => void;
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
  const pendingSessionRef = useRef<GoogleSession | null>(null);
  const [status, setStatus] = useState<SyncStatus>({ state: "idle" });
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<{ email: string } | null>(null);

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
    const chosen = preferUserData(latest, result.snapshot);
    if (chosen.store !== latest.store || chosen.updatedAt !== latest.updatedAt) {
      applySnapshot(chosen.store, chosen.updatedAt, session.profile.sub);
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

  const finishSync = async (session: GoogleSession, baseline: Snapshot) => {
    const result = await withToken((token) =>
      reconcileDrive(token, () => snapRef.current ?? baseline, null),
    );
    fileRef.current = result.file;
    const latest = snapRef.current ?? baseline;
    const chosen = preferUserData(latest, result.snapshot);
    if (chosen.store !== latest.store || chosen.updatedAt !== latest.updatedAt) {
      applySnapshot(chosen.store, chosen.updatedAt, session.profile.sub);
      return;
    }
    if (metaRef.current?.ownerSub === session.profile.sub) {
      saveUserSnapshot(window.localStorage, session.profile.sub, latest);
    }
  };

  const adopt = async (session: GoogleSession, switching: boolean) => {
    const visible = snapRef.current ?? { store, updatedAt: metaRef.current?.updatedAt ?? 0 };
    const meta = metaRef.current ?? { updatedAt: visible.updatedAt, ownerSub: null };
    sessionRef.current = session;
    fileRef.current = null;
    armPush.current = true;
    setSignedIn(true);
    setEmail(session.profile.email || null);
    saveAuthHint(window.localStorage, { sub: session.profile.sub, email: session.profile.email });
    if (switching && meta.ownerSub) {
      saveUserSnapshot(window.localStorage, meta.ownerSub, visible);
      const saved = loadUserSnapshot(window.localStorage, session.profile.sub);
      const incoming = saved ?? { store: createSeedStore(), updatedAt: 0 };
      applySnapshot(incoming.store, incoming.updatedAt, session.profile.sub);
      await finishSync(session, incoming);
      return;
    }
    const picked = preferUserData(
      visible,
      snapshotForAccount(
        { ...visible, ownerSub: meta.ownerSub },
        session.profile.sub,
        loadUserSnapshot(window.localStorage, session.profile.sub),
      ),
    );
    if (picked.store !== visible.store || picked.updatedAt !== visible.updatedAt) {
      applySnapshot(picked.store, picked.updatedAt, session.profile.sub);
    } else {
      metaRef.current = { updatedAt: visible.updatedAt, ownerSub: session.profile.sub };
      snapRef.current = visible;
      saveMeta(window.localStorage, metaRef.current);
      saveUserSnapshot(window.localStorage, session.profile.sub, visible);
    }
    await finishSync(session, snapRef.current ?? visible);
  };

  const connect = async (prompt: "" | "select_account"): Promise<boolean> => {
    const session = await signInWithGoogle(prompt);
    const owner = metaRef.current?.ownerSub ?? null;
    const visible = snapRef.current;
    if (owner && owner !== session.profile.sub && visible && hasUserData(visible.store)) {
      pendingSessionRef.current = session;
      setPendingSwitch({ email: session.profile.email || "another Google account" });
      setStatus({ state: "idle" });
      return true;
    }
    await adopt(session, owner !== null && owner !== session.profile.sub);
    return false;
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
        const needsSwitch = await connectRef.current("");
        if (cancelled || needsSwitch) return;
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
    pendingSwitch,
    signIn: () => {
      void run(async () => {
        setStatus({ state: "syncing" });
        try {
          const needsSwitch = await connect("select_account");
          if (!needsSwitch) setStatus({ state: "synced", at: Date.now() });
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
          /* Keep the on-screen history either way. */
        }
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        armPush.current = false;
        fileRef.current = null;
        sessionRef.current = null;
        pendingSessionRef.current = null;
        clearGoogleSession();
        clearAuthHint(window.localStorage);
        setPendingSwitch(null);
        setSignedIn(false);
        setEmail(null);
        setStatus({ state: "idle" });
      });
    },
    confirmSwitch: () => {
      void run(async () => {
        const session = pendingSessionRef.current;
        pendingSessionRef.current = null;
        setPendingSwitch(null);
        if (!session) return;
        setStatus({ state: "syncing" });
        try {
          await adopt(session, true);
          setStatus({ state: "synced", at: Date.now() });
        } catch (error) {
          setStatus({ state: "error", message: messageOf(error) });
        }
      });
    },
    cancelSwitch: () => {
      pendingSessionRef.current = null;
      clearGoogleSession();
      setPendingSwitch(null);
      setStatus({ state: "idle" });
    },
  };
}

function messageOf(error: unknown): string {
  const text = error instanceof Error ? error.message : "Sync failed";
  return text.slice(0, 140) || "Sync failed";
}
