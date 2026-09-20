"use client";

import { FormEvent, useState } from "react";
import { readJson } from "../lib/api";
import type { Lead } from "../lib/types";
import type { AdminApi } from "../hooks/use-admin-auth";
import { EmptyPanel, Note, Panel, PanelHead, Pill } from "./ui";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "follow_up", label: "Follow up" },
  { value: "converted", label: "Converted" },
  { value: "closed", label: "Closed" },
];

export function LeadsTab({ api }: { api: AdminApi }) {
  const [status, setStatus] = useState("new");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState("");

  async function load(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const path = status ? `/api/leads/list?status=${encodeURIComponent(status)}` : "/api/leads/list";
      const response = await api.get(path);
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not load leads");
      setLeads(payload.data || []);
      setLoadedOnce(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load leads");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tab-stack">
      <Panel>
        <PanelHead
          eyebrow="Lead inbox"
          title="Enquiries"
          subtitle="Load enquiries that came in from the website."
          actions={
            <form className="load-form" onSubmit={load}>
              <select className="select" aria-label="Lead status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button type="submit" className="btn btn-dark" disabled={loading}>{loading ? "Loading…" : "Load leads"}</button>
            </form>
          }
        />
        {error && <Note tone="error">{error}</Note>}
        {leads.length ? (
          <div className="row-list">
            {leads.map((lead) => (
              <div className="row-item" key={lead.id}>
                <div className="row-main">
                  <strong>{lead.name}</strong>
                  <small>{lead.phone}{lead.locality ? ` · ${lead.locality}` : " · Mumbai"}</small>
                </div>
                <Pill>{lead.intent}</Pill>
                <time className="row-time">{new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</time>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel title="Your lead inbox is private.">{loadedOnce ? "No enquiries match that filter yet." : "Load new Mumbai enquiries from the website."}</EmptyPanel>
        )}
      </Panel>
    </div>
  );
}