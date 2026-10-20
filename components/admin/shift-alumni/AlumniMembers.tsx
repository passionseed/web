"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AlumniMember, AlumniMemberStatus } from "@/lib/shift/alumniMember";

/**
 * Accounts that RSVP'd to alumni sessions, for /admin/shift/alumni. Ones with
 * a paid SHIFT application linked were confirmed automatically; the rest wait
 * here for an admin to check the name against the round's roster.
 */

export type AlumniMemberRow = AlumniMember & { email: string | null; full_name: string | null };

const STATUS_BADGE: Record<AlumniMemberStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "Pending", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  declined: { label: "Declined", variant: "destructive" },
};

export function AccountBadge({ status }: { status: AlumniMemberStatus | null }) {
  if (!status) return <span className="text-muted-foreground">No account (old RSVP)</span>;
  const { label, variant } = STATUS_BADGE[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function ReviewButtons({ member }: { member: AlumniMemberRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function review(status: AlumniMemberStatus) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/shift/alumni/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.user_id, status }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      toast.success(`${member.nickname}: ${STATUS_BADGE[status].label}`);
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex justify-end gap-2">
      {member.status !== "confirmed" && (
        <Button size="sm" disabled={busy} onClick={() => void review("confirmed")}>
          Confirm
        </Button>
      )}
      {member.status !== "declined" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void review("declined")}>
          Decline
        </Button>
      )}
    </div>
  );
}

export function AlumniMembers({ members }: { members: AlumniMemberRow[] }) {
  const pending = members.filter((m) => m.status === "pending").length;
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="text-lg font-semibold">Alumni accounts</h3>
        {pending > 0 && <Badge variant="secondary">{pending} to check</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">
        Accounts linked to a paid SHIFT application are confirmed automatically. Check the rest against the round&apos;s
        roster. Pending accounts can still RSVP; declined ones cannot.
      </p>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accounts yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nickname</TableHead>
              <TableHead>Round</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.user_id}>
                <TableCell className="font-medium">{m.nickname}</TableCell>
                <TableCell>{m.cohort}</TableCell>
                <TableCell className="text-sm">
                  <div>{m.full_name ?? "No name"}</div>
                  <div className="text-muted-foreground">{m.email ?? "No email"}</div>
                </TableCell>
                <TableCell>
                  <AccountBadge status={m.status} />
                  {m.application_id && (
                    <div className="mt-1 text-xs text-muted-foreground">Paid application linked</div>
                  )}
                </TableCell>
                <TableCell>
                  <ReviewButtons member={m} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
