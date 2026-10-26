"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { refreshAdminCounts } from "@/components/admin/console/live-counts";
import { useConfirm } from "@/components/admin/shared/useConfirm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ReviewAction = "approve" | "reject";

interface TrialReviewActionsProps {
  trialId: string;
  /** Shown in the confirm dialog and toasts. */
  studentLabel: string;
}

export function TrialReviewActions({ trialId, studentLabel }: TrialReviewActionsProps) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [note, setNote] = useState("");
  const [acting, setActing] = useState<ReviewAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (action: ReviewAction) => {
    if (action === "reject") {
      const ok = await confirm({
        title: `Reject the slip from ${studentLabel}?`,
        description:
          "The student goes back to an unpaid trial if the deadline has not passed, otherwise the trial expires. Add a note so they know what to fix.",
        confirmLabel: "Reject slip",
        destructive: true,
      });
      if (!ok) return;
    }

    setActing(action);
    setError(null);
    try {
      const response = await fetch(`/api/admin/trials/${trialId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        const message = data.error || "Could not save the review. Try again.";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success(
        action === "approve"
          ? `Approved the slip from ${studentLabel}.`
          : `Rejected the slip from ${studentLabel}.`,
      );
      refreshAdminCounts();
      router.refresh();
    } catch {
      const message = "Network error. Check your connection and try again.";
      setError(message);
      toast.error(message);
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="w-56 shrink-0 space-y-2">
      {confirmDialog}
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Admin note (optional)"
        aria-label="Admin note"
        rows={2}
        maxLength={2000}
        className="text-xs"
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => void submit("approve")}
          disabled={acting !== null}
          className="h-11 flex-1 gap-1.5 lg:[@media(pointer:fine)]:h-9"
        >
          {acting === "approve" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void submit("reject")}
          disabled={acting !== null}
          className="h-11 flex-1 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive active:bg-destructive/10 lg:[@media(pointer:fine)]:h-9"
        >
          {acting === "reject" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Reject
        </Button>
      </div>
    </div>
  );
}
