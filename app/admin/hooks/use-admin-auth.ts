"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiUrl, jsonInit } from "../lib/api";
import { clearStoredSession, readStoredSession, writeStoredSession } from "../lib/session";

export type AdminApi = {
  get: (path: string) => Promise<Response>;
  post: (path: string, body?: unknown) => Promise<Response>;
  patch: (path: string, body: unknown) => Promise<Response>;
  delete: (path: string) => Promise<Response>;
};

export type AdminAuth = {
  ready: boolean;
  signedIn: boolean;
  sessionExpired: boolean;
  signIn: (email: string, password: string, keepSignedIn: boolean) => Promise<string | null>;
  sendResetLink: (email: string) => Promise<string | null>;
  updatePassword: (accessToken: string, password: string) => Promise<string | null>;
  signOut: () => void;
  api: AdminApi;
};

export function useAdminAuth(): AdminAuth {
  const [ready, setReady] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const tokenRef = useRef("");

  const applyToken = useCallback((token: string) => {
    tokenRef.current = token;
    setAuthToken(token);
  }, []);

  useEffect(() => {
    const session = readStoredSession();
    if (session?.access_token) applyToken(session.access_token);
    setReady(true);
  }, [applyToken]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const session = readStoredSession();
    if (!session?.refresh_token) return false;
    try {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (!response.ok) return false;
      const refreshed = await response.json();
      if (!refreshed?.access_token) return false;
      writeStoredSession(refreshed, keepSignedIn);
      applyToken(refreshed.access_token);
      return true;
    } catch {
      return false;
    }
  }, [applyToken, keepSignedIn]);

  const expireSession = useCallback(() => {
    clearStoredSession();
    applyToken("");
    setSessionExpired(true);
  }, [applyToken]);

  const request = useCallback(
    async (path: string, init: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(init.headers);
      if (tokenRef.current) headers.set("Authorization", `Bearer ${tokenRef.current}`);
      let response = await fetch(apiUrl(path), { ...init, headers });
      if (response.status === 401 && (await refreshSession())) {
        const retryHeaders = new Headers(init.headers);
        if (tokenRef.current) retryHeaders.set("Authorization", `Bearer ${tokenRef.current}`);
        response = await fetch(apiUrl(path), { ...init, headers: retryHeaders });
      }
      if (response.status === 401) expireSession();
      return response;
    },
    [expireSession, refreshSession],
  );

  const api = useMemo<AdminApi>(
    () => ({
      get: (path) => request(path),
      post: (path, body) => request(path, jsonInit("POST", body)),
      patch: (path, body) => request(path, jsonInit("PATCH", body)),
      delete: (path) => request(path, jsonInit("DELETE")),
    }),
    [request],
  );

  const signIn = useCallback(
    async (email: string, password: string, keep: boolean): Promise<string | null> => {
      setKeepSignedIn(keep);
      setSessionExpired(false);
      try {
        const response = await fetch(apiUrl("/api/auth/login"), jsonInit("POST", { email, password }));
        const payload = await response.json();
        if (!response.ok) return String(payload.error || "Could not sign in");
        writeStoredSession(payload, keep);
        applyToken(payload.access_token || "");
        return null;
      } catch {
        return "Could not sign in";
      }
    },
    [applyToken],
  );

  const sendResetLink = useCallback(async (email: string): Promise<string | null> => {
    try {
      const response = await fetch(apiUrl("/api/auth/reset"), jsonInit("POST", { action: "request", email }));
      const payload = await response.json();
      if (!response.ok) return String(payload.error || "Could not send reset email");
      return null;
    } catch {
      return "Could not send reset email";
    }
  }, []);

  const updatePassword = useCallback(async (accessToken: string, password: string): Promise<string | null> => {
    try {
      const response = await fetch(apiUrl("/api/auth/reset"), jsonInit("POST", { action: "update", access_token: accessToken, password }));
      const payload = await response.json();
      if (!response.ok) return String(payload.error || "Could not update password");
      return null;
    } catch {
      return "Could not update password";
    }
  }, []);

  const signOut = useCallback(() => {
    clearStoredSession();
    applyToken("");
  }, [applyToken]);

  return {
    ready,
    signedIn: Boolean(authToken),
    sessionExpired,
    signIn,
    sendResetLink,
    updatePassword,
    signOut,
    api,
  };
}