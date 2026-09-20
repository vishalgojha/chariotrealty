"use client";

import { useEffect, useState } from "react";
import { apiUrl, readJson } from "../lib/api";
import type { Market } from "../lib/types";
import { Panel, PanelHead } from "./ui";

export function MarketsTab() {
  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    fetch(apiUrl("/api/markets"))
      .then(readJson)
      .then((data) => setMarkets(data.data || []))
      .catch(() => setMarkets([]));
  }, []);

  return (
    <div className="tab-stack">
      <Panel>
        <PanelHead eyebrow="Local intelligence" title="Know the neighbourhoods" subtitle="Where Chariot Realty tracks the highest-intent demand." />
        <div className="market-grid">
          {markets.map((market) => (
            <article className="market-card" key={market.name}>
              <span className="market-dot" />
              <h3>{market.name}</h3>
              <p>{market.positioning}</p>
              <small>{market.transit.join(" · ")}</small>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}