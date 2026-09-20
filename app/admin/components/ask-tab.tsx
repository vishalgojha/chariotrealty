"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { readJson } from "../lib/api";
import type { AdminApi } from "../hooks/use-admin-auth";
import { Note, Panel, PanelHead } from "./ui";

type Message = { role: "user" | "agent"; text: string };

const SUGGESTIONS = [
  "What good 2 BHKs are available around Bandra?",
  "Summarise my current inventory",
  "Who enquired about properties recently?",
  "Store this for me: 2 BHK in Khar, 1100 sqft, ₹3.4 crore",
];

const OPENING: Message = {
  role: "agent",
  text: "Hi Kapil 👋 Ask me anything. I'm your Chariot assistant — I can find listings, match buyers' requirements, check who enquired on the website, and save things to your inventory for later.",
};

export function AskTab({ api }: { api: AdminApi }) {
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
      const history = nextMessages.slice(0, -1);
      const response = await api.post("/api/agent/chat", { text, history });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "The assistant could not answer");
      const reply = String(payload.reply || "The assistant returned no answer.");
      setMessages((items) => [...items, { role: "agent", text: reply }]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "The assistant could not answer";
      const friendly = message.toLowerCase().includes("api key is not configured") || message.toLowerCase().includes("invalid_api_key") || message.toLowerCase().includes("unauthorized")
        ? "The assistant isn't connected to the AI provider yet. Let an admin know the AI key needs to be added."
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
          eyebrow="Kapil’s private assistant"
          title="Ask anything"
          subtitle="One plain-language helper for everything: search your listings, match requirements, check website leads, or save a new listing. It never publishes to your website without your confirmation."
        />
        <div className="agent-thread" ref={threadRef} aria-live="polite">
          {messages.map((message, index) => (
            <div key={index} className={`agent-msg ${message.role}`}>
              <span className="agent-msg-label">{message.role === "user" ? "You" : "Assistant"}</span>
              <p>{message.text}</p>
            </div>
          ))}
          {busy && (
            <div className="agent-msg agent">
              <span className="agent-msg-label">Assistant</span>
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
            placeholder="Ask anything…"
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