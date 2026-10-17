"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { AdminApi } from "../hooks/use-admin-auth";
import { readJson } from "../lib/api";
import { EmptyPanel, Note, Panel, PanelHead, Pill } from "./ui";
import type { Notify } from "./whatsapp-tab";

const PAGE_SIZE = 50;
const OWNER_PHONE_DIGITS = "919773757759";

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
  raw_payload?: unknown;
  attachments?: unknown;
};

type Extraction = { id: number; table: string; status: string };

type StatusFilter = "" | "none" | "extracted";

function textFromPayload(value: unknown, depth = 0, allowString = false): string {
  if (depth > 6 || value === null || value === undefined) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return textFromPayload(JSON.parse(trimmed), depth + 1);
      } catch {
        // It is ordinary message text, not JSON.
      }
    }
    return allowString ? trimmed : "";
  }
  if (Array.isArray(value)) {
    return value.map((item) => textFromPayload(item, depth + 1)).find(Boolean) || "";
  }
  if (typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  // Prefer fields that WhatsApp commonly uses for text and media captions.
  for (const key of ["conversation", "text", "message", "caption", "body", "content", "description"]) {
    const text = textFromPayload(record[key], depth + 1, true);
    if (text) return text;
  }
  for (const child of Object.values(record)) {
    const text = textFromPayload(child, depth + 1);
    if (text) return text;
  }
  return "";
}

function messageText(message: RawMessage): string {
  const normalized = String(message.message || "").trim();
  if (normalized) return normalized;
  return textFromPayload(message.raw_payload);
}

function messageFallback(message: RawMessage): string {
  const text = messageText(message);
  if (text) return text;
  if (message.raw_payload && typeof message.raw_payload === "object" && Object.keys(message.raw_payload).length) {
    return JSON.stringify(message.raw_payload, null, 2);
  }
  if (Array.isArray(message.attachments) && message.attachments.length) {
    return JSON.stringify(message.attachments, null, 2);
  }
  return `[${message.message_type || "message"}]`;
}

function previewOf(message: RawMessage): string {
  const text = messageText(message);
  if (text) return text.length > 160 ? `${text.slice(0, 160)}…` : text;
  if (Array.isArray(message.attachments) && message.attachments.length) return `[${message.message_type || "media"}]`;
  return message.message_type && message.message_type !== "text" ? `[${message.message_type}]` : "—";
}

function isOwnerMessage(message: RawMessage): boolean {
  const phone = String(message.sender_phone || "").replace(/\D/g, "");
  return phone === OWNER_PHONE_DIGITS || phone.endsWith(OWNER_PHONE_DIGITS);
}

export function MessagesTab({ api, notify }: { api: AdminApi; notify: Notify }) {
  const [messages, setMessages] = useState<RawMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [extractedMap, setExtractedMap] = useState<Record<string, Extraction[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [page, setPage] = useState(1);
  const [extracting, setExtracting] = useState(0);
  const [viewing, setViewing] = useState<RawMessage | null>(null);

  const load = useCallback(
    async (nextPage: number, nextQuery: string, nextStatus: StatusFilter) => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String((nextPage - 1) * PAGE_SIZE));
      if (nextQuery) params.set("q", nextQuery);
      if (nextStatus) params.set("status", nextStatus);
      try {
        const response = await api.get(`/api/admin/whatsapp/list?${params.toString()}`);
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
    [api],
  );

  useEffect(() => {
    load(page, query, status);
  }, [load, page, query, status]);

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
      const response = await api.post("/api/admin/whatsapp/extract", { raw_message_id: messageId });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "Extraction failed");
      const table = payload.table ? ` in ${payload.table}` : "";
      notify(payload.already_extracted ? `Already extracted${table}.` : `Extracted${table}. Draft saved.`);
      load(page, query, status);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Extraction failed";
      setError(message);
      notify(message, "error");
    } finally {
      setExtracting(0);
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const visibleMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((message) => {
      const text = messageText(message).replace(/\s+/g, " ");
      if (!text) return true;
      const signature = `${message.sender_phone || message.sender}|${message.group_name}|${text}`;
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });
  }, [messages]);
  const ownMessages = useMemo(() => visibleMessages.filter(isOwnerMessage), [visibleMessages]);
  const incomingMessages = useMemo(() => visibleMessages.filter((message) => !isOwnerMessage(message)), [visibleMessages]);

  function renderMessageTable(rows: RawMessage[]) {
    return (
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Date</th><th>Sender</th><th>Chat</th><th>Message</th><th>Extraction</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((message) => {
              const extractions = extractedMap[String(message.id)] || [];
              const label = extractions.length
                ? extractions.map((item) => `${item.table}: ${item.status || "draft"}`).join(", ")
                : "Not extracted";
              return (
                <tr key={message.id}>
                  <td className="wa-when">{new Date(message.message_timestamp).toLocaleString()}</td>
                  <td><span className="tbl-name">{message.sender || "—"}</span>{message.sender_phone && <span className="tbl-sub">{message.sender_phone}</span>}</td>
                  <td className="wa-chat">{message.is_group ? message.group_name : <span className="tbl-sub">Direct</span>}</td>
                  <td className="wa-preview">{previewOf(message)}</td>
                  <td><Pill tone={extractions.length ? "live" : "neutral"}>{label}</Pill></td>
                  <td className="wa-actions-cell">
                    <button type="button" className="btn btn-light btn-sm" onClick={() => setViewing(message)}>View</button>
                    <button type="button" className="btn btn-dark btn-sm" disabled={Boolean(extractions.length) || extracting === message.id} onClick={() => handleExtract(message.id)}>{extracting === message.id ? "Extracting…" : extractions.length ? "Viewed" : "Extract"}</button>
                    <button type="button" className="btn btn-light btn-sm" onClick={() => navigator.clipboard.writeText(String(message.id))}>Copy id</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="tab-stack">
      <Panel>
        <PanelHead
          eyebrow="Raw WhatsApp data"
          title="Messages"
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
          <>
          {visibleMessages.length < messages.length && (
            <p className="table-note">Collapsed {messages.length - visibleMessages.length} duplicate message block{messages.length - visibleMessages.length === 1 ? "" : "s"} from this page.</p>
          )}
          <div className="message-sections">
          {incomingMessages.length > 0 && <section className="message-section"><div className="message-section-head"><h3>Incoming messages</h3><Pill tone="neutral">{incomingMessages.length}</Pill></div>{renderMessageTable(incomingMessages)}</section>}
          {ownMessages.length > 0 && <section className="message-section own-message-section"><div className="message-section-head"><h3>Kapil’s sent messages</h3><Pill tone="live">{ownMessages.length}</Pill></div>{renderMessageTable(ownMessages)}</section>}
          </div>
          {/*
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
                {visibleMessages.map((message) => {
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
                          className="btn btn-light btn-sm"
                          onClick={() => setViewing(message)}
                        >
                          View
                        </button>
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
          </div>*/}
          </>
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

        {viewing && (
          <div className="raw-message-overlay" role="dialog" aria-modal="true" aria-label="Raw WhatsApp message">
            <div className="raw-message-modal">
              <div className="raw-message-modal-head">
                <div>
                  <span className="admin-eyebrow">Raw message</span>
                  <h3>{viewing.sender || "Unknown sender"}</h3>
                  <p>{viewing.group_name || (viewing.is_group ? "Group message" : "Direct message")} · {new Date(viewing.message_timestamp).toLocaleString()}</p>
                </div>
                <button type="button" className="btn btn-light btn-sm" onClick={() => setViewing(null)}>Close</button>
              </div>
              <pre className="raw-message-content">{messageFallback(viewing)}</pre>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
