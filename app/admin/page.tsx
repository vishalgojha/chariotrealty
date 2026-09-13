"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Property = { id: string; name: string; category: string; locality: string; price: string; carpetAreaSqft: number; configuration?: string; status: string; image?: string };
type Market = { name: string; positioning: string; transit: string[] };
type Lead = { id: string; name: string; phone: string; intent: string; locality?: string; property_id?: string; created_at: string; status: string };

const categoryLabels: Record<string, string> = { residential: "Residential", commercial: "Commercial", "under-construction": "New launch" };

export default function AdminPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [leadStatus, setLeadStatus] = useState("new");
  const [leadError, setLeadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [whatsappStatus, setWhatsappStatus] = useState<{ connected?: boolean; connection_state?: string; qr?: string | null; pairing_code?: string; pairing_window_expires_at?: string; error?: string } | null>(null);
  const [whatsappError, setWhatsappError] = useState("");
  const [publishing, setPublishing] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("chariot_supabase_session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.access_token) setAuthToken(session.access_token);
      } catch { window.localStorage.removeItem("chariot_supabase_session"); }
    }
    setAuthReady(true);
    Promise.all([fetch("/api/properties").then((r) => r.json()), fetch("/api/markets").then((r) => r.json())])
      .then(([propertyData, marketData]) => { setProperties(propertyData.data || []); setMarkets(marketData.data || []); })
      .finally(() => setLoading(false));
  }, []);

  const filteredProperties = useMemo(() => properties.filter((property) => `${property.name} ${property.locality} ${property.category}`.toLowerCase().includes(query.toLowerCase())), [properties, query]);
  const authHeaders = (): Record<string, string> => authToken ? { Authorization: `Bearer ${authToken}` } : {};

  async function login(event: FormEvent) {
    event.preventDefault(); setAuthError(""); setAuthLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authEmail, password: authPassword }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not sign in");
      window.localStorage.setItem("chariot_supabase_session", JSON.stringify(payload));
      setAuthToken(payload.access_token); setAuthPassword("");
    } catch (error) { setAuthError(error instanceof Error ? error.message : "Could not sign in"); }
    finally { setAuthLoading(false); }
  }

  function logout() {
    window.localStorage.removeItem("chariot_supabase_session");
    setAuthToken(""); setLeads([]); setWhatsappStatus(null);
  }

  async function loadLeads(event?: FormEvent) {
    event?.preventDefault();
    setLeadError("");
    const response = await fetch(`/api/leads/list?status=${leadStatus}`, { headers: authHeaders() });
    const payload = await response.json();
    if (!response.ok) return setLeadError(payload.error || "Could not load leads");
    setLeads(payload.data || []);
  }

  async function loadWhatsapp() {
    setWhatsappError("");
    const response = await fetch("/api/whatsapp/status", { headers: authHeaders() });
    const payload = await response.json();
    if (!response.ok) return setWhatsappError(payload.error || "Could not read WhatsApp status");
    setWhatsappStatus(payload.status || null);
  }

  useEffect(() => {
    if (authToken) loadWhatsapp();
  }, [authToken]);

  async function connectWhatsapp() {
    setWhatsappError("");
    const response = await fetch("/api/whatsapp/connect", { method: "POST", headers: authHeaders() });
    const payload = await response.json();
    if (!response.ok) return setWhatsappError(payload.error || "Could not start WhatsApp connection");
    await loadWhatsapp();
  }

  async function pairWhatsapp() {
    setWhatsappError("");
    if (whatsappStatus?.connected) return setWhatsappError("WhatsApp is already connected. Pairing is only needed after disconnecting the device.");
    const response = await fetch("/api/whatsapp/pair", { method: "POST", headers: authHeaders() });
    const payload = await response.json();
    if (!response.ok) return setWhatsappError(payload.error || "Could not start WhatsApp pairing");
    await loadWhatsapp();
  }

  async function publishListing(propertyId: string) {
    if (!window.confirm("Post this Chariot-owned listing and image to your WhatsApp self-chat?")) return;
    setPublishing(propertyId); setWhatsappError("");
    const response = await fetch("/api/whatsapp/publish", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ propertyId, confirm: true }) });
    const payload = await response.json();
    if (!response.ok) setWhatsappError(payload.error || "Could not publish listing");
    setPublishing("");
  }

  if (!authReady) return <main className="admin-shell"><div className="auth-card"><p className="eyebrow">Chariot Realty · Private desk</p><h1>Loading secure workspace…</h1></div></main>;
  if (!authToken) return <main className="admin-shell auth-shell"><form className="auth-card" onSubmit={login}><p className="eyebrow">Chariot Realty · Mumbai</p><h1>Owner login</h1><p className="admin-muted">Sign in with your Supabase account to open the private market desk.</p><label>Email<input type="email" autoComplete="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required /></label>{authError && <p className="error-note">{authError}</p>}<button type="submit" className="dark-button auth-submit" disabled={authLoading}>{authLoading ? "Signing in…" : "Sign in securely"}</button><a href="/" className="back-link auth-back">← Public site</a></form></main>;

  return (
    <main className="admin-shell">
      <header className="admin-header"><div><p className="eyebrow">Chariot Realty · Mumbai</p><h1>Market desk</h1><p className="admin-muted">Your daily view of Bandra, BKC and the western suburbs.</p></div><div className="header-actions"><span className="signed-in">Supabase secured</span><button type="button" className="back-link" onClick={logout}>Sign out</button><a href="/" className="back-link">← Public site</a></div></header>
      <section className="metric-grid"><div className="metric-card"><span>Live inventory</span><strong>{loading ? "—" : properties.length}</strong><small>verified opportunities</small></div><div className="metric-card"><span>Micro-markets</span><strong>{markets.length || "—"}</strong><small>local knowledge hubs</small></div><div className="metric-card accent"><span>Focus area</span><strong>BKC</strong><small>high-intent demand zone</small></div></section>
      <section className="admin-section whatsapp-studio"><div className="section-title"><div><p className="eyebrow">Private publishing</p><h2>WhatsApp self-chat studio</h2><p className="admin-muted">Preview and post only Chariot-owned listings with their images.</p></div><div className="key-form"><button type="button" className="dark-button" onClick={loadWhatsapp}>Check connection</button><button type="button" className="light-button" disabled={whatsappStatus?.connected} onClick={pairWhatsapp}>{whatsappStatus?.connected ? "WhatsApp connected" : "Start pairing"}</button></div></div><div className="whatsapp-status"><span className={`status-dot ${whatsappStatus?.connected ? "live" : ""}`} />{whatsappStatus?.connected ? `Connected${whatsappStatus.connection_state ? ` · ${whatsappStatus.connection_state}` : ""}` : whatsappStatus?.error || "Private gateway status not checked"}</div>{whatsappStatus?.pairing_code && <div className="pairing-panel"><p className="pairing-note">Enter this WhatsApp pairing code on the phone: WhatsApp → Linked devices → Link with phone number.</p><strong className="pairing-code">{whatsappStatus.pairing_code}</strong></div>}{whatsappStatus?.qr && <div className="pairing-panel"><p className="pairing-note">WhatsApp is waiting for pairing. Scan this QR from the PropAI WhatsMeow gateway.</p><code>{whatsappStatus.qr}</code></div>}{whatsappError && <p className="error-note">{whatsappError}</p>}<div className="whatsapp-list">{properties.filter((property) => property.image).map((property) => <article className="whatsapp-card" key={property.id}><img src={property.image} alt="" /><div><strong>{property.name}</strong><small>{property.locality} · {property.price}</small></div><button type="button" className="dark-button" disabled={publishing === property.id} onClick={() => publishListing(property.id)}>{publishing === property.id ? "Posting…" : "Post to self-chat"}</button></article>)}</div></section>
      <section className="admin-section"><div className="section-title"><div><p className="eyebrow">Inventory control</p><h2>Current opportunities</h2></div><input aria-label="Search inventory" placeholder="Search locality or property" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="property-table"><div className="table-head"><span>Property</span><span>Market</span><span>Type</span><span>Ask</span></div>{filteredProperties.map((property) => <div className="table-row" key={property.id}><div><strong>{property.name}</strong><small>{property.configuration || "Commercial"} · {property.carpetAreaSqft.toLocaleString()} sqft</small></div><span>{property.locality}</span><span className="pill">{categoryLabels[property.category] || property.category}</span><strong className="bronze-text">{property.price}</strong></div>)}{!loading && !filteredProperties.length && <p className="empty-state">No Mumbai opportunities match that search.</p>}</div></section>
      <section className="admin-section"><div className="section-title"><div><p className="eyebrow">Lead inbox</p><h2>New enquiries</h2></div><form onSubmit={loadLeads} className="key-form"><button type="submit" className="dark-button">Load leads</button></form></div>{leadError && <p className="error-note">{leadError}</p>}{leads.length ? <div className="lead-list">{leads.map((lead) => <div className="lead-row" key={lead.id}><div><strong>{lead.name}</strong><small>{lead.phone} · {lead.locality || "Mumbai"}</small></div><span className="pill">{lead.intent}</span><time>{new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</time></div>)}</div> : <div className="empty-panel"><span className="empty-orb">✦</span><div><strong>Your lead inbox is private.</strong><p>Load new Mumbai enquiries from the website.</p></div></div>}</section>
      <section className="admin-section markets-section"><div className="section-title"><div><p className="eyebrow">Local intelligence</p><h2>Know the neighbourhoods</h2></div></div><div className="market-grid">{markets.map((market) => <article className="market-card" key={market.name}><span className="market-dot" /><h3>{market.name}</h3><p>{market.positioning}</p><small>{market.transit.join(" · ")}</small></article>)}</div></section>
      <footer className="admin-footer"><span>Chariot Realty · Mumbai operations</span><span>Built for quick decisions, from Bandra to BKC.</span></footer>
    </main>
  );
}
