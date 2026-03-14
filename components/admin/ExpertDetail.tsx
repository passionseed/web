"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";

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

export function ExpertDetail({ expertId, onBack, onActionComplete }: ExpertDetailProps) {
  const [expert, setExpert] = useState<ExpertDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState("");
  const [isActing, setIsActing] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const fetchExpert = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/experts/${expertId}`);
        if (response.ok) {
          const data = await response.json();
          setExpert(data.expert);
          setAdminNotes(data.expert.admin_notes || "");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpert();
  }, [expertId]);

  const handleApprove = async () => {
    setIsActing(true);
    setActionResult(null);
    try {
      const response = await fetch(`/api/admin/experts/${expertId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes, generatePathLab: true }),
      });
      const data = await response.json();
      if (response.ok) {
        setActionResult(
          data.pathlabGenerated
            ? `Approved and PathLab generated (seed: ${data.seedId})`
            : `Approved. ${data.warning || "PathLab not generated."}`
        );
        onActionComplete();
      } else {
        setActionResult("Error: " + (data.error || "Failed to approve"));
      }
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async () => {
    setIsActing(true);
    setActionResult(null);
    try {
      const response = await fetch(`/api/admin/experts/${expertId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: adminNotes }),
      });
      const data = await response.json();
      if (response.ok) {
        setActionResult("Expert rejected.");
        onActionComplete();
      } else {
        setActionResult("Error: " + (data.error || "Failed to reject"));
      }
    } finally {
      setIsActing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Expert not found.
        <Button variant="link" onClick={onBack}>Go back</Button>
      </div>
    );
  }

  const interviewData = expert.interview_data as Record<string, unknown>;
  const isPending = expert.status === "pending";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Badge variant="outline">{expert.status}</Badge>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{expert.name}</h2>
        <p className="text-muted-foreground">{expert.title} at {expert.company}</p>
        <p className="text-sm text-muted-foreground">Field: {expert.field_category}</p>
        <p className="text-sm text-muted-foreground">
          Submitted: {format(new Date(expert.created_at), "MMM d, yyyy HH:mm")}
        </p>
        {expert.linkedin_url && (
          <a
            href={expert.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            LinkedIn <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <p className="text-sm">
          Mentoring:{" "}
          <span className="font-medium">{expert.mentoring_preference}</span>
          {expert.booking_url && (
            <>
              {" · "}
              <a href={expert.booking_url} target="_blank" rel="noopener noreferrer" className="text-blue-400">
                Booking link
              </a>
            </>
          )}
        </p>
      </div>

      {Object.keys(interviewData).length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold">Extracted interview data</h3>
          <div className="grid grid-cols-1 gap-3 text-sm">
            {(["dailyTasks", "challenges", "rewards", "misconceptions"] as const).flatMap((key) => {
              const items = (interviewData[key] as string[]) || [];
              if (!items.length) return [];
              return [(
                <div key={key}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {items.slice(0, 5).map((item: string, i: number) => (
                      <li key={i} className="text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              )];
            })}
            {typeof interviewData.advice === "string" && interviewData.advice && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Advice</p>
                <p className="text-muted-foreground italic">"{interviewData.advice}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <button
          onClick={() => setShowTranscript((v) => !v)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          {showTranscript ? "Hide" : "Show"} full transcript ({expert.interview_transcript.length} messages)
        </button>
        {showTranscript && (
          <div className="mt-3 space-y-2 max-h-80 overflow-y-auto bg-muted/50 rounded-lg p-4">
            {expert.interview_transcript.map((msg, i) => (
              <div key={i} className={`text-sm ${msg.role === "user" ? "text-foreground" : "text-muted-foreground"}`}>
                <span className="font-medium text-xs uppercase">{msg.role === "user" ? "Expert" : "AI"}: </span>
                {msg.content}
              </div>
            ))}
          </div>
        )}
      </div>

      {isPending && (
        <div className="space-y-3 border-t pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="adminNotes">Admin notes (optional)</Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Notes for approval/rejection..."
              rows={3}
            />
          </div>

          {actionResult && (
            <p className="text-sm text-green-400">{actionResult}</p>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleApprove}
              disabled={isActing}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white gap-2"
            >
              {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Approve & Generate PathLab
            </Button>
            <Button
              onClick={handleReject}
              disabled={isActing}
              variant="outline"
              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2"
            >
              {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Reject
            </Button>
          </div>
        </div>
      )}

      {!isPending && (
        <div className="text-sm text-muted-foreground border-t pt-4">
          Status: <span className="font-medium text-foreground">{expert.status}</span>
          {expert.admin_notes && (
            <p className="mt-1">Notes: {expert.admin_notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
