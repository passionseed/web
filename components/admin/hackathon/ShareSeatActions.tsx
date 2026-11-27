"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const REASON: Record<string, string> = {
  needs_recipient: "Nobody to give it to yet: the student or teacher must type a code on their page first.",
  teacher_not_verified: "Verify the teacher with the school first (the mark on the teacher's link).",
  link_rejected: "This link was shut by staff: its seats can't be given.",
  recipient_paid: "That sign-up isn't unpaid any more (paid, slip waiting, or cancelled). No free seat on top; ask for another code.",
  recipient_taken: "That sign-up already has a free seat from another school.",
  closed: "This seat was already decided.",
  not_found: "This seat is gone. Refresh.",
};

/** Confirm (give the free seat) or reject (fraud: the school's seat opens again) after a quick check. */
export function ShareSeatActions({ id, canConfirm }: { id: string; canConfirm: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"confirm" | "reject" | null>(null);

  const decide = async (action: "confirm" | "reject") => {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/hackathon/share-seats/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(REASON[data.error] ?? "Could not save. Try again.");
      toast.success(
        action === "confirm"
          ? data.becamePaid
            ? "Free seat given: the sign-up is marked paid."
            : "Free seat given: one seat off the amount."
          : "Rejected: the next link at this school to qualify can get the seat.",
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy !== null || !canConfirm} onClick={() => decide("confirm")}>
        {busy === "confirm" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        Confirm: free seat
      </Button>
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => decide("reject")}>
        {busy === "reject" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        Reject
      </Button>
    </div>
  );
}
