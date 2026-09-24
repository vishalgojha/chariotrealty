"use client";

import { useCallback, useState } from "react";
import type { AdminAuth } from "../hooks/use-admin-auth";
import type { TabId } from "../lib/types";
import { AskTab } from "./ask-tab";
import { InventoryTab } from "./inventory-tab";
import { LeadsTab } from "./leads-tab";
import { MarketsTab } from "./markets-tab";
import { OverviewTab } from "./overview-tab";
import { WhatsappTab, type Notify } from "./whatsapp-tab";
import { Icon, Toast, type ToastTone } from "./ui";

const NAV: { id: TabId; label: string; hint: string; icon: string }[] = [
  { id: "overview", label: "Overview", hint: "Live market view", icon: "grid" },
  { id: "whatsapp", label: "WhatsApp studio", hint: "Self-chat publishing", icon: "whatsapp" },
  { id: "inventory", label: "My inventory", hint: "Kapil’s list & CMS", icon: "box" },
  { id: "leads", label: "Enquiries", hint: "Website leads", icon: "mail" },
  { id: "agent", label: "Ask anything", hint: "Listings, requirements, leads & notes", icon: "spark" },
  { id: "markets", label: "Markets", hint: "Neighbourhoods", icon: "pin" },
];

const VALID_TABS = NAV.map((item) => item.id);

function initialTab(): TabId {
  if (typeof window === "undefined") return "overview";
  const hash = window.location.hash.replace(/^#/, "");
  return (VALID_TABS as string[]).includes(hash) ? (hash as TabId) : "overview";
}

export function AdminShell({ auth }: { auth: AdminAuth }) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const [toast, setToast] = useState<{ tone: ToastTone; message: string } | null>(null);

  const notify = useCallback<Notify>((message, tone = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  function go(next: TabId) {
    setTab(next);
    window.history.replaceState({}, "", `#${next}`);
    window.scrollTo({ top: 0 });
  }

  return (
    <main className="admin-app">
      <Toast toast={toast} />
      <div className="admin-frame">
        <aside className="admin-sidebar">
          <div className="side-brand">
             <img className="brand-logo-image" src="/images.jpeg" alt="Chariot Realty" />
            <small>Market desk · Mumbai</small>
          </div>
          <nav className="side-nav" aria-label="Market desk sections">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`side-nav-item${tab === item.id ? " active" : ""}`}
                onClick={() => go(item.id)}
                aria-current={tab === item.id ? "page" : undefined}
              >
                <Icon name={item.icon} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
              </button>
            ))}
          </nav>
          <div className="side-foot">
            <span className="signed-in">Supabase secured</span>
            <button type="button" className="side-link" onClick={auth.signOut}>Sign out</button>
          </div>
        </aside>

        <div className="admin-body">
          <header className="admin-topbar">
            <div>
              <h1>Market desk</h1>
              <p className="admin-muted">Your daily view of Bandra, BKC and the western suburbs.</p>
            </div>
            <div className="topbar-actions">
              <span className="signed-in">{tab === "overview" ? "Everything synced" : "Synced securely"}</span>
              <a href="/" className="btn btn-light btn-sm">
                <Icon name="external" size={15} />
                Public site
              </a>
            </div>
          </header>
          <nav className="admin-mobile-nav" aria-label="Market desk sections">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mobile-tab${tab === item.id ? " active" : ""}`}
                onClick={() => go(item.id)}
              >
                <span className="mobile-tab-icon"><Icon name={item.icon} /></span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className={`admin-content${tab === "agent" ? " admin-content-chat" : ""}`}>
            {tab === "overview" && <OverviewTab go={go} api={auth.api} />}
            {tab === "whatsapp" && <WhatsappTab api={auth.api} notify={notify} />}
            {tab === "inventory" && <InventoryTab api={auth.api} notify={notify} />}
            {tab === "leads" && <LeadsTab api={auth.api} />}
            {tab === "agent" && <AskTab api={auth.api} />}
            {tab === "markets" && <MarketsTab />}
          </div>
          <footer className="admin-footer">
            <span>Chariot Realty · Mumbai operations</span>
            <span>Built for quick decisions, from Bandra to BKC.</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
