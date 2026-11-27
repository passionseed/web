"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Mark a teacher's Demo Day invite as sent (or undo it). */
export function ShareInviteToggle({ id, invited }: { id: string; invited: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/hackathon/share-links/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invited: !invited }),
      });
      if (!res.ok) throw new Error();
      toast.success(invited ? "Invite mark removed." : "Marked: Demo Day invite sent.");
      router.refresh();
    } catch {
      toast.error("Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button size="sm" variant={invited ? "outline" : "default"} disabled={busy} onClick={toggle}>
      {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
      {invited ? "Undo: invite sent" : "Mark: Demo Day invite sent"}
    </Button>
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
