"use client";

import { useEffect, useState } from "react";
import { CloseIcon, WhatsAppIcon } from "@/components/icons";
import { PHONE_DISPLAY, waLink } from "@/lib/listing";

export type LeadKind = "requirement" | "listing";

const COPY: Record<LeadKind, { title: string; blurb: string; cta: string; details: string }> = {
  requirement: {
    title: "Post your requirement",
    blurb: "Tell us the locality, budget and configuration. Kapil replies on WhatsApp, usually within the hour.",
    cta: "Send on WhatsApp",
    details: "e.g. 3 BHK in BKC under ₹3L, ready to move, possession by December",
  },
  listing: {
    title: "List your property",
    blurb: "Send the address, expected rent or price and carpet area. We market it on WhatsApp and Instagram.",
    cta: "Send on WhatsApp",
    details: "e.g. 2 BHK in Khar, 1,100 sqft, expecting ₹2.8L per month, 2 parking",
  },
};

export function LeadModal({ kind, open, onClose }: { kind: LeadKind; open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const copy = COPY[kind];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const message = [
      `Hi Kapil, I would like to ${kind === "requirement" ? "post a requirement" : "list a property"}.`,
      name ? `Name: ${name}` : "",
      phone ? `Phone: ${phone}` : "",
      details ? `Details: ${details}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    window.open(waLink(message), "_blank", "noopener");
    onClose();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={copy.title} onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{copy.title}</h3>
            <p className="loc">{copy.blurb}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={submit} className="field-list">
          <div className="field">
            <label htmlFor="lead-name">Name</label>
            <input id="lead-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="lead-phone">Phone</label>
            <input id="lead-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={PHONE_DISPLAY} inputMode="tel" autoComplete="tel" />
          </div>
          <div className="field">
            <label htmlFor="lead-details">Details</label>
            <textarea id="lead-details" rows={3} value={details} onChange={(event) => setDetails(event.target.value)} placeholder={copy.details} />
          </div>
          <button type="submit" className="pill pill-gold pill-block">
            <WhatsAppIcon size={15} /> {copy.cta}
          </button>
          <p className="loc">Nothing is stored on this site. The message opens in WhatsApp for you to send.</p>
        </form>
      </div>
    </div>
  );
}
