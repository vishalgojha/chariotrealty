"use client";

import { FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { readJson } from "../lib/api";
import type { AdminApi } from "../hooks/use-admin-auth";
import { Note, Panel, PanelHead } from "./ui";

type Message = { role: "user" | "agent"; text: string };
type Conversation = { id: string; title: string; messages: Message[]; updatedAt: number };

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

const HISTORY_KEY = "chariot-realty-agent-conversations-v1";

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return <span key={index}>{part}</span>;
  });
}

function MarkdownMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const unordered: string[] = [];
    const ordered: string[] = [];
    while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
      unordered.push(lines[index].trim().replace(/^[-*]\s+/, ""));
      index += 1;
    }
    while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
      ordered.push(lines[index].trim().replace(/^\d+[.)]\s+/, ""));
      index += 1;
    }
    if (unordered.length) {
      blocks.push(<ul key={`ul-${index}`}>{unordered.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ul>);
      continue;
    }
    if (ordered.length) {
      blocks.push(<ol key={`ol-${index}`}>{ordered.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ol>);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push(<strong className="agent-markdown-heading" key={`heading-${index}`}>{renderInline(heading[2])}</strong>);
    } else {
      blocks.push(<p key={`p-${index}`}>{renderInline(line)}</p>);
    }
    index += 1;
  }

  return <div className="agent-markdown">{blocks}</div>;
}

export function AskTab({ api }: { api: AdminApi }) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([OPENING]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as unknown;
        if (parsed && typeof parsed === "object" && "conversations" in parsed) {
          const stored = parsed as { conversations?: unknown; activeId?: unknown };
          if (Array.isArray(stored.conversations)) {
            const restored = stored.conversations.filter((item): item is Conversation => {
              if (!item || typeof item !== "object") return false;
              const conversation = item as Partial<Conversation>;
              return typeof conversation.id === "string" && typeof conversation.title === "string" && Array.isArray(conversation.messages);
            }).map((conversation) => ({
              ...conversation,
              messages: conversation.messages.slice(-40),
            }));
            if (restored.length > 0) {
              const activeId = typeof stored.activeId === "string" && restored.some((item) => item.id === stored.activeId)
                ? stored.activeId
                : restored[0].id;
              setConversations(restored);
              setActiveConversationId(activeId);
              setMessages(restored.find((item) => item.id === activeId)?.messages || [OPENING]);
            }
          }
        } else if (Array.isArray(parsed)) {
          const restored = parsed.filter((item) => {
            const message = item as { role?: unknown; text?: unknown };
            return message && (message.role === "user" || message.role === "agent") && typeof message.text === "string";
          }) as Message[];
          if (restored.length > 0) {
            const id = `chat-${Date.now()}`;
            setConversations([{ id, title: "Previous conversation", messages: restored.slice(-40), updatedAt: Date.now() }]);
            setActiveConversationId(id);
            setMessages(restored.slice(-40));
          }
        }
      }
    } catch {
      window.localStorage.removeItem(HISTORY_KEY);
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;
    const activeId = activeConversationId || `chat-${Date.now()}`;
    const nextConversation: Conversation = {
      id: activeId,
      title: messages.find((message) => message.role === "user")?.text.slice(0, 42) || "New conversation",
      messages: messages.slice(-40),
      updatedAt: Date.now(),
    };
    setActiveConversationId(activeId);
    setConversations((items) => {
      const exists = items.some((item) => item.id === activeId);
      return exists ? items.map((item) => item.id === activeId ? nextConversation : item) : [nextConversation, ...items].slice(0, 30);
    });
  }, [historyLoaded, messages, activeConversationId]);

  useEffect(() => {
    if (!historyLoaded || conversations.length === 0) return;
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify({ activeId: activeConversationId, conversations }));
  }, [activeConversationId, conversations, historyLoaded]);

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

  function startNewConversation() {
    const id = `chat-${Date.now()}`;
    setActiveConversationId(id);
    setMessages([OPENING]);
  }

  function openConversation(conversation: Conversation) {
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages);
  }

  return (
    <div className="agent-layout">
      <aside className="agent-history" aria-label="Chat history">
        <div className="agent-history-head">
          <strong>Chat history</strong>
          <button type="button" className="agent-new-chat" onClick={startNewConversation}>＋ New</button>
        </div>
        <div className="agent-history-list">
          {conversations.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              className={`agent-history-item${conversation.id === activeConversationId ? " active" : ""}`}
              onClick={() => openConversation(conversation)}
            >
              <span>{conversation.title}</span>
              <small>{conversation.messages.filter((message) => message.role === "user").length} messages</small>
            </button>
          ))}
          {conversations.length === 0 && <p className="agent-history-empty">Your conversations will appear here.</p>}
        </div>
      </aside>
      <Panel className="agent-chat-card">
        <PanelHead
          eyebrow="Kapil’s private assistant"
          title="Ask anything"
          subtitle="One plain-language helper for everything: search your listings, match requirements, check website leads, or save a new listing. It never publishes to your website without your confirmation."
        />
        <div className={`agent-thread${messages.length <= 1 ? " agent-empty" : ""}`} ref={threadRef} aria-live="polite">
          {messages.map((message, index) => (
            <div key={index} className={`agent-msg ${message.role}`}>
              <span className="agent-msg-label">{message.role === "user" ? "You" : "Assistant"}</span>
               {message.role === "agent" ? <MarkdownMessage text={message.text} /> : <p>{message.text}</p>}
            </div>
          ))}
          {busy && (
            <div className="agent-msg agent">
              <span className="agent-msg-label">Assistant</span>
               <p className="agent-thinking"><span />Thinking…</p>
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
                <button type="button" className="chip" onClick={startNewConversation}>
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
          <button type="submit" className="agent-send" disabled={busy || !prompt.trim()} aria-label={busy ? "Thinking" : "Send message"}>
            {busy ? "…" : "↑"}
          </button>
        </form>
      </Panel>
    </div>
  );
}
