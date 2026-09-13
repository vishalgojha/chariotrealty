"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Property = { id: string; name: string; category: string; locality: string; price: string; carpetAreaSqft: number; configuration?: string; status: string };
type Market = { name: string; positioning: string; transit: string[] };
type Lead = { id: string; name: string; phone: string; intent: string; locality?: string; property_id?: string; created_at: string; status: string };

const categoryLabels: Record<string, string> = { residential: "Residential", commercial: "Commercial", "under-construction": "New launch" };

export default function AdminPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [leadStatus, setLeadStatus] = useState("new");
  const [leadError, setLeadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/properties").then((r) => r.json()), fetch("/api/markets").then((r) => r.json())])
      .then(([propertyData, marketData]) => { setProperties(propertyData.data || []); setMarkets(marketData.data || []); })
      .finally(() => setLoading(false));
  }, []);

  const filteredProperties = useMemo(() => properties.filter((property) => `${property.name} ${property.locality} ${property.category}`.toLowerCase().includes(query.toLowerCase())), [properties, query]);

  async function loadLeads(event?: FormEvent) {
    event?.preventDefault();
    setLeadError("");
    const response = await fetch(`/api/leads/list?status=${leadStatus}`, { headers: { "x-admin-key": adminKey } });
    const payload = await response.json();
    if (!response.ok) return setLeadError(payload.error || "Could not load leads");
    setLeads(payload.data || []);
  }

  return (
    <main className="admin-shell">
      <header className="admin-header"><div><p className="eyebrow">Chariot Realty · Mumbai</p><h1>Market desk</h1><p className="admin-muted">Your daily view of Bandra, BKC and the western suburbs.</p></div><a href="/" className="back-link">← Public site</a></header>
      <section className="metric-grid"><div className="metric-card"><span>Live inventory</span><strong>{loading ? "—" : properties.length}</strong><small>verified opportunities</small></div><div className="metric-card"><span>Micro-markets</span><strong>{markets.length || "—"}</strong><small>local knowledge hubs</small></div><div className="metric-card accent"><span>Focus area</span><strong>BKC</strong><small>high-intent demand zone</small></div></section>
      <section className="admin-section"><div className="section-title"><div><p className="eyebrow">Inventory control</p><h2>Current opportunities</h2></div><input aria-label="Search inventory" placeholder="Search locality or property" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="property-table"><div className="table-head"><span>Property</span><span>Market</span><span>Type</span><span>Ask</span></div>{filteredProperties.map((property) => <div className="table-row" key={property.id}><div><strong>{property.name}</strong><small>{property.configuration || "Commercial"} · {property.carpetAreaSqft.toLocaleString()} sqft</small></div><span>{property.locality}</span><span className="pill">{categoryLabels[property.category] || property.category}</span><strong className="bronze-text">{property.price}</strong></div>)}{!loading && !filteredProperties.length && <p className="empty-state">No Mumbai opportunities match that search.</p>}</div></section>
      <section className="admin-section"><div className="section-title"><div><p className="eyebrow">Lead inbox</p><h2>New enquiries</h2></div><form onSubmit={loadLeads} className="key-form"><input type="password" aria-label="Admin key" placeholder="Admin key" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} /><button type="submit" className="dark-button">Load leads</button></form></div>{leadError && <p className="error-note">{leadError}</p>}{leads.length ? <div className="lead-list">{leads.map((lead) => <div className="lead-row" key={lead.id}><div><strong>{lead.name}</strong><small>{lead.phone} · {lead.locality || "Mumbai"}</small></div><span className="pill">{lead.intent}</span><time>{new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</time></div>)}</div> : <div className="empty-panel"><span className="empty-orb">✦</span><div><strong>Your lead inbox is private.</strong><p>Enter the admin key to view new Mumbai enquiries from the website.</p></div></div>}</section>
      <section className="admin-section markets-section"><div className="section-title"><div><p className="eyebrow">Local intelligence</p><h2>Know the neighbourhoods</h2></div></div><div className="market-grid">{markets.map((market) => <article className="market-card" key={market.name}><span className="market-dot" /><h3>{market.name}</h3><p>{market.positioning}</p><small>{market.transit.join(" · ")}</small></article>)}</div></section>
      <footer className="admin-footer"><span>Chariot Realty · Mumbai operations</span><span>Built for quick decisions, from Bandra to BKC.</span></footer>
    </main>
  );
}
