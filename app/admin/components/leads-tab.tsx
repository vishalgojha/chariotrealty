"use client";

import { FormEvent, useMemo, useState } from "react";
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

  const dueLeads = useMemo(() => leads.filter((lead) => lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= new Date()).length, [leads]);

  async function updateLead(id: string, patch: Record<string, unknown>) {
    const response = await api.patch(`/api/leads/${id}`, patch);
    const payload = await readJson(response);
    if (!response.ok) throw new Error(payload.error || "Could not update lead");
    setLeads((items) => items.map((item) => item.id === id ? { ...item, ...payload.data } : item));
  }

  function localDateTime(value?: string | null) {
    if (!value) return "";
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

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
        {dueLeads > 0 && <Note tone="success">{dueLeads} follow-up{dueLeads === 1 ? "" : "s"} due now. Contact them before adding new opportunities.</Note>}
        {error && <Note tone="error">{error}</Note>}
        {leads.length ? (
          <div className="row-list">
            {leads.map((lead) => (
              <div className="row-item lead-row" key={lead.id}>
                <div className="row-main">
                  <strong>{lead.name}</strong>
                  <small>{lead.phone}{lead.locality ? ` · ${lead.locality}` : " · Mumbai"}</small>
                </div>
                <div className="lead-controls">
                  <select
                    className="select lead-control"
                    aria-label={`${lead.name} priority`}
                    value={lead.priority || "normal"}
                    onChange={(event) => updateLead(lead.id, { priority: event.target.value }).catch((e) => setError(e.message))}
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                  <select
                    className="select lead-control"
                    aria-label={`${lead.name} status`}
                    value={lead.status}
                    onChange={(event) => updateLead(lead.id, { status: event.target.value }).catch((e) => setError(e.message))}
                  >
                    {STATUS_OPTIONS.filter((option) => option.value).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <input
                    className="input lead-control lead-date"
                    type="datetime-local"
                    aria-label={`${lead.name} next follow-up`}
                    value={localDateTime(lead.next_follow_up_at)}
                    onChange={(event) => updateLead(lead.id, { next_follow_up_at: event.target.value ? new Date(event.target.value).toISOString() : null }).catch((e) => setError(e.message))}
                  />
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
