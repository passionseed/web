import {
  Activity,
  Archive,
  Banknote,
  BarChart3,
  Bot,
  Briefcase,
  CalendarDays,
  ClipboardList,
  Code2,
  Compass,
  Eye,
  FileCheck2,
  FlaskConical,
  GraduationCap,
  HandHeart,
  LayoutDashboard,
  LineChart,
  Map,
  Megaphone,
  MessageCircle,
  MessageSquareQuote,
  MessageSquareText,
  MessagesSquare,
  NotebookPen,
  Radar,
  Repeat,
  ScanSearch,
  ShoppingBag,
  Tent,
  Trophy,
  Users,
  Webhook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Highlight for every page under this path, when href is a sub-page. */
  section?: string;
  /** Only the exact href selects this item, never its sub-pages. */
  exact?: boolean;
  /** Extra words the palette and the sidebar filter match on. */
  keywords?: string[];
}

export interface AdminNavGroup {
  /** Stable key for the remembered open or closed state. */
  id: string;
  label: string;
  /** Daily work stays expanded unless the admin closes it. */
  defaultOpen?: boolean;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "workspace",
    label: "Workspace",
    defaultOpen: true,
    items: [
      {
        href: "/admin",
        label: "Overview",
        description: "What needs the team right now",
        icon: LayoutDashboard,
        exact: true,
        keywords: ["home", "dashboard", "attention"],
      },
      {
        href: "/admin/dm-leads",
        label: "DM leads",
        description: "Instagram and Facebook conversations and follow-ups",
        icon: MessagesSquare,
        keywords: ["inbox", "instagram", "sales", "messages"],
      },
      {
        href: "/admin/line",
        label: "LINE inbox",
        description: "Read and reply to @passionseed LINE chats",
        icon: MessageSquareText,
        keywords: ["chat", "parents", "slips"],
      },
      {
        href: "/admin/ig-comments",
        label: "IG comments",
        description: "Instagram comment replies",
        icon: MessageCircle,
        keywords: ["instagram", "keyword"],
      },
      {
        href: "/admin/calendar",
        label: "Calendar",
        description: "Where community calendar blocks get announced",
        icon: CalendarDays,
        keywords: ["discord", "sessions"],
      },
    ],
  },
  {
    id: "shift",
    label: "SHIFT",
    defaultOpen: true,
    items: [
      {
        href: "/admin/shift/rounds",
        label: "Rounds",
        description: "SHIFT rounds: review, squads, certificates",
        icon: Repeat,
        keywords: ["entrants", "evidence", "certificates"],
      },
      {
        href: "/admin/shift/applications",
        label: "Applications",
        description: "SHIFT applicants, payment, join links",
        icon: ClipboardList,
        keywords: ["applicants", "payment", "accept"],
      },
      {
        // Every other SHIFT page lives under this path.
        href: "/admin/shift",
        label: "Tracker",
        description: "SHIFT kids and weekly notes",
        icon: NotebookPen,
        exact: true,
        keywords: ["students", "notes"],
      },
      {
        href: "/admin/shift/seedstack",
        label: "SeedStack",
        description: "SHIFT build progress and stuck students",
        icon: Code2,
      },
      {
        href: "/admin/shift/interest",
        label: "Pre-orders",
        description: "Who signed up for the next round and when they can join",
        icon: ShoppingBag,
        keywords: ["interest", "waitlist", "next"],
      },
      {
        href: "/admin/shift/alumni",
        label: "Alumni",
        description: "SHIFT High members and alumni meetups",
        icon: HandHeart,
        keywords: ["high", "community"],
      },
      {
        href: "/admin/shift/feedback",
        label: "Feedback",
        description: "End-of-round answers and scores",
        icon: MessageSquareQuote,
        keywords: ["survey", "nps"],
      },
    ],
  },
  {
    id: "learning",
    label: "Learning",
    items: [
      {
        href: "/admin/maps",
        label: "PathLabs",
        description: "Learning maps and nodes",
        icon: Map,
        keywords: ["maps", "nodes"],
      },
      {
        href: "/admin/experts",
        label: "Experts",
        description: "Review expert interviews",
        icon: GraduationCap,
        keywords: ["interviews"],
      },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      {
        href: "/admin/users",
        label: "Users",
        description: "Accounts and roles",
        icon: Users,
        keywords: ["accounts", "roles", "students"],
      },
      {
        href: "/admin/talent",
        label: "Talent",
        description: "Project briefs and student signups",
        icon: Briefcase,
        keywords: ["hire", "verify"],
      },
      {
        href: "/admin/trials",
        label: "Trials",
        description: "PathLab trial payment slips",
        icon: FileCheck2,
        keywords: ["payment", "slips"],
      },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    items: [
      {
        href: "/admin/ceo/payments",
        label: "Payments",
        description: "Manual payment ledger behind the revenue numbers",
        icon: Banknote,
        keywords: ["revenue", "ledger", "money", "baht", "ceo"],
      },
      {
        href: "/admin/marketing",
        label: "Meta marketing",
        description: "Instagram reach, ad spend, paid seats",
        icon: Megaphone,
      },
      {
        href: "/admin/dm-leads/insights",
        label: "Lead insights",
        description: "Audience and lead analysis",
        icon: ScanSearch,
      },
      {
        href: "/admin/shift/views",
        label: "SHIFT page views",
        description: "Where visitors to the SHIFT pages come from",
        icon: Eye,
        keywords: ["traffic", "sources"],
      },
      {
        href: "/admin/hackathon/analytics",
        label: "Traffic and links",
        description: "Unique visitors, referrers and link events",
        icon: LineChart,
        keywords: ["analytics", "referrers", "visitors"],
      },
    ],
  },
  {
    id: "tools",
    label: "Tools and archive",
    items: [
      {
        href: "/admin/dm-leads/copilot",
        label: "DM copilot",
        description: "Messaging assistant",
        icon: Bot,
      },
      {
        href: "/admin/meta-webhooks",
        label: "Meta webhooks",
        description: "Integration diagnostics",
        icon: Webhook,
      },
      {
        href: "/admin/competitions",
        label: "Competitions",
        description: "Student opportunities",
        icon: Trophy,
      },
      {
        href: "/admin/hackathon",
        label: "Hackathon",
        description: "Teams, mentors and submissions",
        icon: Trophy,
      },
      {
        href: "/admin/shift/camp",
        label: "Interactive camp (legacy)",
        description: "SHIFT cohorts, groups, support queue",
        icon: Tent,
      },
      {
        href: "/admin/radar",
        label: "Radar",
        description: "Career content",
        icon: Radar,
      },
      {
        href: "/admin/radar-interview",
        label: "Radar interview",
        description: "Interview tools",
        icon: MessageCircle,
      },
      {
        href: "/admin/direction-finder",
        label: "Direction finder",
        description: "Student directions",
        icon: Compass,
      },
      {
        href: "/admin/analytics",
        label: "Product analytics",
        description: "Retention and activation",
        icon: BarChart3,
      },
      {
        href: "/admin/event-tracker",
        label: "Event tracker",
        description: "Platform activity",
        icon: Activity,
      },
      {
        href: "/admin/beta",
        label: "Beta registrations",
        description: "Early access signups",
        icon: FlaskConical,
      },
      {
        href: "/admin/archive",
        label: "Archive",
        description: "Universities and resources",
        icon: Archive,
      },
    ],
  },
];

export interface AdminNavEntry {
  item: AdminNavItem;
  group: AdminNavGroup;
}

/** Every nav item with its group, in sidebar order. */
export const ADMIN_NAV_ENTRIES: AdminNavEntry[] = ADMIN_NAV_GROUPS.flatMap(
  (group) => group.items.map((item) => ({ item, group })),
);

function normalizePath(pathname: string | null | undefined): string {
  if (!pathname) return "";
  const path = pathname.split(/[?#]/)[0];
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function matchBase(item: AdminNavItem): string {
  return item.section ?? item.href;
}

function itemMatches(item: AdminNavItem, path: string): boolean {
  if (path === item.href) return true;
  if (item.exact) return false;
  const base = matchBase(item);
  return path === base || path.startsWith(`${base}/`);
}

/** The nav entry for a path: the longest matching route wins. */
export function getActiveAdminEntry(
  pathname: string | null | undefined,
): AdminNavEntry | undefined {
  const path = normalizePath(pathname);
  if (!path) return undefined;
  let best: AdminNavEntry | undefined;
  for (const entry of ADMIN_NAV_ENTRIES) {
    if (!itemMatches(entry.item, path)) continue;
    if (!best || matchBase(entry.item).length > matchBase(best.item).length) {
      best = entry;
    }
  }
  return best;
}

export function getActiveAdminItem(
  pathname: string | null | undefined,
): AdminNavItem | undefined {
  return getActiveAdminEntry(pathname)?.item;
}

// ---------------------------------------------------------------------------
// Search: shared by the sidebar filter and the command palette
// ---------------------------------------------------------------------------

// Built at runtime: the tsconfig target predates Unicode property escapes.
const WORD_BREAK = new RegExp("[^\\p{L}\\p{M}\\p{N}]+", "u");

/** Lowercased words. Keeps Thai vowel and tone marks inside their word. */
export function tokenize(text: string): string[] {
  return text.toLowerCase().split(WORD_BREAK).filter(Boolean);
}

/**
 * Every query word must start a word in the item's label, keywords,
 * description, or group. Label hits rank highest. Returns 0 for no match.
 */
export function scoreAdminNavEntry(
  query: string,
  entry: AdminNavEntry,
): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;
  const label = tokenize(entry.item.label);
  const keywords = tokenize((entry.item.keywords ?? []).join(" "));
  const rest = tokenize(`${entry.item.description} ${entry.group.label}`);
  let score = 0;
  for (const token of tokens) {
    const starts = (word: string) => word.startsWith(token);
    if (label.some(starts)) score += 3;
    else if (keywords.some(starts)) score += 2;
    else if (rest.some(starts)) score += 1;
    else return 0;
  }
  const fullLabel = entry.item.label.toLowerCase();
  if (fullLabel.startsWith(query.trim().toLowerCase())) score += 5;
  return score;
}

/** Nav entries that match a query, best first, ties in sidebar order. */
export function matchAdminNav(query: string): AdminNavEntry[] {
  return ADMIN_NAV_ENTRIES.map((entry, index) => ({
    entry,
    index,
    score: scoreAdminNavEntry(query, entry),
  }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((hit) => hit.entry);
}
