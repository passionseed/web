"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Status = "pending" | "review" | "paid" | "cancelled";

/** Confirm a slip by hand (when SlipOK couldn't), reopen, or cancel a sign-up. */
export function RegistrationActions({ id, status }: { id: string; status: Status }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Status | null>(null);

  const set = async (next: Status) => {
    setBusy(next);
    try {
      const res = await fetch(`/api/admin/hackathon/registrations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Marked ${next}.`);
      router.refresh();
    } catch {
      toast.error("Could not save. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const button = (next: Status, label: string, variant: "default" | "outline" = "outline") => (
    <Button size="sm" variant={variant} disabled={busy !== null} onClick={() => set(next)}>
      {busy === next && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
      {label}
    </Button>
  );

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "paid" && button("paid", "Mark paid", "default")}
      {status === "paid" && button("pending", "Undo paid")}
      {status !== "cancelled" && status !== "paid" && button("cancelled", "Cancel")}
      {status === "cancelled" && button("pending", "Reopen")}
    </div>
  );
}
