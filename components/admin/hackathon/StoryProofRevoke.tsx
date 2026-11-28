"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Take an Instagram Story proof back after a spot-check: the screenshot is deleted and the team's styles go back to what its devices unlock. */
export function StoryProofRevoke({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const revoke = async () => {
    if (!window.confirm("Revoke this proof? The screenshot is deleted now, and the team's styles go back to what its devices unlock. The student can upload a new screenshot.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/hackathon/story-proofs/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? "This proof is gone. Refresh."
            : data.error === "changed"
              ? "The student just uploaded a new screenshot. Refresh and check that one."
              : "Could not delete the screenshot. Nothing changed; try again.",
        );
      }
      toast.success("Revoked: the screenshot is deleted.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button size="sm" variant="destructive" disabled={busy} onClick={revoke}>
      {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
      Revoke
    </Button>
  );
}
