import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Admin reads for PathLab trial payments. Runs through the service-role
 * client: every caller must check for an admin first (the trials page calls
 * requireAdmin(), the API routes use the route guard). Never selects
 * pay_token.
 */

export type TrialStatus = "active" | "pending" | "paid" | "expired";
export type TrialStatusFilter = TrialStatus | "all";

export interface AdminTrial {
  id: string;
  userId: string;
  seedId: string;
  seedTitle: string | null;
  status: string;
  priceAmount: number;
  startedAt: string;
  paymentDeadline: string;
  slipPath: string | null;
  /** Short-lived signed URL for the slip image. */
  slipUrl: string | null;
  paidAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  adminNote: string | null;
  /** From profiles, so staff approve money against a name, not a UUID. */
  studentName: string | null;
  studentUsername: string | null;
}

interface TrialRow {
  id: string;
  user_id: string;
  seed_id: string;
  status: string;
  price_amount: number;
  started_at: string;
  payment_deadline: string;
  slip_path: string | null;
  paid_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  admin_note: string | null;
  seed: { title: string } | { title: string }[] | null;
}

interface StudentProfile {
  id: string;
  full_name: string | null;
  username: string | null;
}

const TRIAL_SELECT =
  "id, user_id, seed_id, status, price_amount, started_at, payment_deadline, slip_path, paid_at, verified_by, verified_at, admin_note, seed:seeds!seed_id(title)";

const SLIP_BUCKET = "trial-slips";
const SLIP_URL_TTL_SECONDS = 300;

type AdminClient = ReturnType<typeof createAdminClient>;

/** Pending first, then the most recently started. */
export function sortTrialsForReview<T extends { status: string; startedAt: string }>(
  trials: readonly T[],
): T[] {
  return [...trials].sort((a, b) => {
    const aPending = a.status === "pending" ? 0 : 1;
    const bPending = b.status === "pending" ? 0 : 1;
    return aPending - bPending || b.startedAt.localeCompare(a.startedAt);
  });
}

async function signedSlipUrls(service: AdminClient, paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data, error } = await service.storage
    .from(SLIP_BUCKET)
    .createSignedUrls(paths, SLIP_URL_TTL_SECONDS);
  if (error) {
    // Slips are a convenience; the queue still renders without previews.
    console.error("[admin-trials] failed to sign slip URLs", error.message);
    return urls;
  }
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

async function studentProfiles(
  service: AdminClient,
  userIds: string[],
): Promise<Map<string, StudentProfile>> {
  const profiles = new Map<string, StudentProfile>();
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return profiles;
  const { data, error } = await service
    .from("profiles")
    .select("id, full_name, username")
    .in("id", unique);
  if (error) {
    // Names are a convenience; the queue still renders with the short id.
    console.error("[admin-trials] failed to load student profiles", error.message);
    return profiles;
  }
  for (const row of (data ?? []) as StudentProfile[]) profiles.set(row.id, row);
  return profiles;
}

async function hydrate(service: AdminClient, rows: TrialRow[]): Promise<AdminTrial[]> {
  const [urls, profiles] = await Promise.all([
    signedSlipUrls(
      service,
      rows.map((r) => r.slip_path).filter((p): p is string => Boolean(p)),
    ),
    studentProfiles(
      service,
      rows.map((r) => r.user_id),
    ),
  ]);

  return rows.map((row) => {
    const seed = Array.isArray(row.seed) ? row.seed[0] : row.seed;
    const profile = profiles.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      seedId: row.seed_id,
      seedTitle: seed?.title ?? null,
      status: row.status,
      priceAmount: row.price_amount,
      startedAt: row.started_at,
      paymentDeadline: row.payment_deadline,
      slipPath: row.slip_path,
      slipUrl: row.slip_path ? (urls.get(row.slip_path) ?? null) : null,
      paidAt: row.paid_at,
      verifiedBy: row.verified_by,
      verifiedAt: row.verified_at,
      adminNote: row.admin_note,
      studentName: profile?.full_name?.trim() || null,
      studentUsername: profile?.username?.trim() || null,
    };
  });
}

/** Trials by status for the API, pending first. Throws when the read fails. */
export async function listAdminTrials({
  status = "pending",
  limit = 100,
}: { status?: TrialStatusFilter; limit?: number } = {}): Promise<AdminTrial[]> {
  const service = createAdminClient();
  let query = service
    .from("trial_accesses")
    .select(TRIAL_SELECT)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(`trial_accesses read failed: ${error.message}`);
  return sortTrialsForReview(await hydrate(service, (data ?? []) as unknown as TrialRow[]));
}

/**
 * The review page: every slip waiting for verification, then the most recent
 * other trials for context. Throws when either read fails.
 */
export async function getTrialReviewQueue(recentLimit = 50): Promise<{
  pending: AdminTrial[];
  recent: AdminTrial[];
}> {
  const service = createAdminClient();
  const [pendingResult, recentResult] = await Promise.all([
    service
      .from("trial_accesses")
      .select(TRIAL_SELECT)
      .eq("status", "pending")
      .order("started_at", { ascending: false }),
    service
      .from("trial_accesses")
      .select(TRIAL_SELECT)
      .neq("status", "pending")
      .order("started_at", { ascending: false })
      .limit(recentLimit),
  ]);
  if (pendingResult.error) throw new Error(`trial_accesses read failed: ${pendingResult.error.message}`);
  if (recentResult.error) throw new Error(`trial_accesses read failed: ${recentResult.error.message}`);

  const pendingRows = (pendingResult.data ?? []) as unknown as TrialRow[];
  const recentRows = (recentResult.data ?? []) as unknown as TrialRow[];
  const all = await hydrate(service, [...pendingRows, ...recentRows]);
  return { pending: all.slice(0, pendingRows.length), recent: all.slice(pendingRows.length) };
}

/** "Name (@username)", falling back to a short id when the profile has neither. */
export function trialStudentLabel(
  trial: Pick<AdminTrial, "studentName" | "studentUsername" | "userId">,
): string {
  if (trial.studentName && trial.studentUsername) {
    return `${trial.studentName} (@${trial.studentUsername})`;
  }
  if (trial.studentName) return trial.studentName;
  if (trial.studentUsername) return `@${trial.studentUsername}`;
  return `Unknown student (${trial.userId.slice(0, 8)})`;
}
