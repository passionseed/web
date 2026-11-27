"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * A teacher's two staff marks, in order: "verified" (checked with the school
 * that they teach there), then "Demo Day invite sent", which only unlocks
 * after verified.
 */
export function ShareTeacherMarks({ id, verified, invited, canInvite }: { id: string; verified: boolean; invited: boolean; canInvite: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"verified" | "invited" | null>(null);
  const set = async (mark: "verified" | "invited", on: boolean) => {
    setBusy(mark);
    try {
      const res = await fetch(`/api/admin/hackathon/share-links/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark, on }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error === "not_verified" ? "Verify the teacher with the school first." : "Could not save. Try again.");
      toast.success(
        mark === "verified" ? (on ? "Marked: verified with the school." : "Verified mark removed (and the invite mark).") : on ? "Marked: Demo Day invite sent." : "Invite mark removed.",
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant={verified ? "outline" : "default"} disabled={busy !== null} onClick={() => set("verified", !verified)}>
        {busy === "verified" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        {verified ? (
          <>
            <Check className="mr-1 h-3 w-3" /> Verified with the school
          </>
        ) : (
          "Mark: verified with the school"
        )}
      </Button>
      <Button
        size="sm"
        variant={invited ? "outline" : "default"}
        disabled={busy !== null || !verified || (!invited && !canInvite)}
        title={!verified ? "Verify the teacher first" : !canInvite ? "Invite at 50 devices" : undefined}
        onClick={() => set("invited", !invited)}
      >
        {busy === "invited" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        {invited ? (
          <>
            <Check className="mr-1 h-3 w-3" /> Demo Day invite sent
          </>
        ) : (
          "Mark: Demo Day invite sent"
        )}
      </Button>
    </div>
  );
}

/** Copy a teacher's private page link, to send back to a teacher who lost it. */
export function ShareCopyTeacherLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard?.writeText(`${window.location.origin}/hackathon/elemental/teacher/${token}`).catch(() => undefined);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
      {copied ? "Copied" : "Copy private link"}
    </Button>
  );
}

/** Shut a link (fraud): no more seats, and its open seats are turned down. Or open it again. */
export function ShareLinkReject({ id, rejected }: { id: string; rejected: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (!rejected && !window.confirm("Shut this link? It earns no more seats, and its seats waiting for a name or a check are turned down.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/hackathon/share-links/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark: "rejected", on: !rejected }),
      });
      if (!res.ok) throw new Error();
      toast.success(rejected ? "Link open again: it can earn new seats (turned-down seats stay turned down)." : "Link shut: no more seats.");
      router.refresh();
    } catch {
      toast.error("Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button size="sm" variant={rejected ? "outline" : "destructive"} disabled={busy} onClick={toggle}>
      {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
      {rejected ? "Open the link again" : "Reject link (fraud)"}
    </Button>
  );
}
