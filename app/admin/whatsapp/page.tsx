"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "../hooks/use-admin-auth";
import { AuthGate } from "../components/auth-gate";
import { readJson } from "../lib/api";
import { EmptyPanel, Note, Panel, PanelHead, Pill } from "../components/ui";

const PAGE_SIZE = 50;

type RawMessage = {
  id: number;
  broker_id: string;
  group_name: string;
  sender: string;
  sender_phone: string;
  message: string;
  message_type: string;
  is_group: boolean;
  message_timestamp: string;
};

type Extraction = { id: number; table: string; status: string };

type StatusFilter = "" | "none" | "extracted";

function previewOf(message: RawMessage): string {
  const text = String(message.message || "");
  if (text) return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  return message.message_type && message.message_type !== "text" ? `[${message.message_type}]` : "—";
}

export default function WhatsappAdminPage() {
  const auth = useAdminAuth();
  const [messages, setMessages] = useState<RawMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [extractedMap, setExtractedMap] = useState<Record<string, Extraction[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [page, setPage] = useState(1);
  const [extracting, setExtracting] = useState(0);

  const load = useCallback(
    async (nextPage: number, nextQuery: string, nextStatus: StatusFilter) => {
      if (!auth.signedIn) return;
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String((nextPage - 1) * PAGE_SIZE));
      if (nextQuery) params.set("q", nextQuery);
      if (nextStatus) params.set("status", nextStatus);
      try {
        const response = await auth.api.get(`/api/admin/whatsapp/list?${params.toString()}`);
        const payload = await readJson(response);
        if (!response.ok) throw new Error(payload.error || "Could not load messages");
        setMessages(payload.messages || []);
        setTotal(payload.total || 0);
        setExtractedMap(payload.extractedMap || {});
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load messages");
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [auth.signedIn, auth.api],
  );

  useEffect(() => {
    if (auth.signedIn) load(page, query, status);
  }, [auth.signedIn, load, page, query, status]);

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setQuery(String(form.get("q") || "").trim());
    setStatus((String(form.get("status") || "") as StatusFilter) || "");
    setPage(1);
  }

  async function handleExtract(messageId: number) {
    if (extracting) return;
    setExtracting(messageId);
    setError("");
    try {
      const response = await auth.api.post("/api/admin/whatsapp/extract", { raw_message_id: messageId });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "Extraction failed");
      const table = payload.table ? ` in ${payload.table}` : "";
      alert(payload.already_extracted ? `Already extracted${table}.` : `Extracted${table}. Draft saved.`);
      load(page, query, status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setExtracting(0);
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  if (!auth.ready) {
    return (
      <main className="admin-splash">
        <img className="splash-logo-image" src="/apple-touch-icon.png" alt="Chariot Realty" />
        <p className="admin-eyebrow">Opening your private market desk…</p>
      </main>
    );
  }

  if (!auth.signedIn) return <AuthGate auth={auth} />;

  return (
    <div className="tab-stack">
      <Panel>
        <PanelHead
          eyebrow="Raw WhatsApp data"
          title="WhatsApp messages"
          subtitle="Every message captured by the live ingestor, from groups and direct chats. Extraction runs on demand and creates a private draft."
        />

        <form className="wa-filter-row" onSubmit={handleFilter}>
          <input
            type="search"
            name="q"
            placeholder="Search message, sender, or group…"
            defaultValue={query}
            className="input"
          />
          <select name="status" defaultValue={status} className="select">
            <option value="">All messages</option>
            <option value="none">Not extracted</option>
            <option value="extracted">Extracted</option>
          </select>
          <button type="submit" className="btn btn-dark">Filter</button>
          {query && (
            <button type="button" className="btn btn-light" onClick={() => { setQuery(""); setStatus(""); setPage(1); }}>
              Clear
            </button>
          )}
        </form>

        {error && <Note tone="error">{error}</Note>}

        {loading ? (
          <EmptyPanel title="Loading messages…">Fetching from the raw store.</EmptyPanel>
        ) : messages.length === 0 ? (
          <EmptyPanel title="No messages found.">
            Nothing matched this filter. Clear it to see the full capture.
          </EmptyPanel>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sender</th>
                  <th>Chat</th>
                  <th>Message</th>
                  <th>Extraction</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => {
                  const extractions = extractedMap[String(message.id)] || [];
                  const label = extractions.length
                    ? extractions.map((item) => `${item.table}: ${item.status || "draft"}`).join(", ")
                    : "Not extracted";
                  return (
                    <tr key={message.id}>
                      <td className="wa-when">{new Date(message.message_timestamp).toLocaleString()}</td>
                      <td>
                        <span className="tbl-name">{message.sender || "—"}</span>
                        {message.sender_phone && <span className="tbl-sub">{message.sender_phone}</span>}
                      </td>
                      <td className="wa-chat">
                        {message.is_group ? message.group_name : <span className="tbl-sub">Direct</span>}
                      </td>
                      <td className="wa-preview">{previewOf(message)}</td>
                      <td>
                        <Pill tone={extractions.length ? "live" : "neutral"}>{label}</Pill>
                      </td>
                      <td className="wa-actions-cell">
                        <button
                          type="button"
                          className="btn btn-dark btn-sm"
                          disabled={Boolean(extractions.length) || extracting === message.id}
                          onClick={() => handleExtract(message.id)}
                        >
                          {extracting === message.id
                            ? "Extracting…"
                            : extractions.length
                              ? "Viewed"
                              : "Extract"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-light btn-sm"
                          onClick={() => navigator.clipboard.writeText(String(message.id))}
                        >
                          Copy id
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="wa-pager">
            <button type="button" className="btn btn-light" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              ← Previous
            </button>
            <span>Page {page} of {totalPages} · {total.toLocaleString()} messages</span>
            <button
              type="button"
              className="btn btn-light"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}
