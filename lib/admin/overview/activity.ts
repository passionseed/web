import "server-only";

import type { AdminActivityItem } from "@/lib/admin/console";
import { renderEvent } from "@/lib/brain/render";
import { parseBrainEvent } from "@/lib/brain/schema";
import { getShiftCohortByName } from "@/lib/content/shift-cohort";

import { applicationsHref } from "./cohort";
import { lazyServiceDb, type ServiceDb } from "./db";
import { embedded, errorMessage, timeoutSignal } from "./query";
import { addDays, bangkokDayKey, bangkokDayStart, hoursAgoIso } from "./time";

/** How far back the feed looks. */
export const ACTIVITY_WINDOW_HOURS = 72;
/** Rows read per source; the merged feed is cut to the caller's limit. */
const PER_SOURCE = 40;

type Rows<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

async function rowsOf<T>(query: Rows<T>): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error(errorMessage(error));
  return data ?? [];
}

/** Nickname or @handle; never a full name, email or phone. */
export function personLabel(nickname?: string | null, handle?: string | null): string | null {
  const nick = nickname?.trim();
  if (nick) return nick;
  const h = handle?.trim().replace(/^@+/, "");
  return h ? `@${h}` : null;
}

function baht(amount: number): string {
  return `฿${Math.round(amount).toLocaleString("en-US")}`;
}

const PLATFORM_LABEL: Record<string, string> = { instagram: "Instagram", facebook: "Facebook" };

/** "add_role_admin" -> "Role added: admin". Unknown actions are made readable. */
export function adminActionTitle(action: string): string {
  const role = /^(add|remove)_role_(.+)$/.exec(action);
  if (role) return `Role ${role[1] === "add" ? "added" : "removed"}: ${role[2]}`;
  const words = action.replace(/[_-]+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "Admin action";
}

/** Readable title for a brain_events row, or null when it is not a known event. */
export function brainEventTitle(
  row: { id: string; type: string; payload: unknown; created_at: string },
  today: string,
): string | null {
  const parsed = parseBrainEvent({ type: row.type, payload: row.payload });
  if (!parsed) return null;
  return renderEvent({ ...parsed, id: row.id, created_at: row.created_at }, today).summary;
}

/** One item per Bangkok day: "5 new signups". */
export function signupItems(createdAts: readonly string[], today: string): AdminActivityItem[] {
  const byDay = new Map<string, { count: number; latest: string }>();
  for (const at of createdAts) {
    const day = bangkokDayKey(at);
    if (!day) continue;
    const entry = byDay.get(day) ?? { count: 0, latest: at };
    entry.count += 1;
    if (at > entry.latest) entry.latest = at;
    byDay.set(day, entry);
  }
  return [...byDay].map(([day, { count, latest }]) => ({
    id: `signup:${day}`,
    kind: "signup" as const,
    at: latest,
    title: `${count} new signup${count === 1 ? "" : "s"}`,
    detail: day === today ? "Today" : day === addDays(today, -1) ? "Yesterday" : day,
    href: "/admin/users",
  }));
}

type Loader = (db: ServiceDb, since: string, today: string) => Promise<AdminActivityItem[]>;

const SOURCES: Record<string, Loader> = {
  async applications(db, since) {
    const rows = await rowsOf<{
      id: string;
      cohort: string;
      nickname: string | null;
      ig_handle: string | null;
      created_at: string;
    }>(
      db
        .from("shift_applications")
        .select("id, cohort, nickname, ig_handle, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(PER_SOURCE)
        .abortSignal(timeoutSignal()),
    );
    return rows.map((r) => ({
      id: `application:${r.id}`,
      kind: "application",
      at: r.created_at,
      title: `New SHIFT application: ${personLabel(r.nickname, r.ig_handle) ?? "applicant"}`,
      detail: r.cohort,
      href: applicationsHref(r.cohort, { id: r.id }),
    }));
  },

  async shiftPayments(db, since) {
    const rows = await rowsOf<{
      id: string;
      cohort: string;
      nickname: string | null;
      ig_handle: string | null;
      paid_at: string;
    }>(
      db
        .from("shift_applications")
        .select("id, cohort, nickname, ig_handle, paid_at")
        .gte("paid_at", since)
        .order("paid_at", { ascending: false })
        .limit(PER_SOURCE)
        .abortSignal(timeoutSignal()),
    );
    return rows.map((r) => {
      const price = getShiftCohortByName(r.cohort)?.priceBaht;
      return {
        id: `payment:shift:${r.id}`,
        kind: "payment",
        at: r.paid_at,
        title: `SHIFT seat paid: ${personLabel(r.nickname, r.ig_handle) ?? "applicant"}`,
        detail: price ? `${r.cohort}, ${baht(price)} list price` : r.cohort,
        href: applicationsHref(r.cohort, { id: r.id }),
      };
    });
  },

  async leads(db, since) {
    const rows = await rowsOf<{
      id: string;
      username: string | null;
      platform: string;
      created_at: string;
    }>(
      db
        .from("dm_conversations")
        .select("id, username, platform, created_at")
        .gte("created_at", since)
        .not("admin_tags", "cs", "{internal}")
        .order("created_at", { ascending: false })
        .limit(PER_SOURCE)
        .abortSignal(timeoutSignal()),
    );
    return rows.map((r) => {
      const platform = PLATFORM_LABEL[r.platform] ?? "DM";
      const who = personLabel(null, r.username);
      return {
        id: `lead:${r.id}`,
        kind: "lead",
        at: r.created_at,
        title: who ? `New DM lead: ${who}` : `New ${platform} lead`,
        detail: platform,
        href: `/admin/dm-leads/${r.id}`,
      };
    });
  },

  async trialSlips(db, since) {
    const rows = await rowsOf<{ id: string; updated_at: string; seed: unknown }>(
      db
        .from("trial_accesses")
        .select("id, updated_at, seed:seeds!seed_id(title)")
        .eq("status", "pending")
        .gte("updated_at", since)
        .order("updated_at", { ascending: false })
        .limit(PER_SOURCE)
        .abortSignal(timeoutSignal()),
    );
    return rows.map((r) => ({
      id: `trial:slip:${r.id}`,
      kind: "trial",
      at: r.updated_at,
      title: "PathLab trial slip to verify",
      detail: embedded(r.seed as { title?: string } | null)?.title ?? undefined,
      href: "/admin/trials",
    }));
  },

  async trialPayments(db, since) {
    const rows = await rowsOf<{
      id: string;
      paid_at: string;
      price_amount: number | null;
      seed: unknown;
    }>(
      db
        .from("trial_accesses")
        .select("id, paid_at, price_amount, seed:seeds!seed_id(title)")
        .eq("status", "paid")
        .gte("paid_at", since)
        .order("paid_at", { ascending: false })
        .limit(PER_SOURCE)
        .abortSignal(timeoutSignal()),
    );
    return rows.map((r) => {
      const seed = embedded(r.seed as { title?: string } | null)?.title;
      const price = r.price_amount ? baht(r.price_amount) : null;
      return {
        id: `payment:trial:${r.id}`,
        kind: "payment",
        at: r.paid_at,
        title: "PathLab trial paid",
        detail: [seed, price].filter(Boolean).join(", ") || undefined,
        href: "/admin/trials",
      };
    });
  },

  async experts(db, since) {
    const rows = await rowsOf<{
      id: string;
      name: string;
      title: string | null;
      company: string | null;
      created_at: string;
    }>(
      db
        .from("expert_profiles")
        .select("id, name, title, company, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(PER_SOURCE)
        .abortSignal(timeoutSignal()),
    );
    return rows.map((r) => ({
      id: `expert:${r.id}`,
      kind: "expert",
      at: r.created_at,
      title: `New expert interview: ${r.name}`,
      detail: [r.title, r.company].filter(Boolean).join(", ") || undefined,
      href: `/admin/experts?id=${encodeURIComponent(r.id)}`,
    }));
  },

  async signups(db, since, today) {
    // Signups are summed per Bangkok day, so read from the start of the day
    // the window opens on. Reading from `since` itself would label a partial
    // count (only the hours after `since`) as that whole day's signups.
    const sinceDay = bangkokDayKey(since);
    const from = sinceDay ? bangkokDayStart(sinceDay).toISOString() : since;
    const rows = await rowsOf<{ created_at: string }>(
      db
        .from("profiles")
        .select("created_at")
        .gte("created_at", from)
        .order("created_at", { ascending: false })
        .limit(2000)
        .abortSignal(timeoutSignal()),
    );
    return signupItems(
      rows.map((r) => r.created_at),
      today,
    );
  },

  async program(db, since, today) {
    const rows = await rowsOf<{ id: string; type: string; payload: unknown; created_at: string }>(
      db
        .from("brain_events")
        .select("id, type, payload, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(PER_SOURCE)
        .abortSignal(timeoutSignal()),
    );
    return rows.flatMap((r) => {
      const title = brainEventTitle(r, today);
      if (!title) return [];
      return [
        {
          id: `program:${r.id}`,
          kind: "program" as const,
          at: r.created_at,
          title,
          href: r.type.startsWith("shift_round") ? "/admin/shift/rounds" : undefined,
        },
      ];
    });
  },

  async admin(db, since) {
    const rows = await rowsOf<{
      id: string;
      action: string;
      target_resource_type: string | null;
      created_at: string;
    }>(
      db
        .from("admin_activity_log")
        .select("id, action, target_resource_type, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(PER_SOURCE)
        .abortSignal(timeoutSignal()),
    );
    return rows.map((r) => ({
      id: `admin:${r.id}`,
      kind: "admin",
      at: r.created_at,
      title: adminActionTitle(r.action),
      href:
        r.target_resource_type === "user_role" || r.target_resource_type === "profile"
          ? "/admin/users"
          : undefined,
    }));
  },
};

/** Newest first, ties broken by id so the order is stable across reloads. */
export function mergeActivity(lists: AdminActivityItem[][], limit: number): AdminActivityItem[] {
  return lists
    .flat()
    .filter((item) => Number.isFinite(Date.parse(item.at)))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((item) => {
      const clean: AdminActivityItem = { id: item.id, kind: item.kind, at: item.at, title: item.title };
      if (item.detail) clean.detail = item.detail;
      if (item.href) clean.href = item.href;
      return clean;
    });
}

/**
 * What happened in the last 72 hours across applications, payments, leads,
 * trials, experts, signups, program changes and admin actions. Never throws:
 * an unreadable source is left out.
 */
export async function getAdminActivity(limit = 20): Promise<AdminActivityItem[]> {
  try {
    const now = new Date();
    const since = hoursAgoIso(ACTIVITY_WINDOW_HOURS, now);
    const today = bangkokDayKey(now) as string;
    const db = lazyServiceDb();
    const settled = await Promise.allSettled(
      Object.values(SOURCES).map((load) => Promise.resolve().then(() => load(db(), since, today))),
    );
    const lists = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const safeLimit = Math.min(Math.max(Math.trunc(limit) || 20, 1), 100);
    return mergeActivity(lists, safeLimit);
  } catch {
    return [];
  }
}

/** Exported for tests. */
export const ACTIVITY_SOURCES = SOURCES;
