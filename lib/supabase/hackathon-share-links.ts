import "server-only";

import { linkSource, shareCode, sharePhase, type ShareKind } from "@/lib/hackathon/elemental/share";
import { newTeacherCode, newTeacherToken } from "@/lib/hackathon/elemental/share-codes";
import { codeIdRange, shareLinkView, type ShareLinkView } from "@/lib/hackathon/elemental/share-rules";
import { createAdminClient } from "@/utils/supabase/admin";

import { isPayToken, isUniqueViolation, type RegistrationStatus } from "./hackathon-event-registrations";
import { linkStats } from "./hackathon-link-views";
import { storyProofStatus } from "./hackathon-story-proofs";

/**
 * Elemental share links (hackathon_share_links; rules in
 * lib/hackathon/elemental/share-rules.ts). A link counts devices and paid
 * sign-ups; sharing earns looks only, never a seat. Service role only: the
 * share pages hold a pay token or a teacher token, the admin page calls
 * requireAdmin() first. Every caller wraps these in try/catch, so pages keep
 * working before the migration is applied.
 */

export type ShareLink = {
  id: string;
  kind: ShareKind;
  code: string;
  registrationId: string | null;
  schoolKey: string;
  schoolName: string;
  province: string | null;
  /** Teachers only, for staff: never on a public page. */
  token: string | null;
  teacherName: string | null;
  teacherContact: string | null;
  teacherPhone: string | null;
  createdAt: string;
  /** A student link's sign-up status. */
  registrationStatus: string | null;
};

type LinkRow = {
  id: string;
  kind: ShareKind;
  code: string;
  registration_id: string | null;
  school_key: string;
  school_name: string;
  province: string | null;
  token: string | null;
  teacher_name: string | null;
  teacher_contact: string | null;
  teacher_phone: string | null;
  created_at: string;
  registration?: { status: string } | { status: string }[] | null;
};

const LINK_COLUMNS =
  "id, kind, code, registration_id, school_key, school_name, province, token, teacher_name, teacher_contact, teacher_phone, created_at, registration:hackathon_event_registrations!registration_id(status)";

const toLink = (r: LinkRow): ShareLink => ({
  id: r.id,
  kind: r.kind,
  code: r.code,
  registrationId: r.registration_id,
  schoolKey: r.school_key,
  schoolName: r.school_name,
  province: r.province,
  token: r.token,
  teacherName: r.teacher_name,
  teacherContact: r.teacher_contact,
  teacherPhone: r.teacher_phone,
  createdAt: r.created_at,
  registrationStatus: (Array.isArray(r.registration) ? r.registration[0]?.status : r.registration?.status) ?? null,
});

export type School = { key: string; name: string; province: string | null };

/* ------------------------------------------------------------------ */
/* Sign-ups                                                            */
/* ------------------------------------------------------------------ */

/** What the share page needs about a sign-up, found by its pay token. */
export type ShareContext = {
  id: string;
  status: RegistrationStatus;
  /** The school typed at sign-up, to start the search with. */
  school: string | null;
  teamId: string | null;
};

export async function getShareContext(token: string): Promise<ShareContext | null> {
  if (!isPayToken(token)) return null;
  const { data, error } = await createAdminClient()
    .from("hackathon_event_registrations")
    .select("id, status, team_id, hackathon_event_registration_members(position, school)")
    .eq("pay_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const first = [...(data.hackathon_event_registration_members ?? [])].sort((a, b) => a.position - b.position)[0];
  return { id: data.id, status: data.status as RegistrationStatus, school: first?.school ?? null, teamId: data.team_id ?? null };
}

/** Whether a sign-up of this event already has `code` (the first 8 hex of its id), so a teacher's code never collides with one. */
async function codeUsedBySignUp(eventSlug: string, code: string): Promise<boolean> {
  const { from, to } = codeIdRange(code);
  const { data, error } = await createAdminClient()
    .from("hackathon_event_registrations")
    .select("id")
    .eq("event_slug", eventSlug)
    .gte("id", from)
    .lte("id", to)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

/* ------------------------------------------------------------------ */
/* Links                                                               */
/* ------------------------------------------------------------------ */

export async function getStudentLink(registrationId: string): Promise<ShareLink | null> {
  const { data, error } = await createAdminClient()
    .from("hackathon_share_links")
    .select(LINK_COLUMNS)
    .eq("registration_id", registrationId)
    .maybeSingle();
  if (error) throw error;
  return data ? toLink(data as LinkRow) : null;
}

export async function getTeacherLink(token: string): Promise<ShareLink | null> {
  const { data, error } = await createAdminClient()
    .from("hackathon_share_links")
    .select(LINK_COLUMNS)
    .eq("token", token)
    .eq("kind", "teacher")
    .maybeSingle();
  if (error) throw error;
  return data ? toLink(data as LinkRow) : null;
}

/** Which kind of link a poster code belongs to, or null if none. */
export async function findLinkKind(eventSlug: string, code: string): Promise<ShareKind | null> {
  const { data, error } = await createAdminClient()
    .from("hackathon_share_links")
    .select("kind")
    .eq("event_slug", eventSlug)
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return (data?.kind as ShareKind | undefined) ?? null;
}

export type SetSchoolResult = { ok: true; link: ShareLink } | { ok: false; reason: "code_taken" };

/**
 * A student picks their school, which makes their link, or changes it. It can
 * change any time while sign-up is open (staff see it on the admin list).
 */
export async function setStudentSchool(
  eventSlug: string,
  self: { id: string; status: string },
  school: School,
): Promise<SetSchoolResult> {
  const db = createAdminClient();
  const existing = await getStudentLink(self.id);
  if (existing) {
    if (existing.schoolKey === school.key) return { ok: true, link: existing };
    const { data, error } = await db
      .from("hackathon_share_links")
      .update({ school_key: school.key, school_name: school.name, province: school.province, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select(LINK_COLUMNS)
      .single();
    if (error) throw error;
    return { ok: true, link: toLink(data as LinkRow) };
  }
  const { data, error } = await db
    .from("hackathon_share_links")
    .insert({
      event_slug: eventSlug,
      kind: "student",
      code: shareCode(self.id),
      registration_id: self.id,
      school_key: school.key,
      school_name: school.name,
      province: school.province,
    })
    .select(LINK_COLUMNS)
    .single();
  if (error) {
    if (isUniqueViolation(error)) {
      // Two taps at once: the other one made the link.
      const again = await getStudentLink(self.id);
      if (again) return { ok: true, link: again };
      return { ok: false, reason: "code_taken" };
    }
    throw error;
  }
  return { ok: true, link: toLink(data as LinkRow) };
}

export type CreateTeacherResult = { ok: true; token: string; code: string } | { ok: false; reason: "exists" };

/**
 * A teacher's link. Its code is 8 random hex digits that no link and no
 * sign-up's code already uses; the token is the private page's key.
 */
export async function createTeacherLink(
  eventSlug: string,
  input: { name: string; school: School; contact: string; contactKey: string; phone: string | null },
): Promise<CreateTeacherResult> {
  const db = createAdminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newTeacherCode();
    if (await codeUsedBySignUp(eventSlug, code)) continue;
    const token = newTeacherToken();
    const { error } = await db.from("hackathon_share_links").insert({
      event_slug: eventSlug,
      kind: "teacher",
      code,
      token,
      school_key: input.school.key,
      school_name: input.school.name,
      province: input.school.province,
      teacher_name: input.name,
      teacher_contact: input.contact,
      teacher_contact_key: input.contactKey,
      teacher_phone: input.phone,
    });
    if (!error) return { ok: true, token, code };
    if (!isUniqueViolation(error)) throw error;
    if (error.message.includes("teacher_contact")) return { ok: false, reason: "exists" };
    // The code was taken: try another.
  }
  throw new Error("Could not find a free teacher code");
}

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

/**
 * What the share page or the teacher page shows for one link, fresh: its
 * devices and paid sign-ups (up to close), the phase, and for a student
 * their own story proof.
 */
export async function linkView(eventSlug: string, link: ShareLink): Promise<ShareLinkView> {
  const source = linkSource(link.kind, link.code);
  const [stats, storyProof] = await Promise.all([
    linkStats(eventSlug, [source]),
    link.kind === "student" && link.registrationId ? storyProofStatus(link.registrationId) : Promise.resolve("none" as const),
  ]);
  return shareLinkView({ link, counts: stats.get(source) ?? { devices: 0, paid: 0 }, phase: sharePhase(), storyProof });
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export type AdminShareLink = ShareLink & { devices: number; paid: number };

const PAGE = 1000;

/** Every link of the event with its numbers, most devices first, for the admin tracking list. */
export async function listShareLinksForAdmin(eventSlug: string): Promise<AdminShareLink[]> {
  const db = createAdminClient();
  const links: ShareLink[] = [];
  for (let from = 0; from < 100 * PAGE; from += PAGE) {
    const { data, error } = await db
      .from("hackathon_share_links")
      .select(LINK_COLUMNS)
      .eq("event_slug", eventSlug)
      .order("created_at")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    links.push(...((data ?? []) as LinkRow[]).map(toLink));
    if (!data || data.length < PAGE) break;
  }
  if (links.length === 0) return [];
  const stats = await linkStats(eventSlug, "all");
  return links
    .map((l) => ({ ...l, ...(stats.get(linkSource(l.kind, l.code)) ?? { devices: 0, paid: 0 }) }))
    .sort((a, b) => b.devices - a.devices || b.paid - a.paid || a.createdAt.localeCompare(b.createdAt));
}
