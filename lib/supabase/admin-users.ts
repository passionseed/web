/**
 * Admin user directory: paginated, searchable reads over `profiles` joined with
 * `user_roles`, plus guarded role changes. The functions take the Supabase
 * client as an argument; API routes pass the service-role client only after
 * their admin check. The parse and filter helpers are pure, so the client
 * component and the tests share them.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildIlikeSearchFilter,
  isUuid,
  normalizeSearch,
  pageRange,
  parsePositiveInt,
  totalPages,
} from "./admin-list-params";

export {
  buildIlikeSearchFilter,
  isUuid,
  normalizeSearch,
  pageRange,
  parsePositiveInt,
  searchTokens,
  totalPages,
} from "./admin-list-params";

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const ADMIN_USER_ROLES = [
  "student",
  "TA",
  "instructor",
  "admin",
  "beta-tester",
  "passion-seed-team",
] as const;

export type AdminUserRole = (typeof ADMIN_USER_ROLES)[number];

/** One of these is the user's "primary" role; switching swaps between them. */
export const PRIMARY_ROLES = ["student", "TA", "instructor"] as const;

export type PrimaryRole = (typeof PRIMARY_ROLES)[number];

export const ROLE_LABELS: Record<AdminUserRole, string> = {
  student: "Student",
  TA: "Moderator",
  instructor: "Instructor",
  admin: "Admin",
  "beta-tester": "Beta tester",
  "passion-seed-team": "PassionSeed team",
};

export function isAdminUserRole(value: unknown): value is AdminUserRole {
  return typeof value === "string" && (ADMIN_USER_ROLES as readonly string[]).includes(value);
}

export function isPrimaryRole(value: unknown): value is PrimaryRole {
  return typeof value === "string" && (PRIMARY_ROLES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// List query: URL params <-> typed query
// ---------------------------------------------------------------------------

export const ADMIN_USERS_PAGE_SIZE = 25;
export const ADMIN_USERS_MAX_PAGE_SIZE = 100;

export type AdminUsersSort = "newest" | "oldest";

export interface AdminUsersQuery {
  q: string;
  role: AdminUserRole | null;
  page: number;
  pageSize: number;
  sort: AdminUsersSort;
  /** A single user to open; IDs only, never names or emails in URLs. */
  id: string | null;
}

export const DEFAULT_ADMIN_USERS_QUERY: AdminUsersQuery = {
  q: "",
  role: null,
  page: 1,
  pageSize: ADMIN_USERS_PAGE_SIZE,
  sort: "newest",
  id: null,
};

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(source: ParamSource, key: string): string | null {
  if (source instanceof URLSearchParams) return source.get(key);
  const value = source[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function parseAdminUsersQuery(source: ParamSource): AdminUsersQuery {
  const role = readParam(source, "role");
  const id = readParam(source, "id");
  return {
    q: normalizeSearch(readParam(source, "q")),
    role: isAdminUserRole(role) ? role : null,
    page: parsePositiveInt(readParam(source, "page"), 1),
    pageSize: parsePositiveInt(readParam(source, "pageSize"), ADMIN_USERS_PAGE_SIZE, ADMIN_USERS_MAX_PAGE_SIZE),
    sort: readParam(source, "sort") === "oldest" ? "oldest" : "newest",
    id: isUuid(id) ? id.toLowerCase() : null,
  };
}

/** Serialise a query, dropping defaults so URLs stay short. */
export function adminUsersQueryToParams(
  query: Partial<AdminUsersQuery>,
  { includeId = true }: { includeId?: boolean } = {},
): URLSearchParams {
  const params = new URLSearchParams();
  const q = normalizeSearch(query.q);
  if (q) params.set("q", q);
  if (query.role) params.set("role", query.role);
  if (query.sort === "oldest") params.set("sort", "oldest");
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.pageSize && query.pageSize !== ADMIN_USERS_PAGE_SIZE) {
    params.set("pageSize", String(query.pageSize));
  }
  if (includeId && query.id) params.set("id", query.id);
  return params;
}

// ---------------------------------------------------------------------------
// Search filter
// ---------------------------------------------------------------------------

export const USER_SEARCH_COLUMNS = ["username", "full_name", "email"] as const;
export function buildUserSearchFilter(raw: string): string | null {
  return buildIlikeSearchFilter(raw, USER_SEARCH_COLUMNS);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Explicit columns only: no birth dates or other sensitive fields. */
export const ADMIN_USER_PROFILE_COLUMNS =
  "id, username, full_name, email, avatar_url, discord_uid, created_at";

export interface AdminUserRow {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  discord_uid: string | null;
  created_at: string | null;
  roles: AdminUserRole[];
}

export interface AdminUsersPage {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function userDisplayName(user: Pick<AdminUserRow, "full_name" | "username" | "email">): string {
  return user.full_name || user.username || user.email || "Unnamed user";
}

interface ProfileRecord {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  discord_uid: string | null;
  created_at: string | null;
}

function sortRoles(roles: AdminUserRole[]): AdminUserRole[] {
  return [...roles].sort((a, b) => ADMIN_USER_ROLES.indexOf(a) - ADMIN_USER_ROLES.indexOf(b));
}

async function rolesForUsers(client: SupabaseClient, ids: string[]): Promise<Map<string, AdminUserRole[]>> {
  const byUser = new Map<string, AdminUserRole[]>();
  if (ids.length === 0) return byUser;

  const { data, error } = await client.from("user_roles").select("user_id, role").in("user_id", ids);
  if (error) throw new Error(`Failed to load roles: ${error.message}`);

  for (const row of (data ?? []) as { user_id: string; role: string }[]) {
    if (!isAdminUserRole(row.role)) continue;
    const list = byUser.get(row.user_id) ?? [];
    list.push(row.role);
    byUser.set(row.user_id, list);
  }
  return byUser;
}

function toRow(profile: ProfileRecord, roles: AdminUserRole[] | undefined): AdminUserRow {
  return {
    id: profile.id,
    email: profile.email ?? null,
    username: profile.username ?? null,
    full_name: profile.full_name ?? null,
    avatar_url: profile.avatar_url ?? null,
    discord_uid: profile.discord_uid ?? null,
    created_at: profile.created_at ?? null,
    roles: sortRoles(roles ?? []),
  };
}

/**
 * One page of users. The role filter is an inner join on `user_roles`, so the
 * count and the page both come from one query; roles for the page are then
 * read for those IDs only. Throws on a database error (the route maps it to a
 * 500 so the UI can show a real error state).
 *
 * A page past the end (a stale or shared link, or a filter that shrank the
 * list) is served as the last page, and `page` says which page that is.
 * PostgREST answers such a range with 416 (PGRST103) and no count, so the
 * total then comes from a head count with the same filters.
 */
export async function listAdminUsers(client: SupabaseClient, query: AdminUsersQuery): Promise<AdminUsersPage> {
  const columns = query.role
    ? `${ADMIN_USER_PROFILE_COLUMNS}, user_roles!inner(role)`
    : ADMIN_USER_PROFILE_COLUMNS;
  const search = buildUserSearchFilter(query.q);

  const filtered = (select: string, options: { count: "exact"; head?: boolean }) => {
    let request = client.from("profiles").select(select, options);
    if (query.role) request = request.eq("user_roles.role", query.role);
    if (search) request = request.or(search);
    return request;
  };

  /** One page; `total` is null when PostgREST said the page is past the end. */
  const readPage = async (page: number): Promise<{ profiles: ProfileRecord[]; total: number | null }> => {
    const { from, to } = pageRange(page, query.pageSize);
    const { data, count, error } = await filtered(columns, { count: "exact" })
      .order("created_at", { ascending: query.sort === "oldest", nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, to);
    if (error?.code === "PGRST103") return { profiles: [], total: null };
    if (error) throw new Error(`Failed to load users: ${error.message}`);
    const profiles = (data ?? []) as unknown as ProfileRecord[];
    return { profiles, total: count ?? profiles.length };
  };

  const result = async (page: number, profiles: ProfileRecord[], total: number): Promise<AdminUsersPage> => {
    const roles = await rolesForUsers(
      client,
      profiles.map((p) => p.id),
    );
    return {
      users: profiles.map((p) => toRow(p, roles.get(p.id))),
      total,
      page,
      pageSize: query.pageSize,
      totalPages: totalPages(total, query.pageSize),
    };
  };

  const requested = await readPage(query.page);
  if (requested.profiles.length > 0 || query.page <= 1) {
    return result(query.page, requested.profiles, requested.total ?? 0);
  }

  let total = requested.total;
  if (total === null) {
    const { count, error } = await filtered(query.role ? "id, user_roles!inner(role)" : "id", {
      count: "exact",
      head: true,
    });
    if (error) throw new Error(`Failed to count users: ${error.message}`);
    total = count ?? 0;
  }
  const lastPage = totalPages(total, query.pageSize);
  if (lastPage === 0) return result(1, [], 0);
  if (lastPage >= query.page) return result(query.page, [], total);
  const last = await readPage(lastPage);
  return result(lastPage, last.profiles, last.total ?? total);
}

export async function getAdminUser(client: SupabaseClient, id: string): Promise<AdminUserRow | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await client
    .from("profiles")
    .select(ADMIN_USER_PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load user: ${error.message}`);
  if (!data) return null;
  const roles = await rolesForUsers(client, [id]);
  return toRow(data as unknown as ProfileRecord, roles.get(id));
}

// ---------------------------------------------------------------------------
// Role changes
// ---------------------------------------------------------------------------

export type RoleChangeAction = "add" | "remove" | "set_primary";

export interface RoleChangeRequest {
  userId: string;
  role: AdminUserRole;
  action: RoleChangeAction;
}

export function parseRoleChangeRequest(
  body: unknown,
): { ok: true; value: RoleChangeRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Missing request body" };
  const { userId, role, action } = body as Record<string, unknown>;
  if (!userId || !role || !action) {
    return { ok: false, error: "Missing required fields: userId, role, action" };
  }
  if (!isUuid(userId)) return { ok: false, error: "Invalid user ID" };
  if (!isAdminUserRole(role)) return { ok: false, error: "Invalid role" };
  if (action !== "add" && action !== "remove" && action !== "set_primary") {
    return { ok: false, error: "Action must be 'add', 'remove' or 'set_primary'" };
  }
  if (action === "set_primary" && !isPrimaryRole(role)) {
    return { ok: false, error: "Primary role must be student, moderator or instructor" };
  }
  return { ok: true, value: { userId: userId.toLowerCase(), role, action } };
}

export const SELF_DEMOTION_ERROR =
  "You cannot remove your own admin role. Ask another admin to do it.";

/**
 * Guards that do not need the database. Returns an error message, or null when
 * the change may go ahead. Removing your own admin role is blocked so the team
 * can never lock itself out by accident.
 */
export function roleChangeGuard(actorId: string, change: RoleChangeRequest): string | null {
  if (
    change.action === "remove" &&
    change.role === "admin" &&
    change.userId.toLowerCase() === actorId.toLowerCase()
  ) {
    return SELF_DEMOTION_ERROR;
  }
  return null;
}

/** Client-side mirror of the guard, for disabling the control up front. */
export function canRemoveAdminRole(actorId: string | null | undefined, targetUserId: string): boolean {
  if (!actorId) return false;
  return actorId.toLowerCase() !== targetUserId.toLowerCase();
}

/**
 * Plan a primary-role switch: add the new role first, then remove the other
 * primary roles. Adding first means a failure can never leave the user with
 * no role at all.
 */
export function planPrimaryRoleChange(
  current: readonly string[],
  next: PrimaryRole,
): { add: PrimaryRole | null; remove: PrimaryRole[] } {
  return {
    add: current.includes(next) ? null : next,
    remove: PRIMARY_ROLES.filter((r) => r !== next && current.includes(r)),
  };
}

export type RoleChangeResult =
  | { status: "ok"; message: string; added: AdminUserRole[]; removed: AdminUserRole[] }
  | {
      status: "partial";
      message: string;
      added: AdminUserRole[];
      removed: AdminUserRole[];
      failed: AdminUserRole[];
    }
  | { status: "error"; httpStatus: number; message: string };

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

async function insertRole(
  client: SupabaseClient,
  userId: string,
  role: AdminUserRole,
): Promise<{ ok: true; alreadyHad: boolean } | { ok: false; httpStatus: number; message: string }> {
  const { error } = await client.from("user_roles").insert({ user_id: userId, role });
  if (!error) return { ok: true, alreadyHad: false };
  if (error.code === UNIQUE_VIOLATION) return { ok: true, alreadyHad: true };
  if (error.code === FOREIGN_KEY_VIOLATION) {
    return { ok: false, httpStatus: 404, message: "User not found" };
  }
  return { ok: false, httpStatus: 500, message: "Failed to update user role" };
}

/** Apply a validated, guarded role change with the service-role client. */
export async function applyRoleChange(client: SupabaseClient, change: RoleChangeRequest): Promise<RoleChangeResult> {
  const { userId, role, action } = change;
  const label = ROLE_LABELS[role];

  if (action === "add") {
    const inserted = await insertRole(client, userId, role);
    if (!inserted.ok) return { status: "error", httpStatus: inserted.httpStatus, message: inserted.message };
    return {
      status: "ok",
      message: inserted.alreadyHad ? `User already has the ${label} role` : `${label} role added`,
      added: inserted.alreadyHad ? [] : [role],
      removed: [],
    };
  }

  if (action === "remove") {
    const { error } = await client.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) return { status: "error", httpStatus: 500, message: "Failed to update user role" };
    return { status: "ok", message: `${label} role removed`, added: [], removed: [role] };
  }

  // set_primary
  if (!isPrimaryRole(role)) {
    return { status: "error", httpStatus: 400, message: "Primary role must be student, moderator or instructor" };
  }
  const { data: currentRows, error: readError } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (readError) return { status: "error", httpStatus: 500, message: "Failed to read current roles" };

  const plan = planPrimaryRoleChange(
    ((currentRows ?? []) as { role: string }[]).map((r) => r.role),
    role,
  );
  const added: AdminUserRole[] = [];

  if (plan.add) {
    const inserted = await insertRole(client, userId, plan.add);
    if (!inserted.ok) return { status: "error", httpStatus: inserted.httpStatus, message: inserted.message };
    if (!inserted.alreadyHad) added.push(plan.add);
  }

  if (plan.remove.length > 0) {
    const { error } = await client
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .in("role", plan.remove);
    if (error) {
      const leftover = plan.remove.map((r) => ROLE_LABELS[r]).join(", ");
      return {
        status: "partial",
        message: `${label} role added, but ${leftover} could not be removed. Remove it by hand.`,
        added,
        removed: [],
        failed: plan.remove,
      };
    }
  }

  return {
    status: "ok",
    message: added.length === 0 && plan.remove.length === 0 ? `Already ${label}` : `Primary role set to ${label}`,
    added,
    removed: plan.remove,
  };
}

// ---------------------------------------------------------------------------
// Profile edits
// ---------------------------------------------------------------------------

export interface ProfileUpdate {
  username?: string;
  full_name?: string | null;
  discord_uid?: string | null;
}

export function parseProfileUpdate(
  body: unknown,
): { ok: true; userId: string; update: ProfileUpdate } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Missing request body" };
  const { userId, username, full_name, discord_uid } = body as Record<string, unknown>;
  if (!isUuid(userId)) return { ok: false, error: "User ID is required" };

  const update: ProfileUpdate = {};
  if (username !== undefined) {
    if (typeof username !== "string" || !username.trim()) {
      return { ok: false, error: "Username cannot be empty" };
    }
    if (username.trim().length > 50) return { ok: false, error: "Username is too long" };
    update.username = username.trim();
  }
  if (full_name !== undefined) {
    if (full_name !== null && typeof full_name !== "string") return { ok: false, error: "Invalid full name" };
    update.full_name = full_name?.trim() || null;
  }
  if (discord_uid !== undefined) {
    if (discord_uid !== null && typeof discord_uid !== "string") return { ok: false, error: "Invalid Discord UID" };
    const trimmed = discord_uid?.trim() || null;
    if (trimmed && trimmed.length > 64) return { ok: false, error: "Discord UID is too long" };
    update.discord_uid = trimmed;
  }
  return { ok: true, userId: userId.toLowerCase(), update };
}

export type ProfileSnapshot = Required<ProfileUpdate>;

/** The admin_activity_log details for a profile edit, or null when nothing changed. */
export interface ProfileEditDetails {
  /** Every field whose value changed. */
  fields: (keyof ProfileUpdate)[];
  /** Handles are kept from and to, so a wrong edit can be traced and undone. */
  username?: { from: string | null; to: string | null };
  discord_uid?: { from: string | null; to: string | null };
}

/**
 * What an admin's profile edit changed, for the audit log. Usernames and
 * Discord IDs keep their old and new values (mentor sessions and the Discord
 * bot key on discord_uid). A full name only appears as a field name: students
 * are minors, so their names stay out of the log.
 */
export function profileEditDetails(
  before: Partial<ProfileSnapshot> | null,
  update: ProfileUpdate,
): ProfileEditDetails | null {
  const details: ProfileEditDetails = { fields: [] };
  for (const field of ["username", "full_name", "discord_uid"] as const) {
    if (!(field in update)) continue;
    const from = before?.[field] ?? null;
    const to = update[field] ?? null;
    if (from === to) continue;
    details.fields.push(field);
    if (field !== "full_name") details[field] = { from, to };
  }
  return details.fields.length ? details : null;
}
