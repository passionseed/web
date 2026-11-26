import { Badge } from "@/components/ui/badge";
import { RegistrationActions } from "@/components/admin/hackathon/RegistrationActions";
import { ShareClaimActions } from "@/components/admin/hackathon/ShareClaimActions";
import { AdminEmptyState, AdminErrorState } from "@/components/admin/shared/AdminStates";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatBangkokDateTime } from "@/lib/admin/queue-tools/format";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { SHARE } from "@/lib/hackathon/elemental/share";
import {
  listRegistrations,
  type AdminRegistration,
} from "@/lib/supabase/hackathon-event-registrations";
import { listShareClaims, releaseExpiredHolds, type ShareClaim } from "@/lib/supabase/hackathon-share-claims";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<AdminRegistration["status"], string> = {
  review: "needs a check",
  pending: "not paid",
  paid: "paid",
  cancelled: "cancelled",
};

function slipNote(check: unknown): string | null {
  const c = check as { provider?: string; kind?: string; code?: number; account?: number } | null;
  if (!c?.kind) return null;
  const name = c.provider === "rdcw" ? "RDCW" : "SlipOK";
  // SlipOK account 1 is the usual one; only say so when another account answered.
  const account = c.account && c.account > 1 ? ` · account ${c.account}` : "";
  return `${name}: ${c.kind}${c.code ? ` (${c.code})` : ""}${account}`;
}

function discordNote(d: AdminRegistration["discord"]): string {
  if (!d) return "Discord: not linked yet";
  const who = d.username ? `@${d.username}` : "linked";
  if (d.joinedAt) return `Discord: ${who}, in the server since ${formatBangkokDateTime(d.joinedAt, { year: false })}`;
  if (d.error === "not_in_server") return `Discord: ${who}, not in the server (bot could not add them)`;
  if (d.error) return `Discord: ${who}, not in the server (${d.error})`;
  return `Discord: ${who}, not in the server`;
}

/**
 * Buddy pass pairs: the friend's card names who sent the pass, and the
 * sender's card names who used it, so the two land on one team.
 */
type BuddyLinks = { from: Map<string, string>; usedBy: Map<string, string> };

function buddyLinks(rows: AdminRegistration[]): BuddyLinks {
  const name = (r?: AdminRegistration) => r?.members[0]?.nickname || r?.members[0]?.fullName || "?";
  const byId = new Map(rows.map((r) => [r.id, r]));
  const from = new Map<string, string>();
  const usedBy = new Map<string, string>();
  for (const r of rows) {
    if (!r.buddyPassFromId) continue;
    from.set(r.id, name(byId.get(r.buddyPassFromId)));
    if (r.status !== "cancelled") usedBy.set(r.buddyPassFromId, name(r));
  }
  return { from, usedBy };
}

const CLAIM_LABEL: Record<ShareClaim["status"], string> = {
  held: "picked, not sent yet",
  sent: "says the screenshot is sent: check IG",
  won: "free seat given",
  released: "released",
};

/** The school this sign-up picked on the share page, and the approve / reject buttons. */
function ShareClaimLine({ c }: { c: ShareClaim }) {
  const custom = c.schoolKey.startsWith("custom:");
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm", c.status === "sent" && "border-primary/50 bg-primary/10")}>
      <span>
        <span className="font-medium">Share:</span> {c.schoolName}
        {c.province && `, ${c.province}`}
        {custom && " (typed, not on the list: check the name)"} · code {c.code.toUpperCase()} · {CLAIM_LABEL[c.status]}
        {c.status === "held" && ` until ${formatBangkokDateTime(c.heldUntil, { year: false })}`}
      </span>
      {(c.status === "held" || c.status === "sent") && <ShareClaimActions id={c.id} />}
    </div>
  );
}

function RegistrationCard({ r, buddy, claim }: { r: AdminRegistration; buddy: BuddyLinks; claim?: ShareClaim }) {
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
        {buddy.from.has(r.id) && (
          <Badge variant="outline">
            buddy pass ฿{ELEMENTAL.buddyPriceBaht} from {buddy.from.get(r.id)}
            {r.buddyPassOwe && ` · owes ${r.buddyPassOwe}`}
          </Badge>
        )}
        {buddy.usedBy.has(r.id) && <Badge variant="outline">pass used by {buddy.usedBy.get(r.id)}</Badge>}
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
      {r.status === "paid" && <p className="text-xs text-muted-foreground">{discordNote(r.discord)}</p>}
      {r.adminNote && <p className="text-xs text-muted-foreground">Note: {r.adminNote}</p>}
      {claim && <ShareClaimLine c={claim} />}

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

export default async function AdminHackathonRegistrationsPage() {
  await requireAdmin();
  let rows: AdminRegistration[] | null = null;
  try {
    rows = await listRegistrations(ELEMENTAL.slug);
  } catch (error) {
    console.error("[admin/hackathon/registrations] failed to load", error);
  }

  // The share claims load on their own, so a missing table (migration not applied) can't break this page.
  let claims: ShareClaim[] = [];
  try {
    await releaseExpiredHolds(ELEMENTAL.slug);
    claims = await listShareClaims(ELEMENTAL.slug);
  } catch (error) {
    console.error("[admin/hackathon/registrations] share claims did not load", error);
  }
  const claimFor = new Map<string, ShareClaim>();
  for (const c of claims) if (c.status !== "released" && !claimFor.has(c.registrationId)) claimFor.set(c.registrationId, c);

  if (rows === null) {
    return (
      <AdminErrorState
        title="Could not load sign-ups"
        message="The list did not load, so this is not an empty list. Refresh to try again."
      />
    );
  }

  const buddy = buddyLinks(rows);
  const order = { review: 0, pending: 1, paid: 2, cancelled: 3 } as const;
  // A share waiting for a check goes to the top.
  const waiting = (r: AdminRegistration) => (claimFor.get(r.id)?.status === "sent" ? -1 : 0);
  const sorted = [...rows].sort((a, b) => waiting(a) - waiting(b) || order[a.status] - order[b.status]);
  const shareCount = (s: ShareClaim["status"]) => claims.filter((c) => c.status === s).length;
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
        <p className="mt-1 text-muted-foreground">
          Discord: {paid.filter((r) => r.discord?.joinedAt).length} of {paid.length} paid sign-ups are in the server
          through their sign-up page.
        </p>
        {claims.length > 0 && (
          <p className="mt-1 text-muted-foreground">
            School-group shares: {shareCount("won")} of {SHARE.seats} free seats given · {shareCount("sent")} waiting for a
            check · {shareCount("held")} picked a school, not sent yet.
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
            <RegistrationCard key={r.id} r={r} buddy={buddy} claim={claimFor.get(r.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}
