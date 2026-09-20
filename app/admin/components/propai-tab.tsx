"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { readJson } from "../lib/api";
import type { AdminApi } from "../hooks/use-admin-auth";
import { Note, Panel, PanelHead } from "./ui";

type Message = { role: "user" | "agent"; text: string };

const SUGGESTIONS = [
  "What does PropAI know about my recent WhatsApp groups?",
  "Summarise last week’s property conversations",
  "Which contacts mentioned renting or buying?",
  "Find anything related to Bandra West in my chats",
];

const OPENING: Message = {
  role: "agent",
  text: "Hi Kapil 👋 This desk talks directly to PropAI. Ask it anything about your WhatsApp groups and extracted property data — it has its own memory and intelligence, separate from your Chariot assistant.",
};

export function PropaiTab({ api }: { api: AdminApi }) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([OPENING]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, busy]);

  async function ask(textOverride?: string) {
    const text = (textOverride ?? prompt).trim();
    if (!text || busy) return;
    const nextMessages: Message[] = [...messages, { role: "user", text }];
    setPrompt("");
    setError("");
    setMessages(nextMessages);
    setBusy(true);
    try {
      const response = await api.post("/api/propai/chat", { text });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "PropAI could not answer");
      const reply = String(payload.reply || "PropAI returned no answer.");
      setMessages((items) => [...items, { role: "agent", text: reply }]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "PropAI could not answer";
      const friendly = message.toLowerCase().includes("not configured")
        ? "PropAI access isn't set up yet — let an admin know the PropAI token needs to be added."
        : message;
      setMessages((items) => [...items, { role: "agent", text: `I hit a snag: ${friendly}. Try asking again in a moment.` }]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    ask();
  }

  return (
    <div className="tab-stack">
      <Panel className="agent-chat-card">
        <PanelHead
          eyebrow="PropAI intelligence"
          title="Ask PropAI"
          subtitle="A direct line to PropAI — your WhatsApp groups, extractions and PropAI memory. This is separate from the Chariot assistant."
        />
        <div className="agent-thread" ref={threadRef} aria-live="polite">
          {messages.map((message, index) => (
            <div key={index} className={`agent-msg ${message.role}`}>
              <span className="agent-msg-label">{message.role === "user" ? "You" : "PropAI"}</span>
              <p>{message.text}</p>
            </div>
          ))}
          {busy && (
            <div className="agent-msg agent">
              <span className="agent-msg-label">PropAI</span>
              <p>Thinking…</p>
            </div>
          )}
          {!busy && (
            <div className="chip-row">
              {messages.length <= 1 ? (
                SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} type="button" className="chip" onClick={() => ask(suggestion)}>
                    {suggestion}
                  </button>
                ))
              ) : (
                <button type="button" className="chip" onClick={() => setMessages([OPENING])}>
                  Start a new conversation
                </button>
              )}
            </div>
          )}
        </div>
        {error && <Note tone="error">{error}</Note>}
        <form className="agent-composer" onSubmit={onSubmit}>
          <textarea
            className="textarea"
            placeholder="Ask PropAI anything…"
            rows={2}
            disabled={busy}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
          />
          <button type="submit" className="btn btn-dark" disabled={busy || !prompt.trim()}>
            {busy ? "Thinking…" : "Send"}
          </button>
        </form>
      </Panel>
    </div>
  );
}