"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { readJson } from "../lib/api";
import type { WhatsappStatus } from "../lib/types";
import type { AdminApi } from "../hooks/use-admin-auth";
import { EmptyPanel, Note, Panel, PanelHead } from "./ui";

export type Notify = (message: string, tone?: "success" | "error") => void;

export function WhatsappTab({ api, notify }: { api: AdminApi; notify: Notify }) {
  const [status, setStatus] = useState<WhatsappStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | { kind: "reset" | "remove" }>(null);
  const [waiting, setWaiting] = useState(false);
  const [qrImage, setQrImage] = useState("");

  const loadStatus = useCallback(async () => {
    setError("");
    const response = await api.get("/api/whatsapp/status");
    const payload = await readJson(response);
    if (!response.ok) {
      setError(payload.error || "Could not read WhatsApp status");
      setStatus(null);
      return null;
    }
    setStatus(payload.status || null);
    return payload.status || null;
  }, [api]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    let active = true;
    if (!status?.qr) {
      setQrImage("");
      return () => { active = false; };
    }
    QRCode.toDataURL(status.qr, { width: 260, margin: 2, errorCorrectionLevel: "M" })
      .then((image) => { if (active) setQrImage(image); })
      .catch(() => { if (active) setQrImage(""); });
    return () => { active = false; };
  }, [status?.qr]);

  const fail = (message: string) => {
    setError(message);
    notify(message, "error");
  };

  async function connect() {
    setError("");
    const response = await api.post("/api/whatsapp/connect");
    const payload = await readJson(response);
    if (!response.ok) return fail(payload.error || "Could not start WhatsApp connection");
    await loadStatus();
    notify("WhatsApp connection refreshed");
  }

  async function disconnect() {
    setBusy(true);
    setError("");
    try {
      const response = await api.post("/api/whatsapp/disconnect");
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not disconnect WhatsApp");
      await loadStatus();
      notify("WhatsApp disconnected");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not disconnect WhatsApp");
    } finally {
      setBusy(false);
    }
  }

  async function waitForPairingCode() {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const next = await loadStatus();
      if (next?.connected || next?.connection_state === "pairing_error") return;
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
    setError("WhatsApp pairing did not complete within 2 minutes. Click Refresh status or try again.");
  }

  async function pair() {
    setBusy(true);
    setWaiting(true);
    setError("");
    try {
      if (status?.connected) throw new Error("WhatsApp is already connected. Pairing is only needed after disconnecting the device.");
      const response = await api.post("/api/whatsapp/pair");
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not start WhatsApp pairing");
      await waitForPairingCode();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start WhatsApp pairing");
    } finally {
      setWaiting(false);
      setBusy(false);
    }
  }

  async function performResetAndPair() {
    setBusy(true);
    setWaiting(true);
    setError("");
    try {
      const resetResponse = await api.post("/api/whatsapp/reset");
      const resetPayload = await readJson(resetResponse);
      if (!resetResponse.ok) throw new Error(resetPayload.error || "Could not reset WhatsMeow device");
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      const pairResponse = await api.post("/api/whatsapp/pair");
      const pairPayload = await readJson(pairResponse);
      if (!pairResponse.ok) throw new Error(pairPayload.error || "Could not start WhatsMeow pairing");
      await waitForPairingCode();
      notify("Pairing flow started");
    } catch (e) {
      fail(e instanceof Error ? e.message : "WhatsMeow pairing failed");
    } finally {
      setWaiting(false);
      setBusy(false);
    }
  }

  async function performRemove() {
    setBusy(true);
    setError("");
    try {
      const response = await api.post("/api/whatsapp/remove");
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not remove WhatsApp number");
      setStatus(null);
      notify("WhatsApp number removed");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not remove WhatsApp number");
    } finally {
      setBusy(false);
    }
  }

  function confirmDestructive() {
    const kind = confirm?.kind;
    setConfirm(null);
    if (kind === "reset") performResetAndPair();
    if (kind === "remove") performRemove();
  }

  const connected = Boolean(status?.connected);

  return (
    <div className="tab-stack">
      {confirm && (
        <div className="confirm-backdrop" role="presentation">
          <div className="confirm-card" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <p className="admin-eyebrow">WhatsApp control</p>
            <h2 id="confirm-title">{confirm.kind === "reset" ? "Reset and re-pair WhatsApp?" : "Remove WhatsApp number?"}</h2>
            <p>
              {confirm.kind === "reset"
                ? "This unlinks the current WhatsMeow device and starts a new pairing flow. Keep this page open for the pairing code."
                : "This removes the saved WhatsMeow device session. You will need a new pairing code to use this number again."}
            </p>
            <div className="confirm-actions">
              <button type="button" className="btn btn-light" onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={confirmDestructive}>Continue</button>
            </div>
          </div>
        </div>
      )}

      <Panel className="whatsapp-panel">
        <PanelHead
          eyebrow="Private publishing"
          title="WhatsApp studio"
          subtitle="Publish listings from your WhatsApp self-chat. Confirmed posts appear on the public website."
        />
        <div className="wa-status-row">
          <div className="wa-status">
            <span className={`status-dot${connected ? " live" : ""}`} />
            {connected ? `Connected${status?.connection_state ? ` · ${status.connection_state}` : ""}` : status?.error || "Private gateway status not checked"}
          </div>
        </div>
        <div className="wa-grid">
          <div>
            <span>Engine</span>
            <strong>WhatsMeow · Chariot gateway</strong>
          </div>
          <div>
            <span>Phone</span>
            <strong>{status?.phone_number || "Not paired"}</strong>
          </div>
          <div>
            <span>Broker</span>
            <strong>{status?.broker_id || "chariot-realty"}</strong>
          </div>
        </div>
        <div className="wa-actions">
          <button type="button" className="btn btn-dark" onClick={loadStatus} disabled={busy}>Refresh status</button>
          <button type="button" className="btn btn-light" onClick={connect} disabled={busy || connected}>Reconnect WhatsApp</button>
          <button type="button" className="btn btn-light" onClick={pair} disabled={busy || connected || waiting}>
            {connected ? "Pairing after reset" : waiting ? "Waiting for code…" : "Request pairing code"}
          </button>
          <button type="button" className="btn btn-light" onClick={() => setConfirm({ kind: "reset" })} disabled={busy}>
            {waiting ? "Waiting for code…" : "Reset & re-pair"}
          </button>
          <button type="button" className="btn btn-danger" onClick={disconnect} disabled={busy || !connected}>Disconnect</button>
          <button type="button" className="btn btn-danger" onClick={() => setConfirm({ kind: "remove" })} disabled={busy}>Remove number</button>
        </div>
        {waiting && !connected && !status?.pairing_code && (
          <div className="pairing-box">
            <p className="pairing-note">WhatsMeow is connecting securely. The pairing code will appear here automatically—keep this page open.</p>
          </div>
        )}
        {status?.pairing_code && (
          <div className="pairing-box">
            <p className="pairing-note">Enter this WhatsApp pairing code on the phone: WhatsApp → Linked devices → Link with phone number.</p>
            <strong className="pairing-code">{status.pairing_code}</strong>
          </div>
        )}
          {status?.qr && (
            <div className="pairing-box">
            <p className="pairing-note">WhatsApp is waiting for pairing. On the phone ending in 7759, open WhatsApp → Linked devices → Link a device and scan this code.</p>
            {qrImage ? <img className="pairing-qr" src={qrImage} alt="WhatsApp pairing QR code" /> : <code>{status.qr}</code>}
            </div>
          )}
        {error && <Note tone="error">{error}</Note>}
        <EmptyPanel title="Publishing is controlled from your WhatsApp self-chat.">
          Send the property text and photos there, review the draft, then reply “post it” to publish it on Chariot Realty.
        </EmptyPanel>
      </Panel>
    </div>
  );
}
