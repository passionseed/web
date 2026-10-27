"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, CheckCircle, ExternalLink, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { refreshAdminCounts } from "@/components/admin/console/live-counts";
import { ExpertStatusBadge } from "@/components/admin/ExpertQueue";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoading,
} from "@/components/admin/shared/AdminStates";
import { useConfirm } from "@/components/admin/shared/useConfirm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBangkokDateTime } from "@/lib/admin/queue-tools/format";

interface ExpertDetailData {
  id: string;
  name: string;
  title: string;
  company: string;
  field_category: string;
  linkedin_url?: string;
  status: string;
  mentoring_preference: string;
  booking_url?: string;
  interview_data: Record<string, unknown>;
  interview_transcript: Array<{ role: string; content: string }>;
  admin_notes?: string;
  created_at: string;
}

interface ExpertDetailProps {
  expertId: string;
  onBack: () => void;
  onActionComplete: () => void;
}

const CONTROL_HEIGHT = "h-11 lg:[@media(pointer:fine)]:h-9";
const LINK_CLASS =
  "inline-flex min-h-11 items-center gap-1 text-sm text-foreground underline decoration-muted-foreground underline-offset-4 hover:decoration-foreground active:decoration-foreground lg:min-h-0";
const INTERVIEW_LISTS = ["dailyTasks", "challenges", "rewards", "misconceptions"] as const;

type LoadState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "missing" }
  | { kind: "ready"; expert: ExpertDetailData };

function useExpert(expertId: string) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    fetch(`/api/admin/experts/${expertId}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) {
          if (!controller.signal.aborted) setState({ kind: "missing" });
          return;
        }
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { expert: ExpertDetailData };
        if (!controller.signal.aborted) setState({ kind: "ready", expert: data.expert });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: "error" });
      });
    return () => controller.abort();
  }, [expertId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}

export function ExpertDetail({ expertId, onBack, onActionComplete }: ExpertDetailProps) {
  const { state, retry } = useExpert(expertId);

  const backButton = (
    <Button variant="ghost" size="sm" onClick={onBack} className={`${CONTROL_HEIGHT} gap-1.5`}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to the queue
    </Button>
  );

  if (state.kind === "loading") {
    return (
      <div className="space-y-4">
        {backButton}
        <AdminLoading rows={4} rowClassName="h-20" label="Loading the expert submission" />
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="space-y-4">
        {backButton}
        <AdminErrorState
          title="Could not load this submission"
          message="Check your connection and try again."
          onRetry={retry}
        />
      </div>
    );
  }
  if (state.kind === "missing") {
    return (
      <div className="space-y-4">
        {backButton}
        <AdminEmptyState
          title="Submission not found"
          description="It may have been removed, or the link is wrong."
        />
      </div>
    );
  }

  return (
    <ExpertSubmission
      expert={state.expert}
      backButton={backButton}
      onActionComplete={onActionComplete}
    />
  );
}

function ExpertSubmission({
  expert,
  backButton,
  onActionComplete,
}: {
  expert: ExpertDetailData;
  backButton: ReactNode;
  onActionComplete: () => void;
}) {
  const { confirm, confirmDialog } = useConfirm();
  const [adminNotes, setAdminNotes] = useState(expert.admin_notes || "");
  const [acting, setActing] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Opening a submission moves focus (and the view) to its name.
  useEffect(() => {
    headingRef.current?.focus();
  }, [expert.id]);

  const interviewData = expert.interview_data ?? {};
  const transcript = expert.interview_transcript ?? [];
  const isPending = expert.status === "pending";

  const fail = (message: string) => {
    setError(message);
    toast.error(message);
  };

  const handleApprove = async () => {
    setActing("approve");
    setError(null);
    try {
      const response = await fetch(`/api/admin/experts/${expert.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes, generatePathLab: true }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        pathlabGenerated?: boolean;
        warning?: string;
      };
      if (!response.ok) return fail(data.error || "Could not approve. Try again.");
      if (data.pathlabGenerated) {
        toast.success(`Approved ${expert.name}. The PathLab was generated.`);
      } else {
        toast.warning(
          `Approved ${expert.name}, but the PathLab was not generated${data.warning ? `: ${data.warning}` : "."}`,
        );
      }
      refreshAdminCounts();
      onActionComplete();
    } catch {
      fail("Network error. Check your connection and try again.");
    } finally {
      setActing(null);
    }
  };

  const handleReject = async () => {
    const ok = await confirm({
      title: `Reject ${expert.name}?`,
      description: "No PathLab is generated. The notes above are saved as the reason.",
      confirmLabel: "Reject",
      destructive: true,
    });
    if (!ok) return;

    setActing("reject");
    setError(null);
    try {
      const response = await fetch(`/api/admin/experts/${expert.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: adminNotes }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) return fail(data.error || "Could not reject. Try again.");
      toast.success(`Rejected ${expert.name}.`);
      refreshAdminCounts();
      onActionComplete();
    } catch {
      fail("Network error. Check your connection and try again.");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="flex flex-wrap items-center gap-3">
        {backButton}
        <ExpertStatusBadge status={expert.status} />
      </div>

      <div className="space-y-1">
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold focus-visible:outline-none">
          {expert.name}
        </h2>
        <p className="text-muted-foreground">
          {expert.title} at {expert.company}
        </p>
        <p className="text-sm text-muted-foreground">Field: {expert.field_category}</p>
        <p className="text-sm text-muted-foreground">
          Submitted: {formatBangkokDateTime(expert.created_at, { year: true })}
        </p>
        {expert.linkedin_url && (
          <a href={expert.linkedin_url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            LinkedIn <ExternalLink className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
        <p className="text-sm">
          Mentoring: <span className="font-medium">{expert.mentoring_preference}</span>
          {expert.booking_url && (
            <>
              {" · "}
              <a href={expert.booking_url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                Booking link
              </a>
            </>
          )}
        </p>
      </div>

      {Object.keys(interviewData).length > 0 && (
        <div className="space-y-3 rounded-lg bg-muted/50 p-4">
          <h3 className="text-sm font-semibold">Extracted interview data</h3>
          <div className="grid grid-cols-1 gap-3 text-sm">
            {INTERVIEW_LISTS.flatMap((key) => {
              const items = (interviewData[key] as string[] | undefined) ?? [];
              if (!items.length) return [];
              return [
                <div key={key}>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <ul className="list-inside list-disc space-y-0.5">
                    {items.slice(0, 5).map((item, i) => (
                      <li key={i} className="text-muted-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>,
              ];
            })}
            {typeof interviewData.advice === "string" && interviewData.advice && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Advice
                </p>
                <p className="italic text-muted-foreground">&ldquo;{interviewData.advice}&rdquo;</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <Button
          variant="link"
          className="h-auto min-h-11 px-0 text-sm lg:min-h-0"
          aria-expanded={showTranscript}
          onClick={() => setShowTranscript((v) => !v)}
        >
          {showTranscript ? "Hide" : "Show"} full transcript ({transcript.length} messages)
        </Button>
        {showTranscript && (
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-lg bg-muted/50 p-4">
            {transcript.map((msg, i) => (
              <div
                key={i}
                className={`text-sm ${msg.role === "user" ? "text-foreground" : "text-muted-foreground"}`}
              >
                <span className="text-xs font-medium uppercase">
                  {msg.role === "user" ? "Expert" : "AI"}:{" "}
                </span>
                {msg.content}
              </div>
            ))}
          </div>
        )}
      </div>

      {isPending ? (
        <div className="space-y-3 border-t pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="adminNotes">Admin notes (optional)</Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Notes for the approval or the rejection"
              rows={3}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => void handleApprove()}
              disabled={acting !== null}
              className="min-h-11 flex-1 gap-2"
            >
              {acting === "approve" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
              )}
              Approve and generate PathLab
            </Button>
            <Button
              onClick={() => void handleReject()}
              disabled={acting !== null}
              variant="outline"
              className="min-h-11 flex-1 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive active:bg-destructive/10"
            >
              {acting === "reject" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <XCircle className="h-4 w-4" aria-hidden="true" />
              )}
              Reject
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t pt-4 text-sm text-muted-foreground">
          Status: <span className="font-medium text-foreground">{expert.status}</span>
          {expert.admin_notes && <p className="mt-1">Notes: {expert.admin_notes}</p>}
        </div>
      )}
    </div>
  );
}
