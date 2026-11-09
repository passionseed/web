import { getActiveAdminEntry } from "@/components/admin/admin-navigation";

export interface AdminCrumb {
  label: string;
  /** Absent on the current page and on segments with no page of their own. */
  href?: string;
}

/**
 * Admin routes that render a page, as App Router patterns. Breadcrumbs only
 * link to these, so a crumb never points at a 404. A test checks that each
 * pattern still has a page.tsx.
 */
export const ADMIN_PAGE_PATTERNS: readonly string[] = [
  "/admin",
  "/admin/analytics",
  "/admin/archive",
  "/admin/archive/ai",
  "/admin/archive/universities",
  "/admin/archive/universities/[universityId]/example-maps/[mapId]",
  "/admin/archive/universities/[universityId]/example-maps/create",
  "/admin/beta",
  "/admin/calendar",
  "/admin/ceo",
  "/admin/ceo/payments",
  "/admin/ceo/sync-hackathon-data",
  "/admin/competitions",
  "/admin/direction-finder",
  "/admin/dm-leads",
  "/admin/dm-leads/[id]",
  "/admin/dm-leads/campaign",
  "/admin/dm-leads/copilot",
  "/admin/dm-leads/insights",
  "/admin/event-tracker",
  "/admin/experts",
  "/admin/hackathon",
  "/admin/hackathon/activities",
  "/admin/hackathon/activities/[activityId]/clusters",
  "/admin/hackathon/activities/editor",
  "/admin/hackathon/analytics",
  "/admin/hackathon/email-sender",
  "/admin/hackathon/gallery",
  "/admin/hackathon/learning",
  "/admin/hackathon/mentors",
  "/admin/hackathon/participants",
  "/admin/hackathon/push-sender",
  "/admin/hackathon/questionnaire",
  "/admin/hackathon/team-directions",
  "/admin/hackathon/team-finder",
  "/admin/hackathon/team-submissions",
  "/admin/hackathon/teams",
  "/admin/ig-comments",
  "/admin/line",
  "/admin/maps",
  "/admin/meta-webhooks",
  "/admin/radar",
  "/admin/radar/[fieldId]",
  "/admin/radar-interview",
  "/admin/shift",
  "/admin/shift/alumni",
  "/admin/shift/alumni/board",
  "/admin/shift/applications",
  "/admin/shift/camp",
  "/admin/shift/companion",
  "/admin/shift/curriculum",
  "/admin/shift/feedback",
  "/admin/shift/interest",
  "/admin/shift/rounds",
  "/admin/shift/rounds/[roundId]",
  "/admin/shift/rounds/[roundId]/attendance",
  "/admin/shift/rounds/[roundId]/certificates",
  "/admin/shift/rounds/[roundId]/entrants",
  "/admin/shift/rounds/[roundId]/entrants/[entryId]",
  "/admin/shift/rounds/[roundId]/review",
  "/admin/shift/rounds/[roundId]/settings",
  "/admin/shift/rounds/[roundId]/squads",
  "/admin/shift/rounds/[roundId]/summaries",
  "/admin/shift/rounds/ops",
  "/admin/shift/seedstack",
  "/admin/shift/views",
  "/admin/talent",
  "/admin/team-matching-simulator",
  "/admin/trials",
  "/admin/users",
];

/**
 * Crumb names for pages whose title says more than their slug. Keyed by
 * pattern, so they match the page's own AdminPageHeader title.
 */
const PAGE_LABELS: Record<string, string> = {
  "/admin/archive/ai": "AI agents",
  "/admin/archive/universities/[universityId]/example-maps/[mapId]":
    "Edit example map",
  "/admin/archive/universities/[universityId]/example-maps/create":
    "New example map",
  "/admin/hackathon/activities/editor": "Activity editor",
  "/admin/hackathon/learning": "Learning analytics",
};

/**
 * Path segments with no page of their own that only add noise to the trail,
 * e.g. "Universities / University / Example maps / Edit example map".
 */
const SKIPPED_CRUMB_PATTERNS: readonly string[] = [
  "/admin/archive/universities/[universityId]",
  "/admin/archive/universities/[universityId]/example-maps",
];

/** Readable names for slugs that title case gets wrong. */
const SEGMENT_LABELS: Record<string, string> = {
  ai: "AI",
  ceo: "CEO dashboard",
  shift: "SHIFT",
  create: "New",
  ops: "Flags and jobs",
};

/** Short names for a record ID, keyed by the segment before it. */
const ID_LABELS: Record<string, string> = {
  rounds: "Round",
  entrants: "Entrant",
  "dm-leads": "Lead",
  radar: "Field",
  universities: "University",
  "example-maps": "Example map",
  activities: "Activity",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UUIDs, numbers, and long tokens with digits are record IDs, not slugs. */
export function isIdSegment(segment: string): boolean {
  if (UUID.test(segment) || /^\d+$/.test(segment)) return true;
  return (
    segment.length >= 12 && /\d/.test(segment) && !/^[a-z-]+$/.test(segment)
  );
}

function humanize(slug: string): string {
  const words = slug.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function segmentLabel(segment: string, previous?: string): string {
  if (isIdSegment(segment))
    return (previous && ID_LABELS[previous]) || "Details";
  return SEGMENT_LABELS[segment] ?? humanize(decodeSegment(segment));
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function matchesPattern(pattern: string[], segments: string[]): boolean {
  return (
    pattern.length === segments.length &&
    pattern.every((part, i) => part.startsWith("[") || part === segments[i])
  );
}

const dynamicCount = (pattern: string[]) =>
  pattern.filter((part) => part.startsWith("[")).length;

const PATTERN_SEGMENTS = ADMIN_PAGE_PATTERNS.map((pattern) => ({
  pattern,
  parts: splitPath(pattern),
}));

const SKIPPED_SEGMENTS = SKIPPED_CRUMB_PATTERNS.map(splitPath);

/**
 * The page pattern a path renders, or undefined. A literal segment beats a
 * dynamic one, so ".../example-maps/create" is the create page, not [mapId].
 */
function findPagePattern(pathname: string): string | undefined {
  const segments = splitPath(pathname);
  let best: { pattern: string; parts: string[] } | undefined;
  for (const candidate of PATTERN_SEGMENTS) {
    if (!matchesPattern(candidate.parts, segments)) continue;
    if (!best || dynamicCount(candidate.parts) < dynamicCount(best.parts)) {
      best = candidate;
    }
  }
  return best?.pattern;
}

/** True when the path renders one of the known admin pages. */
export function isKnownAdminPage(pathname: string): boolean {
  return findPagePattern(pathname) !== undefined;
}

/**
 * The trail for an admin path: Admin, then the nav item that owns it, then a
 * readable crumb for each deeper segment. Record IDs become short labels such
 * as "Round" or "Lead". Paths outside the nav fall back to their own segments.
 */
export function getAdminBreadcrumbs(
  pathname: string | null | undefined,
): AdminCrumb[] {
  const path =
    (pathname ?? "").split(/[?#]/)[0].replace(/\/+$/, "") || "/admin";
  const root: AdminCrumb = { label: "Admin", href: "/admin" };
  if (path === "/admin" || !path.startsWith("/admin/")) {
    return [root, { label: "Overview" }];
  }

  const crumbs: AdminCrumb[] = [root];
  const entry = getActiveAdminEntry(path);
  let base = "/admin";
  if (entry) {
    crumbs.push({ label: entry.item.label, href: entry.item.href });
    if (path.startsWith(entry.item.href)) base = entry.item.href;
  }

  const rest = path.slice(base.length).split("/").filter(Boolean);
  let current = base;
  let previous: string | undefined = base.split("/").pop();
  for (const segment of rest) {
    current = `${current}/${segment}`;
    const label = segmentLabel(segment, previous);
    previous = segment;
    const segments = splitPath(current);
    if (
      current !== path &&
      SKIPPED_SEGMENTS.some((pattern) => matchesPattern(pattern, segments))
    ) {
      continue;
    }
    const page = findPagePattern(current);
    crumbs.push({
      label: (page && PAGE_LABELS[page]) || label,
      href: page ? current : undefined,
    });
  }

  const last = crumbs[crumbs.length - 1];
  crumbs[crumbs.length - 1] = { label: last.label };
  return crumbs;
}

/** Label and context for a path, e.g. "Review" in "Rounds / Round". */
export function describeAdminPath(pathname: string): {
  label: string;
  context: string;
} {
  const crumbs = getAdminBreadcrumbs(pathname);
  const label = crumbs[crumbs.length - 1].label;
  const middle = crumbs.slice(1, -1).map((crumb) => crumb.label);
  if (middle.length > 0) return { label, context: middle.join(" / ") };
  const entry = getActiveAdminEntry(pathname);
  return { label, context: entry?.group.label ?? "Admin" };
}
