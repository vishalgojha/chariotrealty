"use client";

import { useEffect, useState } from "react";
import { CheckIcon, WhatsAppIcon } from "@/components/icons";
import type { SiteContent } from "@/lib/site-content";

const FALLBACK_ABOUT: Partial<SiteContent> = {
  title: "About Chariot Realty",
  contentBody:
    "Chariot Real Estate is a boutique Bandra-based agency for prime rentals, corporate residences and direct developer mandates across Mumbai's western suburbs. Founded and led by principal broker Kapil Gopal Ojha, we work WhatsApp-first: you speak directly to the broker, never a portal.",
  highlightBulletPoints: [
    "Direct mandates from builders and verified corporate relocation inventory",
    "Live price bands, transit routing and curated listings across Bandra and BKC",
    "WhatsApp-first: one broker, verified shortlists the same day, no paid site visits",
  ],
};

export function AboutUs() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/site-content?section=about_us")
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        setContent(payload?.data ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!loaded) {
    return (
      <section className="section about-us" id="about-us">
        <div className="section-head">
          <div>
            <p className="kicker">About the agency</p>
            <h2 className="skeleton-line" style={{ width: 220 }}>&nbsp;</h2>
          </div>
        </div>
        <div className="listing-skeleton" style={{ height: 120, marginBottom: 16 }} />
      </section>
    );
  }

  const about = content ?? (FALLBACK_ABOUT as SiteContent);
  const bullets = about.highlightBulletPoints?.length ? about.highlightBulletPoints : [];

  return (
    <section className="section about-us" id="about-us">
      <div className="section-head">
        <div>
          <p className="kicker">About the agency</p>
          <h2>{about.title || "About Chariot Realty"}</h2>
        </div>
      </div>

      <div className="about-grid">
        <p className="about-body">{about.contentBody || FALLBACK_ABOUT.contentBody}</p>
        {bullets.length ? (
          <ul className="about-bullets">
            {bullets.map((point) => (
              <li key={point}>
                <CheckIcon size={14} /> {point}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="about-cta">
        <a
          className="btn-primary"
          href={about.ctaLink || `https://wa.me/919773757759?text=${encodeURIComponent("Hi Kapil, I'd like to know more about Chariot Realty.")}`}
          target="_blank"
          rel="noreferrer"
        >
          <WhatsAppIcon size={16} /> Talk to Kapil on WhatsApp
        </a>
      </div>
    </section>
  );
}