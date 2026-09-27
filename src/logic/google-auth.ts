const GIS_SRC = "https://accounts.google.com/gsi/client";
const SCOPE = ["openid", "email", "https://www.googleapis.com/auth/drive.appdata"].join(" ");
const USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";

export type GoogleProfile = {
  sub: string;
  email: string;
};

export type GoogleSession = {
  accessToken: string;
  expiresAt: number;
  profile: GoogleProfile;
};

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type TokenClient = {
  requestAccessToken: (override?: { prompt?: "" | "select_account" }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type: string; message?: string }) => void;
          }) => TokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

let session: GoogleSession | null = null;
let client: TokenClient | null = null;
let loading: Promise<void> | null = null;
let pending: {
  resolve: (token: { accessToken: string; expiresAt: number }) => void;
  reject: (error: Error) => void;
} | null = null;

export function googleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
}

export function currentGoogleSession(): GoogleSession | null {
  return session;
}

export function invalidateGoogleToken(): void {
  if (!session) return;
  session = { ...session, expiresAt: 0 };
}

export function clearGoogleSession(): void {
  const token = session?.accessToken;
  session = null;
  if (token) window.google?.accounts.oauth2.revoke(token);
}

export async function signInWithGoogle(prompt: "" | "select_account"): Promise<GoogleSession> {
  const token = await requestAccessToken(prompt);
  const profile = await fetchProfile(token.accessToken);
  session = { accessToken: token.accessToken, expiresAt: token.expiresAt, profile };
  return session;
}

export async function freshAccessToken(): Promise<string> {
  if (session && session.expiresAt - Date.now() > 60_000) return session.accessToken;
  const next = await signInWithGoogle("");
  return next.accessToken;
}

function requestAccessToken(prompt: "" | "select_account"): Promise<{ accessToken: string; expiresAt: number }> {
  return loadClient().then(
    (tokenClient) =>
      new Promise((resolve, reject) => {
        if (pending) pending.reject(new Error("Google sign-in was superseded"));
        pending = { resolve, reject };
        tokenClient.requestAccessToken({ prompt });
      }),
  );
}

function loadClient(): Promise<TokenClient> {
  const id = googleClientId();
  if (!id) return Promise.reject(new Error("Missing VITE_GOOGLE_CLIENT_ID"));
  return loadGis().then(() => {
    const google = window.google;
    if (!google) throw new Error("Google sign-in failed to load");
    if (!client) {
      client = google.accounts.oauth2.initTokenClient({
        client_id: id,
        scope: SCOPE,
        callback: (response) => {
          const waiter = pending;
          pending = null;
          if (!waiter) return;
          if (response.error || !response.access_token) {
            waiter.reject(new Error(response.error_description || response.error || "Google sign-in failed"));
            return;
          }
          waiter.resolve({
            accessToken: response.access_token,
            expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
          });
        },
        error_callback: (error) => {
          const waiter = pending;
          pending = null;
          waiter?.reject(new Error(error.message || "Google sign-in was cancelled"));
        },
      });
    }
    return client;
  });
}

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("Google sign-in failed to load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

async function fetchProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(USERINFO, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401) throw new Error("Google session expired");
  if (!res.ok) throw new Error("Could not read the Google account");
  const body: unknown = await res.json();
  if (typeof body !== "object" || body === null) throw new Error("Could not read the Google account");
  const record = body as Record<string, unknown>;
  const sub =
    typeof record.sub === "string" ? record.sub : typeof record.id === "string" ? record.id : "";
  if (!sub) throw new Error("Could not read the Google account");
  return { sub, email: typeof record.email === "string" ? record.email : "" };
}
