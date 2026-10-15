"use client";

import { ChevronRightIcon } from "./icons";

type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      <ol className="breadcrumb-list">
        {items.map((item, index) => (
          <li key={item.label} className="breadcrumb-item">
            {index < items.length - 1 ? (
              <a className="breadcrumb-link" href={item.href || "#"} aria-label={item.label}>
                {item.label}
                <ChevronRightIcon size={12} />
              </a>
            ) : (
              <span className="breadcrumb-current">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}