"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl, readJson } from "../lib/api";
import { CATEGORY_LABELS, type Market, type Property, type TabId } from "../lib/types";
import { MetricCard, Panel, PanelHead, Pill } from "./ui";

export function OverviewTab({ go }: { go: (tab: TabId) => void }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([fetch(apiUrl("/api/properties")).then(readJson), fetch(apiUrl("/api/markets")).then(readJson)])
      .then(([propertyData, marketData]) => {
        if (!active) return;
        setProperties(propertyData.data || []);
        setMarkets(marketData.data || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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