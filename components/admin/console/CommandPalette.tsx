"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import { toast } from "sonner";
import {
  Briefcase,
  ClipboardList,
  Globe,
  GraduationCap,
  History,
  Inbox,
  Keyboard,
  Map as MapIcon,
  MessageSquareText,
  MessagesSquare,
  RefreshCw,
  Repeat,
  Search,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd } from "@/components/admin/shared/Kbd";
import {
  ADMIN_NAV_ENTRIES,
  matchAdminNav,
  tokenize,
  type AdminNavEntry,
} from "@/components/admin/admin-navigation";
import {
  ADMIN_QUEUE_BY_KEY,
  openQueues,
  type AdminQueueCount,
  type AdminQueueSnapshot,
  type AdminSearchHit,
  type AdminSearchType,
} from "@/lib/admin/console";
import { useAdminLiveCounts } from "./live-counts";
import { describeAdminPath } from "./breadcrumbs";
import { formatBadgeCount } from "./nav-badges";
import { readRecentPaths } from "./recent-pages";
import { chordForHref } from "./useAdminHotkeys";
import {
  SEARCH_MIN_CHARS,
  searchIsCurrent,
  useAdminSearch,
} from "./useAdminSearch";
import { usePlatformModifier } from "./usePlatformModifier";

const HIT_ICONS: Partial<Record<AdminSearchType, LucideIcon>> = {
  user: UserRound,
  dm_lead: MessagesSquare,
  line_contact: MessageSquareText,
  shift_application: ClipboardList,
  shift_round: Repeat,
  expert: GraduationCap,
  map: MapIcon,
  talent: Briefcase,
  hackathon_participant: Trophy,
};

const NAV_ICON_BY_HREF = new Map(
  ADMIN_NAV_ENTRIES.map((entry) => [entry.item.href, entry.item.icon]),
);

type ActionId = "refresh" | "shortcuts" | "website";

interface PaletteAction {
  id: ActionId;
  label: string;
  hint: string;
  icon: LucideIcon;
}

const ACTIONS: readonly PaletteAction[] = [
  {
    id: "refresh",
    label: "Refresh counts",
    hint: "Reload the work queue numbers",
    icon: RefreshCw,
  },
  {
    id: "shortcuts",
    label: "Keyboard shortcuts",
    hint: "Every global shortcut",
    icon: Keyboard,
  },
  {
    id: "website",
    label: "Open passionseed.org",
    hint: "Opens in a new tab",
    icon: Globe,
  },
];

/** Actions whose label or hint starts with every query word. */
export function matchActions(query: string): PaletteAction[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [...ACTIONS];
  return ACTIONS.filter((action) => {
    const words = tokenize(`${action.label} ${action.hint}`);
    return tokens.every((token) =>
      words.some((word) => word.startsWith(token)),
    );
  });
}

/**
 * Open queues the client knows, most urgent first. A key from a newer server
 * (a tab left open across a deploy) is dropped instead of breaking the sort.
 */
export function knownOpenQueues(
  snapshot: AdminQueueSnapshot | null,
): AdminQueueCount[] {
  if (!snapshot) return [];
  return openQueues({
    ...snapshot,
    queues: snapshot.queues.filter((queue) =>
      Object.prototype.hasOwnProperty.call(ADMIN_QUEUE_BY_KEY, queue.key),
    ),
  });
}

const RECENT_SHOWN = 6;
const TOOL_MATCHES_SHOWN = 8;

export function CommandPalette({
  open,
  onOpenChange,
  onShowShortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowShortcuts: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { snapshot, failed: countsFailed, refresh } = useAdminLiveCounts();
  const modifier = usePlatformModifier() ?? "Ctrl";
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const newTab = useRef(false);
  const { state: search, retry } = useAdminSearch(query, open);

  const trimmed = query.trim();
  const searching = trimmed.length > 0;

  useEffect(() => {
    if (open) setRecent(readRecentPaths());
    else setQuery("");
  }, [open]);

  const go = useCallback(
    (href: string, external = false) => {
      const inNewTab = external || newTab.current;
      newTab.current = false;
      onOpenChange(false);
      if (inNewTab) window.open(href, "_blank", "noopener,noreferrer");
      else router.push(href);
    },
    [onOpenChange, router],
  );

  const runAction = useCallback(
    (id: ActionId) => {
      if (id === "website") return go("/", true);
      newTab.current = false;
      onOpenChange(false);
      if (id === "refresh") {
        refresh();
        toast.success("Refreshing counts");
      } else {
        onShowShortcuts();
      }
    },
    [go, onOpenChange, onShowShortcuts, refresh],
  );

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    // Enter that commits an IME composition must not open anything.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter") newTab.current = event.metaKey || event.ctrlKey;
  };

  const rememberModifier = (event: ReactMouseEvent) => {
    newTab.current = event.metaKey || event.ctrlKey;
  };

  const queues = useMemo(() => knownOpenQueues(snapshot), [snapshot]);
  const recentPaths = useMemo(
    () => recent.filter((path) => path !== pathname).slice(0, RECENT_SHOWN),
    [recent, pathname],
  );
  const tools = useMemo(
    () =>
      searching ? matchAdminNav(trimmed).slice(0, TOOL_MATCHES_SHOWN) : [],
    [searching, trimmed],
  );
  const actions = useMemo(() => matchActions(trimmed), [trimmed]);

  const rowProps = { onClickCapture: rememberModifier };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search admin tools and records, or run an action."
      className="admin-palette"
      commandProps={{
        label: "Admin command palette",
        shouldFilter: false,
        loop: true,
        onKeyDown,
      }}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search tools, people, rounds…"
        aria-label="Search tools and records"
      />
      <CommandList className="admin-palette-list">
        {!searching && (
          <>
            <AttentionGroup
              queues={queues}
              loading={!snapshot && !countsFailed}
              failed={!snapshot && countsFailed}
              onGo={go}
              onRetry={refresh}
              rowProps={rowProps}
            />
            {recentPaths.length > 0 && (
              <CommandGroup heading="Recent">
                {recentPaths.map((path) => {
                  const { label, context } = describeAdminPath(path);
                  return (
                    <PaletteRow
                      key={path}
                      value={`recent:${path}`}
                      icon={History}
                      title={label}
                      subtitle={context}
                      onSelect={() => go(path)}
                      {...rowProps}
                    />
                  );
                })}
              </CommandGroup>
            )}
            <NavGroup
              heading="Go to"
              entries={ADMIN_NAV_ENTRIES}
              onGo={go}
              rowProps={rowProps}
            />
          </>
        )}

        {searching && tools.length > 0 && (
          <NavGroup
            heading="Tools"
            entries={tools}
            onGo={go}
            rowProps={rowProps}
          />
        )}

        {searching && trimmed.length >= SEARCH_MIN_CHARS && (
          <RecordResults
            query={trimmed}
            state={search}
            hasLocal={tools.length > 0 || actions.length > 0}
            onGo={go}
            onRetry={retry}
            rowProps={rowProps}
          />
        )}

        {searching &&
          trimmed.length < SEARCH_MIN_CHARS &&
          tools.length === 0 &&
          actions.length === 0 && (
            <PaletteNote>Type one more letter to search records.</PaletteNote>
          )}

        {actions.length > 0 && (
          <CommandGroup heading="Actions">
            {actions.map((action) => (
              <PaletteRow
                key={action.id}
                value={`action:${action.id}`}
                icon={action.icon}
                title={action.label}
                subtitle={action.hint}
                onSelect={() => runAction(action.id)}
                {...rowProps}
              />
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <footer className="admin-palette-footer" aria-hidden="true">
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> move
        </span>
        <span>
          <Kbd>Enter</Kbd> open
        </span>
        <span>
          <Kbd>{modifier}</Kbd>
          <Kbd>Enter</Kbd> new tab
        </span>
        <span>
          <Kbd>Esc</Kbd> close
        </span>
      </footer>
    </CommandDialog>
  );
}

type RowExtras = { onClickCapture: (event: ReactMouseEvent) => void };

function PaletteRow({
  value,
  icon: Icon,
  title,
  subtitle,
  meta,
  onSelect,
  onClickCapture,
  disabled,
}: {
  value: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  onSelect: () => void;
  /** Shown but skipped by the keyboard and the pointer. */
  disabled?: boolean;
} & RowExtras) {
  return (
    <CommandItem
      value={value}
      onSelect={onSelect}
      onClickCapture={onClickCapture}
      disabled={disabled}
      className="admin-palette-item"
    >
      <Icon aria-hidden="true" className="admin-palette-icon" />
      <span className="admin-palette-text">
        <span className="admin-palette-title">{title}</span>
        {subtitle && <span className="admin-palette-subtitle">{subtitle}</span>}
      </span>
      {meta && <span className="admin-palette-meta">{meta}</span>}
    </CommandItem>
  );
}

function PaletteNote({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "error";
}) {
  return (
    <div className="admin-palette-note" data-tone={tone} role="status">
      {children}
    </div>
  );
}

function AttentionGroup({
  queues,
  loading,
  failed,
  onGo,
  onRetry,
  rowProps,
}: {
  queues: AdminQueueCount[];
  loading: boolean;
  failed: boolean;
  onGo: (href: string) => void;
  onRetry: () => void;
  rowProps: RowExtras;
}) {
  return (
    <CommandGroup heading="Needs attention">
      {loading && <PaletteNote>Counting open work…</PaletteNote>}
      {failed && (
        <>
          <PaletteNote tone="error">
            Counts could not load. Tools and search still work.
          </PaletteNote>
          <PaletteRow
            value="counts:retry"
            icon={RefreshCw}
            title="Try loading counts again"
            onSelect={onRetry}
            {...rowProps}
          />
        </>
      )}
      {!loading && !failed && queues.length === 0 && (
        <PaletteNote>Every queue is clear.</PaletteNote>
      )}
      {queues.map((queue) => {
        const def = ADMIN_QUEUE_BY_KEY[queue.key];
        if (!def) return null;
        const count = queue.count ?? 0;
        return (
          <PaletteRow
            key={queue.key}
            value={`queue:${queue.key}`}
            icon={(def.navHref && NAV_ICON_BY_HREF.get(def.navHref)) || Inbox}
            title={def.label}
            subtitle={queue.context ?? def.description}
            onSelect={() => onGo(queue.href || def.href)}
            meta={
              <span
                className="admin-palette-count"
                data-urgent={def.urgency === "now" || undefined}
                title={queue.approximate ? "Approximate count" : undefined}
              >
                {queue.approximate ? "~" : ""}
                {formatBadgeCount(count)}
              </span>
            }
            {...rowProps}
          />
        );
      })}
    </CommandGroup>
  );
}

function NavGroup({
  heading,
  entries,
  onGo,
  rowProps,
}: {
  heading: string;
  entries: AdminNavEntry[];
  onGo: (href: string) => void;
  rowProps: RowExtras;
}) {
  return (
    <CommandGroup heading={heading}>
      {entries.map(({ item, group }) => {
        const chord = chordForHref(item.href);
        return (
          <PaletteRow
            key={item.href}
            value={`nav:${item.href}`}
            icon={item.icon}
            title={item.label}
            subtitle={item.description}
            onSelect={() => onGo(item.href)}
            meta={
              <>
                <span className="admin-palette-group">{group.label}</span>
                {chord && (
                  <CommandShortcut
                    className="admin-palette-chord"
                    aria-hidden="true"
                  >
                    <Kbd>G</Kbd>
                    <Kbd>{chord.key.toUpperCase()}</Kbd>
                  </CommandShortcut>
                )}
              </>
            }
            {...rowProps}
          />
        );
      })}
    </CommandGroup>
  );
}

function HitRow({
  hit,
  stale,
  onGo,
  rowProps,
}: {
  hit: AdminSearchHit;
  stale: boolean;
  onGo: (href: string) => void;
  rowProps: RowExtras;
}) {
  const badges = (hit.badges ?? []).slice(0, 2);
  return (
    <PaletteRow
      value={`hit:${hit.type}:${hit.id}`}
      icon={HIT_ICONS[hit.type] ?? Search}
      title={hit.title}
      subtitle={hit.subtitle}
      onSelect={() => onGo(hit.href)}
      disabled={stale}
      meta={
        badges.length > 0 ? (
          <>
            {badges.map((badge) => (
              <span key={badge} className="admin-palette-badge">
                {badge}
              </span>
            ))}
          </>
        ) : undefined
      }
      {...rowProps}
    />
  );
}

function RecordResults({
  query,
  state,
  hasLocal,
  onGo,
  onRetry,
  rowProps,
}: {
  query: string;
  state: ReturnType<typeof useAdminSearch>["state"];
  hasLocal: boolean;
  onGo: (href: string) => void;
  onRetry: () => void;
  rowProps: RowExtras;
}) {
  const groups = (state.data?.groups ?? []).filter(
    (group) => group.hits.length > 0,
  );
  // Rows from the previous query stay visible while this one loads, but
  // cannot be chosen: Enter must never open a record the admin typed past.
  const current = searchIsCurrent(state, query);
  const noRecords = current && groups.length === 0;

  return (
    <>
      {groups.map((group) => (
        <CommandGroup key={group.type} heading={group.label}>
          {group.hits.map((hit) => (
            <HitRow
              key={`${hit.type}:${hit.id}`}
              hit={hit}
              stale={!current}
              onGo={onGo}
              rowProps={rowProps}
            />
          ))}
        </CommandGroup>
      ))}
      {!current && state.status !== "error" && (
        <CommandPrimitive.Loading
          className="admin-palette-note"
          label="Searching records"
        >
          Searching records…
        </CommandPrimitive.Loading>
      )}
      {state.status === "error" && (
        <CommandGroup heading="Records">
          <PaletteNote tone="error">
            Record search failed. Tools and actions still work.
          </PaletteNote>
          <PaletteRow
            value="search:retry"
            icon={RefreshCw}
            title="Try the search again"
            onSelect={onRetry}
            {...rowProps}
          />
        </CommandGroup>
      )}
      {current && state.data?.partial && (
        <PaletteNote>
          Some records could not be searched, so results may be incomplete.
        </PaletteNote>
      )}
      {noRecords && !hasLocal && (
        <PaletteNote>
          No matches for “{query}”. Try a name, an @handle, or a round number.
        </PaletteNote>
      )}
    </>
  );
}
