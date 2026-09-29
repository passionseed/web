"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { ADMIN_NAV_GROUPS, getActiveAdminItem } from "./admin-navigation";

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const active = getActiveAdminItem(pathname);
  const search = query.trim().toLowerCase();
  const groups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      `${group.label} ${item.label} ${item.description}`
        .toLowerCase()
        .includes(search),
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <nav aria-label="Admin navigation" className="admin-nav">
      <div className="admin-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          aria-label="Find an admin tool"
          placeholder="Find a tool…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="admin-nav-groups">
        {groups.map((group) => (
          <details
            key={`${group.label}-${pathname}-${Boolean(search)}`}
            open={
              Boolean(search) ||
              group.label === "Workspace" ||
              group.items.some((item) => item.href === active?.href)
            }
            className="admin-nav-group"
          >
            <summary>
              {group.label}
              <ChevronDown size={14} aria-hidden="true" />
            </summary>
            <ul>
              {group.items.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    prefetch={false}
                    aria-current={active?.href === href ? "page" : undefined}
                    onClick={onNavigate}
                    className="admin-nav-link"
                  >
                    <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
        {groups.length === 0 && (
          <p role="status" className="px-3 py-5 text-sm text-muted-foreground">
            No tools found. Try “SHIFT”, “users”, or “maps”.
          </p>
        )}
      </div>
    </nav>
  );
}
