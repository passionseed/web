"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type SyntheticEvent,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";

import {
  ADMIN_NAV_GROUPS,
  getActiveAdminEntry,
  matchAdminNav,
  type AdminNavGroup,
} from "./admin-navigation";
import { useAdminLiveCounts } from "./console/live-counts";
import { navBadges, type AdminNavBadge } from "./console/nav-badges";
import { NavCountBadge } from "./console/NavCountBadge";

const GROUPS_KEY = "admin:nav-groups";
type GroupChoices = Record<string, boolean>;

function readGroupChoices(): GroupChoices {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(GROUPS_KEY) ?? "{}",
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, open]) => typeof open === "boolean"),
    ) as GroupChoices;
  } catch {
    return {};
  }
}

function writeGroupChoices(choices: GroupChoices) {
  try {
    window.localStorage.setItem(GROUPS_KEY, JSON.stringify(choices));
  } catch {
    // Storage blocked: the choice lasts until reload.
  }
}

/**
 * Open or closed per group, remembered across visits. The admin's choice
 * wins; without one, daily groups and the group holding the current page
 * open. Moving to a page inside a closed group opens it again.
 */
function useGroupChoices(activeGroupId: string | undefined, pathname: string) {
  const [choices, setChoices] = useState<GroupChoices>({});

  useEffect(() => {
    setChoices(readGroupChoices());
  }, []);

  const setChoice = useCallback((groupId: string, open: boolean) => {
    setChoices((prev) => {
      if (prev[groupId] === open) return prev;
      const next = { ...prev, [groupId]: open };
      writeGroupChoices(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!activeGroupId) return;
    setChoices((prev) => {
      if (prev[activeGroupId] !== false) return prev;
      const next = { ...prev, [activeGroupId]: true };
      writeGroupChoices(next);
      return next;
    });
  }, [activeGroupId, pathname]);

  return { choices, setChoice };
}

function groupBadge(
  group: AdminNavGroup,
  badges: Record<string, AdminNavBadge>,
) {
  let count = 0;
  let urgent = false;
  for (const item of group.items) {
    const badge = badges[item.href];
    if (!badge) continue;
    count += badge.count;
    urgent ||= badge.urgent;
  }
  return count > 0 ? { count, urgent } : undefined;
}

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const [query, setQuery] = useState("");
  const { snapshot } = useAdminLiveCounts();
  const badges = useMemo(() => navBadges(snapshot), [snapshot]);
  const activeEntry = getActiveAdminEntry(pathname);
  const activeHref = activeEntry?.item.href;
  const activeGroupId = activeEntry?.group.id;
  const { choices, setChoice } = useGroupChoices(activeGroupId, pathname);

  const searching = query.trim().length > 0;
  const groups = useMemo(() => {
    if (!searching) return ADMIN_NAV_GROUPS;
    const hits = new Set(matchAdminNav(query).map((entry) => entry.item.href));
    return ADMIN_NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => hits.has(item.href)),
    })).filter((group) => group.items.length > 0);
  }, [query, searching]);

  const isOpen = (group: AdminNavGroup) =>
    searching ||
    (choices[group.id] ??
      (Boolean(group.defaultOpen) || group.id === activeGroupId));

  return (
    <nav aria-label="Admin navigation" className="admin-nav">
      <div className="admin-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          aria-label="Filter admin tools"
          placeholder="Filter tools"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear filter"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="admin-nav-groups">
        {groups.map((group) => {
          const open = isOpen(group);
          const summaryBadge = open ? undefined : groupBadge(group, badges);
          const onToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
            // Programmatic changes already match `open`; only record clicks.
            const domOpen = event.currentTarget.open;
            if (!searching && domOpen !== open) setChoice(group.id, domOpen);
          };
          return (
            <details
              key={group.id}
              open={open}
              onToggle={onToggle}
              className="admin-nav-group"
            >
              <summary
                onClick={
                  searching ? (event) => event.preventDefault() : undefined
                }
              >
                <span className="admin-nav-group-label">{group.label}</span>
                <NavCountBadge badge={summaryBadge} />
                <ChevronDown size={14} aria-hidden="true" />
              </summary>
              <ul>
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = activeHref === href;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        prefetch={false}
                        aria-current={active ? "page" : undefined}
                        onClick={onNavigate}
                        className="admin-nav-link"
                      >
                        <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
                        <span className="admin-nav-label">{label}</span>
                        <NavCountBadge badge={badges[href]} active={active} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
        {groups.length === 0 && (
          <p role="status" className="px-3 py-5 text-sm text-muted-foreground">
            No tools found. Try “SHIFT”, “users”, or “maps”. To find a person or
            record, use Search at the top.
          </p>
        )}
      </div>
    </nav>
  );
}
