"use client";

import { AdminShell } from "./components/admin-shell";
import { AuthGate } from "./components/auth-gate";
import { useAdminAuth } from "./hooks/use-admin-auth";

export function AdminApp() {
  const auth = useAdminAuth();

  if (!auth.ready) {
    return (
      <main className="admin-splash">
        <img className="splash-logo-image" src="/images.jpeg" alt="Chariot Realty" />
        <p className="admin-eyebrow">Opening your private market desk…</p>
      </main>
    );
  }

  if (!auth.signedIn) return <AuthGate auth={auth} />;

  return <AdminShell auth={auth} />;
}
