"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Property = { id: string; name: string; category: string; locality: string; price: string; carpetAreaSqft: number; configuration?: string; status: string; image?: string };
type Market = { name: string; positioning: string; transit: string[] };
type Lead = { id: string; name: string; phone: string; intent: string; locality?: string; property_id?: string; created_at: string; status: string };
type CmsField = { id: string; field_key: string; label: string; field_type: "text" | "textarea" | "number" | "boolean" | "date" | "url"; required: boolean; sort_order: number };
type CmsProperty = { id: string; slug: string; name: string; category: string; locality: string; micro_market: string; location: string; price: string; configuration?: string; carpet_area_sqft?: number; image_url?: string; custom_fields?: Record<string, string | number | boolean>; status: string };

const categoryLabels: Record<string, string> = { residential: "Residential", commercial: "Commercial", "under-construction": "New launch" };
const apiBase = (process.env.NEXT_PUBLIC_API_URL || "https://api.chariotrealty.in").replace(/\/$/, "");

function apiUrl(path: string) {
  return `${apiBase}${path}`;
}

async function readJson(response: Response): Promise<Record<string, any>> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(response.ok ? "The API returned an invalid response." : `API request failed (${response.status}). Check the Chariot API deployment.`);
  }
  return response.json();
}

export default function AdminPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "forgot" | "update">("login");
  const [resetToken, setResetToken] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [leadStatus, setLeadStatus] = useState("new");
  const [leadError, setLeadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [whatsappStatus, setWhatsappStatus] = useState<{ connected?: boolean; connection_state?: string; phone_number?: string; broker_id?: string; qr?: string | null; pairing_code?: string; pairing_window_expires_at?: string; error?: string } | null>(null);
  const [whatsappError, setWhatsappError] = useState("");
  const [whatsappBusy, setWhatsappBusy] = useState(false);
  const [publishing, setPublishing] = useState("");
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ kind: "reset" | "remove"; title: string; message: string } | null>(null);
  const [cmsProperties, setCmsProperties] = useState<CmsProperty[]>([]);
  const [cmsFields, setCmsFields] = useState<CmsField[]>([]);
  const [cmsFieldDraft, setCmsFieldDraft] = useState({ label: "", field_type: "text", required: false });
  const [cmsFieldBusy, setCmsFieldBusy] = useState(false);
  const [cmsValues, setCmsValues] = useState<Record<string, string | number | boolean>>({});
  const [cmsForm, setCmsForm] = useState({ slug: "", name: "", category: "residential", locality: "Bandra West", micro_market: "Bandra West", location: "", price: "", configuration: "", carpet_area_sqft: "", image_url: "" });
  const [cmsBusy, setCmsBusy] = useState(false);
  const [cmsError, setCmsError] = useState("");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentReply, setAgentReply] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentError, setAgentError] = useState("");

  function showToast(message: string, tone: "success" | "error" = "success") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4200);
  }

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryReset = new URLSearchParams(window.location.search).get("reset");
    if (hash.get("access_token") && (hash.get("type") === "recovery" || queryReset)) { setResetToken(hash.get("access_token") || ""); setAuthMode("update"); window.history.replaceState({}, "", "/admin?reset=1"); }
    const saved = window.localStorage.getItem("chariot_supabase_session") || window.sessionStorage.getItem("chariot_supabase_session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.access_token) setAuthToken(session.access_token);
      } catch { window.localStorage.removeItem("chariot_supabase_session"); }
    }
    setAuthReady(true);
    Promise.all([fetch(apiUrl("/api/properties")).then(readJson), fetch(apiUrl("/api/markets")).then(readJson)])
      .then(([propertyData, marketData]) => { setProperties(propertyData.data || []); setMarkets(marketData.data || []); })
      .finally(() => setLoading(false));
  }, []);

  const filteredProperties = useMemo(() => properties.filter((property) => `${property.name} ${property.locality} ${property.category}`.toLowerCase().includes(query.toLowerCase())), [properties, query]);
  const authHeaders = (): Record<string, string> => authToken ? { Authorization: `Bearer ${authToken}` } : {};
  function saveSession(session: Record<string, any>) {
    const serialized = JSON.stringify(session);
    window.localStorage.removeItem("chariot_supabase_session");
    window.sessionStorage.removeItem("chariot_supabase_session");
    (keepSignedIn ? window.localStorage : window.sessionStorage).setItem("chariot_supabase_session", serialized);
    setAuthToken(session.access_token || "");
  }

  async function refreshSession() {
    const saved = window.localStorage.getItem("chariot_supabase_session") || window.sessionStorage.getItem("chariot_supabase_session");
    if (!saved) return false;
    try {
      const session = JSON.parse(saved);
      if (!session.refresh_token) return false;
      const response = await fetch(apiUrl("/api/auth/login"), { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ refresh_token: session.refresh_token }) });
      if (!response.ok) return false;
      const refreshed = await readJson(response);
      saveSession(refreshed);
      return Boolean(refreshed.access_token);
    } catch { return false; }
  }

  async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    let response = await fetch(input, { ...init, headers: { ...authHeaders(), ...(init.headers || {}) } });
    if (response.status === 401) {
      if (await refreshSession()) {
        response = await fetch(input, { ...init, headers: { ...authHeaders(), ...(init.headers || {}) } });
      }
      if (response.status === 401) {
        window.localStorage.removeItem("chariot_supabase_session");
        window.sessionStorage.removeItem("chariot_supabase_session");
        setAuthToken(""); setWhatsappStatus(null); setLeads([]);
        setAuthError("Your secure session expired. Please sign in again.");
      }
    }
    return response;
  }

  async function login(event: FormEvent) {
    event.preventDefault(); setAuthError(""); setAuthLoading(true);
    try {
      const response = await fetch(apiUrl("/api/auth/login"), { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email: authEmail, password: authPassword }) });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not sign in");
      saveSession(payload);
      setAuthPassword("");
    } catch (error) { setAuthError(error instanceof Error ? error.message : "Could not sign in"); }
    finally { setAuthLoading(false); }
  }

  async function requestPasswordReset(event: FormEvent) { event.preventDefault(); setAuthError(""); setAuthLoading(true); try { const response = await fetch(apiUrl("/api/auth/reset"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request", email: authEmail }) }); const payload = await readJson(response); if (!response.ok) throw new Error(payload.error || "Could not send reset email"); setResetMessage("If that email belongs to Chariot, a reset link is on its way."); } catch (error) { setAuthError(error instanceof Error ? error.message : "Could not send reset email"); } finally { setAuthLoading(false); } }
  async function updatePassword(event: FormEvent) { event.preventDefault(); setAuthError(""); setAuthLoading(true); const form = new FormData(event.currentTarget as HTMLFormElement); const password = String(form.get("new_password") || ""); const confirm = String(form.get("confirm_password") || ""); if (password !== confirm) { setAuthError("Passwords do not match"); setAuthLoading(false); return; } try { const response = await fetch(apiUrl("/api/auth/reset"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", access_token: resetToken, password }) }); const payload = await readJson(response); if (!response.ok) throw new Error(payload.error || "Could not update password"); setAuthMode("login"); setResetMessage("Password updated. You can sign in now."); window.history.replaceState({}, "", "/admin"); } catch (error) { setAuthError(error instanceof Error ? error.message : "Could not update password"); } finally { setAuthLoading(false); } }

  function logout() {
    window.localStorage.removeItem("chariot_supabase_session");
    window.sessionStorage.removeItem("chariot_supabase_session");
    setAuthToken(""); setLeads([]); setWhatsappStatus(null);
  }

  async function loadLeads(event?: FormEvent) {
    event?.preventDefault();
    setLeadError("");
    const response = await authenticatedFetch(apiUrl(`/api/leads/list?status=${leadStatus}`));
    const payload = await readJson(response);
    if (!response.ok) return setLeadError(payload.error || "Could not load leads");
    setLeads(payload.data || []);
  }

  async function loadCmsInventory() { const [inventoryResponse, fieldsResponse] = await Promise.all([authenticatedFetch(apiUrl("/api/inventory?admin=1")), authenticatedFetch(apiUrl("/api/inventory/fields"))]); const payload = await readJson(inventoryResponse); const fieldsPayload = await readJson(fieldsResponse); if (!inventoryResponse.ok) setCmsError(payload.error || "Could not load CMS inventory"); setCmsProperties(payload.data || []); setCmsFields(fieldsPayload.data || []); }
  async function createCmsField() { if (!cmsFieldDraft.label.trim()) return; setCmsFieldBusy(true); setCmsError(""); try { const response = await authenticatedFetch(apiUrl("/api/inventory/fields"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cmsFieldDraft) }); const payload = await readJson(response); if (!response.ok) throw new Error(payload.error || "Could not add field"); setCmsFields((items) => [...items, payload.data]); setCmsFieldDraft({ label: "", field_type: "text", required: false }); } catch (error) { setCmsError(error instanceof Error ? error.message : "Could not add field"); } finally { setCmsFieldBusy(false); } }
  async function createCmsProperty(event: FormEvent) { event.preventDefault(); setCmsBusy(true); setCmsError(""); try { const response = await authenticatedFetch(apiUrl("/api/inventory"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cmsForm, custom_fields: cmsValues, carpet_area_sqft: cmsForm.carpet_area_sqft ? Number(cmsForm.carpet_area_sqft) : null }) }); const payload = await readJson(response); if (!response.ok) throw new Error(payload.error || "Could not create property"); setCmsProperties((items) => [payload.data, ...items]); setCmsValues({}); setCmsForm({ slug: "", name: "", category: "residential", locality: "Bandra West", micro_market: "Bandra West", location: "", price: "", configuration: "", carpet_area_sqft: "", image_url: "" }); } catch (error) { setCmsError(error instanceof Error ? error.message : "Could not create property"); } finally { setCmsBusy(false); } }
  async function setCmsStatus(id: string, status: string) { const response = await authenticatedFetch(apiUrl(`/api/inventory/${id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); const payload = await readJson(response); if (!response.ok) return setCmsError(payload.error || "Could not update property"); setCmsProperties((items) => items.map((item) => item.id === id ? { ...item, status } : item)); }

  async function loadWhatsapp() {
    setWhatsappError("");
    const response = await authenticatedFetch(apiUrl("/api/whatsapp/status"));
    const payload = await readJson(response);
    if (!response.ok) return setWhatsappError(payload.error || "Could not read WhatsApp status");
    setWhatsappStatus(payload.status || null);
    return payload.status || null;
  }

  useEffect(() => {
    if (authToken) { loadWhatsapp(); loadCmsInventory(); }
  }, [authToken]);

  async function connectWhatsapp() {
    setWhatsappError("");
    const response = await authenticatedFetch(apiUrl("/api/whatsapp/connect"), { method: "POST" });
    const payload = await readJson(response);
    if (!response.ok) { showToast(payload.error || "Could not start WhatsApp connection", "error"); return setWhatsappError(payload.error || "Could not start WhatsApp connection"); }
    await loadWhatsapp();
    showToast("WhatsApp connection refreshed");
  }

  async function disconnectWhatsapp() {
    setWhatsappBusy(true); setWhatsappError("");
    try {
      const response = await authenticatedFetch(apiUrl("/api/whatsapp/disconnect"), { method: "POST" });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not disconnect WhatsApp");
      await loadWhatsapp();
      showToast("WhatsApp disconnected");
    } catch (error) { const message = error instanceof Error ? error.message : "Could not disconnect WhatsApp"; showToast(message, "error"); setWhatsappError(message); }
    finally { setWhatsappBusy(false); }
  }

  function removeWhatsapp() {
    setConfirmDialog({ kind: "remove", title: "Remove WhatsApp number?", message: "This removes the saved WhatsMeow device session. You will need a new pairing code to use this number again." });
  }

  async function performRemoveWhatsapp() {
    setWhatsappBusy(true); setWhatsappError("");
    try {
      const response = await authenticatedFetch(apiUrl("/api/whatsapp/remove"), { method: "POST" });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not remove WhatsApp number");
      setWhatsappStatus(null);
      showToast("WhatsApp number removed");
    } catch (error) { const message = error instanceof Error ? error.message : "Could not remove WhatsApp number"; showToast(message, "error"); setWhatsappError(message); }
    finally { setWhatsappBusy(false); }
  }

  async function pairWhatsapp() {
    setWhatsappBusy(true); setWhatsappError("");
    try {
      if (whatsappStatus?.connected) throw new Error("WhatsApp is already connected. Pairing is only needed after disconnecting the device.");
      const response = await authenticatedFetch(apiUrl("/api/whatsapp/pair"), { method: "POST" });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not start WhatsApp pairing");
      await waitForPairingCode();
    } catch (error) { setWhatsappError(error instanceof Error ? error.message : "Could not start WhatsApp pairing"); }
    finally { setWhatsappBusy(false); }
  }

  async function waitForPairingCode() {
    for (let attempt = 0; attempt < 45; attempt += 1) {
      const status = await loadWhatsapp();
      if (status?.pairing_code || status?.connected || status?.connection_state === "pairing_error") return;
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
    setWhatsappError("WhatsApp did not return a pairing code within 45 seconds. Click Refresh status or try again.");
  }

  function resetAndPairWhatsapp() {
    setConfirmDialog({ kind: "reset", title: "Reset and re-pair WhatsApp?", message: "This unlinks the current WhatsMeow device and starts a new pairing flow. Keep this page open for the pairing code." });
  }

  async function performResetAndPairWhatsapp() {
    setWhatsappBusy(true); setWhatsappError("");
    try {
      const resetResponse = await authenticatedFetch(apiUrl("/api/whatsapp/reset"), { method: "POST" });
      const resetPayload = await readJson(resetResponse);
      if (!resetResponse.ok) throw new Error(resetPayload.error || "Could not reset WhatsMeow device");
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      const pairResponse = await authenticatedFetch(apiUrl("/api/whatsapp/pair"), { method: "POST" });
      const pairPayload = await readJson(pairResponse);
      if (!pairResponse.ok) throw new Error(pairPayload.error || "Could not start WhatsMeow pairing");
      await waitForPairingCode();
      showToast("Pairing flow started");
    } catch (error) { const message = error instanceof Error ? error.message : "WhatsMeow pairing failed"; showToast(message, "error"); setWhatsappError(message); }
    finally { setWhatsappBusy(false); }
  }

  async function confirmDestructiveAction() {
    const action = confirmDialog?.kind;
    setConfirmDialog(null);
    if (action === "reset") await performResetAndPairWhatsapp();
    if (action === "remove") await performRemoveWhatsapp();
  }

  async function publishListing(propertyId: string) {
    if (!window.confirm("Post this Chariot-owned listing and image to your WhatsApp self-chat?")) return;
    setPublishing(propertyId); setWhatsappError("");
    const response = await authenticatedFetch(apiUrl("/api/whatsapp/publish"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId, confirm: true }) });
    const payload = await readJson(response);
    if (!response.ok) setWhatsappError(payload.error || "Could not publish listing");
    setPublishing("");
  }

  async function askBrokerAgent(event: FormEvent) {
    event.preventDefault();
    const text = agentPrompt.trim();
    if (!text || agentBusy) return;
    setAgentBusy(true); setAgentError(""); setAgentReply("");
    try {
      const response = await authenticatedFetch(apiUrl("/api/agent/chat"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "The broker agent could not answer");
      setAgentReply(String(payload.reply || "The agent returned no answer."));
    } catch (error) { setAgentError(error instanceof Error ? error.message : "The broker agent could not answer"); }
    finally { setAgentBusy(false); }
  }

  if (!authReady) return <main className="admin-shell"><div className="auth-card"><p className="eyebrow">Chariot Realty · Private desk</p><h1>Loading secure workspace…</h1></div></main>;
  if (!authToken) return <main className="admin-shell auth-shell"><form className="auth-card" onSubmit={authMode === "login" ? login : authMode === "forgot" ? requestPasswordReset : updatePassword}><p className="eyebrow">Chariot Realty · Mumbai</p><h1>{authMode === "login" ? "Owner login" : authMode === "forgot" ? "Reset password" : "Choose a new password"}</h1><p className="admin-muted">{authMode === "login" ? "Sign in with your Supabase account to open the private market desk." : authMode === "forgot" ? "We’ll email a secure reset link to your Chariot account." : "Set a new password for your Chariot account."}</p>{authMode !== "update" && <label>Email<input type="email" autoComplete="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required /></label>}{authMode === "login" && <><label>Password<input type="password" autoComplete="current-password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required /></label><label className="auth-remember"><input type="checkbox" checked={keepSignedIn} onChange={(event) => setKeepSignedIn(event.target.checked)} /> Keep me signed in on this device</label></>}{authMode === "update" && <><label>New password<input name="new_password" type="password" autoComplete="new-password" minLength={8} required /></label><label>Confirm password<input name="confirm_password" type="password" autoComplete="new-password" minLength={8} required /></label></>}{resetMessage && <p className="success-note">{resetMessage}</p>}{authError && <p className="error-note">{authError}</p>}<button type="submit" className="dark-button auth-submit" disabled={authLoading}>{authLoading ? "Please wait…" : authMode === "login" ? "Sign in securely" : authMode === "forgot" ? "Email reset link" : "Update password"}</button>{authMode === "login" && <button type="button" className="auth-text-button" onClick={() => { setAuthMode("forgot"); setAuthError(""); }}>Forgot password?</button>}{authMode !== "login" && authMode !== "update" && <button type="button" className="auth-text-button" onClick={() => { setAuthMode("login"); setResetMessage(""); }}>← Back to sign in</button>}<a href="/" className="back-link auth-back">← Public site</a></form></main>;

  return (
    <main className="admin-shell">
      {toast && <div className={`app-toast ${toast.tone}`} role="status"><span>{toast.tone === "success" ? "✓" : "!"}</span>{toast.message}</div>}
      {confirmDialog && <div className="confirm-backdrop" role="presentation"><div className="confirm-card" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><p className="eyebrow">WhatsApp control</p><h2 id="confirm-title">{confirmDialog.title}</h2><p>{confirmDialog.message}</p><div className="confirm-actions"><button type="button" className="light-button" onClick={() => setConfirmDialog(null)}>Cancel</button><button type="button" className="danger-button" onClick={confirmDestructiveAction}>Continue</button></div></div></div>}
      <header className="admin-header"><div><p className="eyebrow">Chariot Realty · Mumbai</p><h1>Market desk</h1><p className="admin-muted">Your daily view of Bandra, BKC and the western suburbs.</p></div><div className="header-actions"><span className="signed-in">Supabase secured</span><button type="button" className="back-link" onClick={logout}>Sign out</button><a href="/" className="back-link">← Public site</a></div></header>
      <section className="metric-grid"><div className="metric-card"><span>Live inventory</span><strong>{loading ? "—" : properties.length}</strong><small>verified opportunities</small></div><div className="metric-card"><span>Micro-markets</span><strong>{markets.length || "—"}</strong><small>local knowledge hubs</small></div><div className="metric-card accent"><span>Focus area</span><strong>BKC</strong><small>high-intent demand zone</small></div></section>
      <section className="admin-section whatsapp-studio"><div className="section-title"><div><p className="eyebrow">Private publishing</p><h2>WhatsApp self-chat studio</h2><p className="admin-muted">Send your listing details and images from WhatsApp self-chat. Confirmed posts will appear on the public website.</p></div></div><div className="whatsapp-status"><span className={`status-dot ${whatsappStatus?.connected ? "live" : ""}`} />{whatsappStatus?.connected ? `Connected${whatsappStatus.connection_state ? ` · ${whatsappStatus.connection_state}` : ""}` : whatsappStatus?.error || "Private gateway status not checked"}</div><div className="whatsapp-controls"><div><span>Engine</span><strong>WhatsMeow · PropAI gateway</strong></div><div><span>Phone</span><strong>{whatsappStatus?.phone_number || "Not paired"}</strong></div><div><span>Broker</span><strong>{whatsappStatus?.broker_id || "chariot-realty"}</strong></div><div className="whatsapp-control-actions"><button type="button" className="dark-button" onClick={loadWhatsapp} disabled={whatsappBusy}>Refresh status</button><button type="button" className="light-button" onClick={connectWhatsapp} disabled={whatsappBusy || whatsappStatus?.connected}>Reconnect WhatsApp</button><button type="button" className="light-button" onClick={pairWhatsapp} disabled={whatsappBusy || whatsappStatus?.connected}>{whatsappStatus?.connected ? "Pairing after reset" : whatsappBusy ? "Waiting for code…" : "Request pairing code"}</button><button type="button" className="danger-button" onClick={resetAndPairWhatsapp} disabled={whatsappBusy}>{whatsappBusy ? "Waiting for code…" : "Reset & re-pair"}</button><button type="button" className="danger-button" onClick={disconnectWhatsapp} disabled={whatsappBusy || !whatsappStatus?.connected}>Disconnect</button><button type="button" className="danger-button" onClick={removeWhatsapp} disabled={whatsappBusy}>Remove number</button></div></div>{whatsappBusy && !whatsappStatus?.connected && !whatsappStatus?.pairing_code && <div className="pairing-panel"><p className="pairing-note">WhatsMeow is connecting securely. The pairing code will appear here automatically—keep this page open.</p></div>}{whatsappStatus?.pairing_code && <div className="pairing-panel"><p className="pairing-note">Enter this WhatsApp pairing code on the phone: WhatsApp → Linked devices → Link with phone number.</p><strong className="pairing-code">{whatsappStatus.pairing_code}</strong></div>}{whatsappStatus?.qr && <div className="pairing-panel"><p className="pairing-note">WhatsApp is waiting for pairing. Scan this QR from the PropAI WhatsMeow gateway.</p><code>{whatsappStatus.qr}</code></div>}{whatsappError && <p className="error-note">{whatsappError}</p>}<div className="empty-panel"><span className="empty-orb">✦</span><div><strong>Publishing is controlled from your WhatsApp self-chat.</strong><p>Send the property text and photos there, review the draft, then reply “post it” to publish it on Chariot Realty.</p></div></div></section>
      <section className="admin-section agent-studio"><div className="section-title"><div><p className="eyebrow">Kapil’s private agent</p><h2>Ask PropAI anything</h2><p className="admin-muted">Searches Kapil’s PropAI workspace, group evidence, extracted inventory, and saved broker context. Sending or publishing still requires confirmation.</p></div></div><form className="agent-form" onSubmit={askBrokerAgent}><textarea value={agentPrompt} onChange={(event) => setAgentPrompt(event.target.value)} placeholder="Try: Find new BKC listings under ₹8 crore from my groups" rows={3} disabled={agentBusy} /><button type="submit" className="dark-button" disabled={agentBusy || !agentPrompt.trim()}>{agentBusy ? "Thinking…" : "Ask agent"}</button></form>{agentError && <p className="error-note">{agentError}</p>}{agentReply && <div className="agent-reply"><strong>PropAI agent</strong><p>{agentReply}</p></div>}<div className="agent-capabilities"><span>Group search</span><span>Listing extraction</span><span>Broker memory</span><span>Draft before action</span></div></section>
      <section className="admin-section"><div className="section-title"><div><p className="eyebrow">Inventory control</p><h2>Current opportunities</h2></div><input aria-label="Search inventory" placeholder="Search locality or property" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="property-table"><div className="table-head"><span>Property</span><span>Market</span><span>Type</span><span>Ask</span></div>{filteredProperties.map((property) => <div className="table-row" key={property.id}><div><strong>{property.name}</strong><small>{property.configuration || "Commercial"} · {property.carpetAreaSqft.toLocaleString()} sqft</small></div><span>{property.locality}</span><span className="pill">{categoryLabels[property.category] || property.category}</span><strong className="bronze-text">{property.price}</strong></div>)}{!loading && !filteredProperties.length && <p className="empty-state">No Mumbai opportunities match that search.</p>}</div></section>
      <section className="admin-section cms-section"><div className="section-title"><div><p className="eyebrow">Chariot CMS</p><h2>Kapil’s inventory</h2><p className="admin-muted">Create a draft, add an image URL or uploaded image, then approve and publish it to the website.</p></div></div><div className="cms-field-builder"><div><strong>Custom fields</strong><small>Add fields such as RERA number, furnishing, floor, brokerage or possession.</small></div><div className="cms-field-controls"><input aria-label="New field label" placeholder="Field name (e.g. Furnishing)" value={cmsFieldDraft.label} onChange={(e) => setCmsFieldDraft({ ...cmsFieldDraft, label: e.target.value })} /><select aria-label="New field type" value={cmsFieldDraft.field_type} onChange={(e) => setCmsFieldDraft({ ...cmsFieldDraft, field_type: e.target.value })}><option value="text">Text</option><option value="textarea">Long text</option><option value="number">Number</option><option value="boolean">Yes / No</option><option value="date">Date</option><option value="url">URL</option></select><label className="cms-required"><input type="checkbox" checked={cmsFieldDraft.required} onChange={(e) => setCmsFieldDraft({ ...cmsFieldDraft, required: e.target.checked })} /> Required</label><button type="button" className="light-button" onClick={createCmsField} disabled={cmsFieldBusy || !cmsFieldDraft.label.trim()}>{cmsFieldBusy ? "Adding…" : "+ Add field"}</button></div>{cmsFields.length > 0 && <div className="cms-field-chips">{cmsFields.map((field) => <span key={field.id}>{field.label}<small>{field.field_type}</small></span>)}</div>}</div><form className="cms-form" onSubmit={createCmsProperty}><input placeholder="Property name" value={cmsForm.name} onChange={(e) => setCmsForm({ ...cmsForm, name: e.target.value })} required /><input placeholder="Slug" value={cmsForm.slug} onChange={(e) => setCmsForm({ ...cmsForm, slug: e.target.value })} required /><input placeholder="Location" value={cmsForm.location} onChange={(e) => setCmsForm({ ...cmsForm, location: e.target.value })} required /><input placeholder="Price / ask" value={cmsForm.price} onChange={(e) => setCmsForm({ ...cmsForm, price: e.target.value })} required /><input placeholder="Configuration (e.g. 3 BHK)" value={cmsForm.configuration} onChange={(e) => setCmsForm({ ...cmsForm, configuration: e.target.value })} /><input placeholder="Carpet sqft" type="number" value={cmsForm.carpet_area_sqft} onChange={(e) => setCmsForm({ ...cmsForm, carpet_area_sqft: e.target.value })} /><input placeholder="Image URL (or upload API)" value={cmsForm.image_url} onChange={(e) => setCmsForm({ ...cmsForm, image_url: e.target.value })} />{cmsFields.map((field) => <label className="cms-custom-field" key={field.id}>{field.label}{field.field_type === "textarea" ? <textarea rows={2} required={field.required} value={String(cmsValues[field.field_key] ?? "")} onChange={(e) => setCmsValues({ ...cmsValues, [field.field_key]: e.target.value })} /> : field.field_type === "boolean" ? <input type="checkbox" checked={Boolean(cmsValues[field.field_key])} onChange={(e) => setCmsValues({ ...cmsValues, [field.field_key]: e.target.checked })} /> : <input type={field.field_type === "url" ? "url" : field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"} required={field.required} value={String(cmsValues[field.field_key] ?? "")} onChange={(e) => setCmsValues({ ...cmsValues, [field.field_key]: field.field_type === "number" ? Number(e.target.value) : e.target.value })} />}</label>)}<button type="submit" className="dark-button" disabled={cmsBusy}>{cmsBusy ? "Saving…" : "Save draft"}</button></form>{cmsError && <p className="error-note">{cmsError}</p>}<div className="cms-list">{cmsProperties.map((property) => <div className="cms-row" key={property.id}><div>{property.image_url && <img src={property.image_url} alt="" />}<strong>{property.name}</strong><small>{property.location} · {property.price}</small></div><span className="pill">{property.status}</span>{property.status !== "published" && <button type="button" className="light-button" onClick={() => setCmsStatus(property.id, "published")}>Publish to website</button>}</div>)}{!cmsProperties.length && <p className="empty-state">No database-backed inventory yet. The public site is using its safe static fallback until the migration is applied.</p>}</div></section>
      <section className="admin-section"><div className="section-title"><div><p className="eyebrow">Lead inbox</p><h2>New enquiries</h2></div><form onSubmit={loadLeads} className="key-form"><button type="submit" className="dark-button">Load leads</button></form></div>{leadError && <p className="error-note">{leadError}</p>}{leads.length ? <div className="lead-list">{leads.map((lead) => <div className="lead-row" key={lead.id}><div><strong>{lead.name}</strong><small>{lead.phone} · {lead.locality || "Mumbai"}</small></div><span className="pill">{lead.intent}</span><time>{new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</time></div>)}</div> : <div className="empty-panel"><span className="empty-orb">✦</span><div><strong>Your lead inbox is private.</strong><p>Load new Mumbai enquiries from the website.</p></div></div>}</section>
      <section className="admin-section markets-section"><div className="section-title"><div><p className="eyebrow">Local intelligence</p><h2>Know the neighbourhoods</h2></div></div><div className="market-grid">{markets.map((market) => <article className="market-card" key={market.name}><span className="market-dot" /><h3>{market.name}</h3><p>{market.positioning}</p><small>{market.transit.join(" · ")}</small></article>)}</div></section>
      <footer className="admin-footer"><span>Chariot Realty · Mumbai operations</span><span>Built for quick decisions, from Bandra to BKC.</span></footer>
    </main>
  );
}
