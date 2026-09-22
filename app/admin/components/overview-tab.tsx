"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl, readJson } from "../lib/api";
import { CATEGORY_LABELS, type Market, type Property, type TabId } from "../lib/types";
import { MetricCard, Panel, PanelHead, Pill } from "./ui";
import type { AdminApi } from "../hooks/use-admin-auth";

type Briefing = {
  counts: { new_leads: number; due_follow_ups: number; stale_inventory: number };
  new_leads: Array<{ id: string; name: string; intent: string; locality?: string; priority?: string }>;
  due_follow_ups: Array<{ id: string; name: string; locality?: string; next_follow_up_at?: string }>;
  stale_inventory: Array<{ id: string; name: string; locality?: string; status?: string }>;
};

export function OverviewTab({ go, api }: { go: (tab: TabId) => void; api: AdminApi }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [briefing, setBriefing] = useState<Briefing | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetch(apiUrl("/api/properties")).then(readJson), fetch(apiUrl("/api/markets")).then(readJson), api.get("/api/briefing").then(readJson)])
      .then(([propertyData, marketData, briefingData]) => {
        if (!active) return;
        setProperties(propertyData.data || []);
        setMarkets(marketData.data || []);
        setBriefing(briefingData as Briefing);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api]);

  const filtered = useMemo(
    () => properties.filter((property) => `${property.name} ${property.locality} ${property.category}`.toLowerCase().includes(query.toLowerCase())),
    [properties, query],
  );

  return (
    <div className="tab-stack">
      <div className="metric-row">
        <MetricCard label="Live inventory" value={loading ? "—" : properties.length} hint="verified opportunities" />
        <MetricCard label="Micro-markets" value={markets.length || "—"} hint="local knowledge hubs" />
        <MetricCard label="Published listings" value={loading ? "—" : properties.filter((p) => p.status === "published" || !p.status).length} hint="live on the website" />
        <MetricCard label="Focus area" value="BKC" hint="high-intent demand zone" accent />
      </div>

      {briefing && (
        <Panel className="briefing-panel">
          <PanelHead eyebrow="Today" title="Broker briefing" subtitle="The actions most likely to move opportunities forward." />
          <div className="briefing-counts">
            <button type="button" onClick={() => go("leads")}><strong>{briefing.counts.due_follow_ups}</strong><span>Follow-ups due</span></button>
            <button type="button" onClick={() => go("leads")}><strong>{briefing.counts.new_leads}</strong><span>New enquiries</span></button>
            <button type="button" onClick={() => go("inventory")}><strong>{briefing.counts.stale_inventory}</strong><span>Inventory checks</span></button>
          </div>
          <div className="briefing-columns">
            <div><h3>Priority actions</h3>{briefing.due_follow_ups.slice(0, 4).map((lead) => <p key={lead.id}><strong>{lead.name}</strong>{lead.locality ? ` · ${lead.locality}` : ""}</p>)}{!briefing.due_follow_ups.length && <p className="admin-muted">No follow-ups due.</p>}</div>
            <div><h3>New opportunities</h3>{briefing.new_leads.slice(0, 4).map((lead) => <p key={lead.id}><strong>{lead.name}</strong> · {lead.intent}{lead.locality ? ` · ${lead.locality}` : ""}</p>)}{!briefing.new_leads.length && <p className="admin-muted">No new enquiries in the last 24 hours.</p>}</div>
            <div><h3>Inventory checks</h3>{briefing.stale_inventory.slice(0, 4).map((property) => <p key={property.id}><strong>{property.name}</strong>{property.locality ? ` · ${property.locality}` : ""}</p>)}{!briefing.stale_inventory.length && <p className="admin-muted">No stale inventory flags.</p>}</div>
          </div>
        </Panel>
      )}

      <div className="quick-actions">
        <button type="button" className="quick-action" onClick={() => go("whatsapp")}>
          <span className="quick-icon">◌</span>
          <span>
            <strong>WhatsApp studio</strong>
            <small>Publish from your self-chat</small>
          </span>
        </button>
        <button type="button" className="quick-action" onClick={() => go("inventory")}>
          <span className="quick-icon">▤</span>
          <span>
            <strong>Kapil’s inventory</strong>
            <small>Draft, approve & publish listings</small>
          </span>
        </button>
        <button type="button" className="quick-action" onClick={() => go("leads")}>
          <span className="quick-icon">✉</span>
          <span>
            <strong>Enquiry inbox</strong>
            <small>New leads from the website</small>
          </span>
        </button>
      </div>

      <Panel>
        <PanelHead
          eyebrow="Inventory control"
          title="Current opportunities"
          actions={<input className="input" aria-label="Search inventory" placeholder="Search locality or property" value={query} onChange={(event) => setQuery(event.target.value)} />}
        />
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Property</th>
                <th>Market</th>
                <th>Type</th>
                <th className="align-right">Ask</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((property) => (
                <tr key={property.id}>
                  <td>
                    <strong className="tbl-name">{property.name}</strong>
                    <small className="tbl-sub">{property.configuration || "Commercial"} · {property.carpetAreaSqft.toLocaleString()} sqft</small>
                  </td>
                  <td>{property.locality}</td>
                  <td>{CATEGORY_LABELS[property.category] && <Pill>{CATEGORY_LABELS[property.category]}</Pill>}</td>
                  <td className="align-right bronze-text">{property.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !filtered.length && <p className="empty-state">No Mumbai opportunities match that search.</p>}
        </div>
      </Panel>
    </div>
  );
}
