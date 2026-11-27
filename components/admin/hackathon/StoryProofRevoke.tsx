"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Take an Instagram Story proof back after a spot-check: the team's styles go back to what its devices unlock. */
export function StoryProofRevoke({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const revoke = async () => {
    if (!window.confirm("Revoke this proof? The team's styles go back to what its devices unlock. The student can upload a new screenshot.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/hackathon/story-proofs/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      if (!res.ok) throw new Error(res.status === 404 ? "This proof is gone. Refresh." : "Could not save. Try again.");
      toast.success("Revoked.");
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
