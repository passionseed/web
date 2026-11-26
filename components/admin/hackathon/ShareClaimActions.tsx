"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const REASON: Record<string, string> = {
  full: "All 30 free seats are already given.",
  not_pending: "This sign-up isn't unpaid any more (paid, slip waiting, or cancelled). No free seat on top.",
  closed: "This claim was already decided or ran out.",
};

/** Approve (free seat) or reject a school-group share, after checking the screenshot in the IG inbox. */
export function ShareClaimActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  const decide = async (action: "approve" | "reject") => {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/hackathon/share-claims/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(REASON[data.error] ?? "Could not save. Try again.");
      toast.success(action === "approve" ? (data.becamePaid ? "Free seat given: marked paid." : "Free seat given: one seat off the amount.") : "Rejected: the school is free again.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy !== null} onClick={() => decide("approve")}>
        {busy === "approve" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        Approve: free seat
      </Button>
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => decide("reject")}>
        {busy === "reject" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        Reject
      </Button>
    </div>
  );
}
