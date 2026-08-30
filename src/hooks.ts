import { useEffect, useState } from "react";

export function useNow(active = true, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);
  return now;
}

export function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    let cancelled = false;

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        /* unsupported or battery saver */
      }
    };

    const onVis = () => {
      if (document.visibilityState === "visible" && !cancelled) void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
    };
  }, [active]);
}

export function useInstallPrompt(): { prompt: () => void; available: boolean } {
  const [event, setEvent] = useState<{ prompt: () => Promise<unknown> } | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as unknown as { prompt: () => Promise<unknown> });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  return {
    available: event !== null,
    prompt: () => {
      void event?.prompt();
      setEvent(null);
    },
  };
}
