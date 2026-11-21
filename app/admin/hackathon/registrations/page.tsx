import { Badge } from "@/components/ui/badge";
import { RegistrationActions } from "@/components/admin/hackathon/RegistrationActions";
import { AdminEmptyState, AdminErrorState } from "@/components/admin/shared/AdminStates";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatBangkokDateTime } from "@/lib/admin/queue-tools/format";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getClaimCounts, type ClaimCount } from "@/lib/supabase/elemental-claims";
import {
  listRegistrations,
  type AdminRegistration,
} from "@/lib/supabase/hackathon-event-registrations";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<AdminRegistration["status"], string> = {
  review: "needs a check",
  pending: "not paid",
  paid: "paid",
  cancelled: "cancelled",
};

function slipNote(check: unknown): string | null {
  const c = check as { kind?: string; code?: number } | null;
  if (!c?.kind) return null;
  return `SlipOK: ${c.kind}${c.code ? ` (${c.code})` : ""}`;
}

/**
 * Discord /join codes used out of issued for one sign-up (E26). Paid sign-ups
 * always show it, so "0/0" means staff have not issued codes yet; others show
 * it only if codes exist (a sign-up cancelled after its codes went out).
 */
function ClaimBadge({ r, count }: { r: AdminRegistration; count: ClaimCount | undefined }) {
  if (r.status !== "paid" && !count) return null;
  const c = count ?? { claimed: 0, issued: 0 };
  return (
    <Badge variant="outline" title="Discord /join codes used out of issued">
      {c.claimed}/{c.issued} claimed
    </Badge>
  );
}

function RegistrationCard({ r, claims }: { r: AdminRegistration; claims: Map<string, ClaimCount> | null }) {
  return (
    <li className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{r.teamName || r.members[0]?.fullName || "Unnamed"}</span>
        <Badge
          variant={r.status === "paid" ? "secondary" : "outline"}
          className={cn(r.status === "review" && "border-primary/50 bg-primary/10")}
        >
          {STATUS_LABEL[r.status]}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {r.memberCount} {r.memberCount === 1 ? "person" : "people"} · ฿{r.amountBaht.toLocaleString()}
        </span>
        {r.wantsTeamMatching && <Badge variant="outline">match with a team</Badge>}
        {r.source && <Badge variant="outline">src: {r.source}</Badge>}
        {claims && <ClaimBadge r={r} count={claims.get(r.id)} />}
      </div>

      <ol className="space-y-1 text-sm">
        {r.members.map((m) => (
          <li key={m.position}>
            {m.fullName}
            {m.nickname && ` (${m.nickname})`} · {m.age} · {m.school}
            {m.age < 20 && (
              <span className="text-muted-foreground">
                {" "}· parent {m.parentName} {m.parentPhone} {m.parentConsent ? "consented" : "NO CONSENT"}
              </span>
            )}
          </li>
        ))}
      </ol>

      <p className="text-sm text-muted-foreground">
        {r.contactEmail} · {r.contactPhone}
        {r.contactLineId && ` · LINE ${r.contactLineId}`}
        {" · "}contact after: {r.contactAfterConsent ? "yes" : "no"}
        {" · "}signed up {formatBangkokDateTime(r.createdAt, { year: false })}
        {r.paidAt && ` · paid ${formatBangkokDateTime(r.paidAt, { year: false })} by ${r.paidBy}`}
      </p>
      {slipNote(r.slipCheck) && <p className="text-xs text-muted-foreground">{slipNote(r.slipCheck)}</p>}

      <div className="flex flex-wrap items-start gap-4">
        {r.slipUrl && (
          <a href={r.slipUrl} target="_blank" rel="noopener noreferrer" title="Open the full slip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.slipUrl} alt="Payment slip" className="h-24 w-24 rounded-md border object-cover" />
          </a>
        )}
        <RegistrationActions id={r.id} status={r.status} />
      </div>
    </li>
  );
}

function claimTotal(claims: Map<string, ClaimCount>): ClaimCount {
  let claimed = 0;
  let issued = 0;
  for (const c of claims.values()) {
    claimed += c.claimed;
    issued += c.issued;
  }
  return { claimed, issued };
}

export default async function AdminHackathonRegistrationsPage() {
  await requireAdmin();
  let rows: AdminRegistration[] | null = null;
  // Claim counts never block the list: null (no migration yet, read failed) hides the badges.
  const claimsRead = getClaimCounts();
  try {
    rows = await listRegistrations(ELEMENTAL.slug);
  } catch (error) {
    console.error("[admin/hackathon/registrations] failed to load", error);
  }
  const claims = await claimsRead;
  const claimSum = claims ? claimTotal(claims) : null;

  if (rows === null) {
    return (
      <AdminErrorState
        title="Could not load sign-ups"
        message="The list did not load, so this is not an empty list. Refresh to try again."
      />
    );
  }

  const order = { review: 0, pending: 1, paid: 2, cancelled: 3 } as const;
  const sorted = [...rows].sort((a, b) => order[a.status] - order[b.status]);
  const paid = rows.filter((r) => r.status === "paid");
  const seats = paid.reduce((n, r) => n + r.memberCount, 0);
  const baht = paid.reduce((n, r) => n + r.amountBaht, 0);
  const sources = Object.entries(
    paid.reduce<Record<string, number>>((acc, r) => {
      const k = r.source ?? "direct";
      acc[k] = (acc[k] ?? 0) + r.memberCount;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 text-sm">
        <p>
          <span className="font-medium">{ELEMENTAL.edition}:</span> {seats} paid seats in {paid.length} sign-ups,
          ฿{baht.toLocaleString()} in total. {rows.filter((r) => r.status === "review").length} slips need a check.
        </p>
        {claimSum && (
          <p className="mt-1 text-muted-foreground">
            Discord: {claimSum.claimed}/{claimSum.issued} codes claimed.
          </p>
        )}
        {sources.length > 0 && (
          <p className="mt-1 text-muted-foreground">
            Paid seats by link: {sources.map(([k, n]) => `${k} ${n}`).join(" · ")}
          </p>
        )}
      </div>
      {sorted.length === 0 ? (
        <AdminEmptyState title="No sign-ups yet" description="Sign-ups from /hackathon appear here." />
      ) : (
        <ul className="space-y-3">
          {sorted.map((r) => (
            <RegistrationCard key={r.id} r={r} claims={claims} />
          ))}
        </ul>
      )}
    </div>
  );
}
