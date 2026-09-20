const SESSION_KEY = "chariot_supabase_session";

export type StoredSession = {
  access_token?: string;
  refresh_token?: string;
  [key: string]: any;
};

export function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY) || window.sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeStoredSession(session: StoredSession, keepSignedIn: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    (keepSignedIn ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage unavailable; the in-memory token still works for this session.
  }
}

export function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage errors.
  }
}