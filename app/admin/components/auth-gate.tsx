"use client";

import { FormEvent, useEffect, useState } from "react";
import type { AdminAuth } from "../hooks/use-admin-auth";

type Mode = "login" | "forgot" | "update";

export function AuthGate({ auth }: { auth: AdminAuth }) {
  const [mode, setMode] = useState<Mode>("login");
  const [resetToken, setResetToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keep, setKeep] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryReset = new URLSearchParams(window.location.search).get("reset");
    const token = hash.get("access_token");
    if (token && (hash.get("type") === "recovery" || queryReset)) {
      setResetToken(token);
      setMode("update");
      window.history.replaceState({}, "", "/admin?reset=1");
    }
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNote("");
    setBusy(true);
    try {
      if (mode === "login") {
        const err = await auth.signIn(email, password, keep);
        if (err) setError(err);
      } else if (mode === "forgot") {
        const err = await auth.sendResetLink(email);
        if (err) setError(err);
        else setNote("If that email belongs to Chariot, a reset link is on its way.");
      } else {
        const form = new FormData(event.currentTarget as HTMLFormElement);
        const first = String(form.get("new_password") || "");
        const confirm = String(form.get("confirm_password") || "");
        if (first !== confirm) {
          setError("Passwords do not match");
          return;
        }
        const err = await auth.updatePassword(resetToken, first);
        if (err) setError(err);
        else {
          setNote("Password updated. You can sign in now.");
          setMode("login");
          window.history.replaceState({}, "", "/admin");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Owner login" : mode === "forgot" ? "Reset password" : "Choose a new password";
  const lede =
    mode === "login"
      ? "Sign in with your Supabase account to open the private market desk."
      : mode === "forgot"
        ? "We’ll email a secure reset link to your Chariot account."
        : "Set a new password for your Chariot account.";

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <img className="auth-logo-image" src="/images.jpeg" alt="Chariot Realty" />
        <p className="admin-eyebrow">Chariot Realty · Mumbai</p>
        <h1>{title}</h1>
        <p className="auth-lede">{lede}</p>
        {auth.sessionExpired && <p className="note note-error">Your secure session expired. Please sign in again.</p>}
        {mode !== "update" && (
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
        )}
        {mode === "login" && (
          <>
            <label className="field">
              <span>Password</span>
              <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <label className="check">
              <input type="checkbox" checked={keep} onChange={(event) => setKeep(event.target.checked)} /> Keep me signed in on this device
            </label>
          </>
        )}
        {mode === "update" && (
          <>
            <label className="field">
              <span>New password</span>
              <input name="new_password" type="password" autoComplete="new-password" minLength={8} required />
            </label>
            <label className="field">
              <span>Confirm password</span>
              <input name="confirm_password" type="password" autoComplete="new-password" minLength={8} required />
            </label>
          </>
        )}
        {note && <p className="note note-success">{note}</p>}
        {error && <p className="note note-error">{error}</p>}
        <button type="submit" className="btn btn-dark btn-block" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in securely" : mode === "forgot" ? "Email reset link" : "Update password"}
        </button>
        {mode === "login" && (
          <button type="button" className="auth-alt" onClick={() => { setMode("forgot"); setError(""); }}>
            Forgot password?
          </button>
        )}
        {mode === "forgot" && (
          <button type="button" className="auth-alt" onClick={() => { setMode("login"); setNote(""); }}>
            ← Back to sign in
          </button>
        )}
        <a href="/" className="auth-public">
          ← Public site
        </a>
      </form>
    </div>
  );
}
