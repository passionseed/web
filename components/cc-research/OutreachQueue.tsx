"use client";

import { useEffect, useMemo, useState } from "react";
import type { CcLeadRow, CcOutreachAttempt, CcOutreachChannel, CcLeadStatus } from "@/lib/cc-research/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface OutreachQueueProps {
  leads: CcLeadRow[];
  outreachAttempts: CcOutreachAttempt[];
  onSave: (
    leadId: string,
    channel: CcOutreachChannel,
    payload: {
      subjectA?: string;
      subjectB?: string;
      message: string;
    },
  ) => Promise<void>;
  onStatusUpdate: (leadId: string, status: CcLeadStatus) => Promise<void>;
}

interface Draft {
  leadId: string;
  channel: CcOutreachChannel;
  subjectA: string;
  subjectB: string;
  message: string;
}

type DraftKey = string;

function draftKey(leadId: string, channel: CcOutreachChannel): DraftKey {
  return `${leadId}:${channel}`;
}

function toDraft(lead: CcLeadRow, channel: CcOutreachChannel, attempts: CcOutreachAttempt[]): Draft {
  const attempt = attempts.find((entry) => entry.leadId === lead.id && entry.channel === channel);
  const fallbackSubject = `Outreach for ${lead.institutionName}`;

  if (!attempt) {
    return {
      leadId: lead.id,
      channel,
      subjectA: fallbackSubject,
      subjectB: fallbackSubject,
      message: `Hi,\n\nI noticed your institution may benefit from better student career planning workflows at ${lead.institutionName}.\n\nWould you be open to a short call next week?`,
    };
  }

  return {
    leadId: lead.id,
    channel,
    subjectA: attempt.subjectA || fallbackSubject,
    subjectB: attempt.subjectB || fallbackSubject,
    message: attempt.message,
  };
}

function copyToClipboard(value: string) {
  if (!value) return;
  void navigator.clipboard.writeText(value);
}

export function OutreachQueue({ leads, outreachAttempts, onSave, onStatusUpdate }: OutreachQueueProps) {
  const candidates = useMemo(() => {
    return leads
      .filter((lead) => ["scored", "outreach_ready", "emailed", "linkedIned", "replied"].includes(lead.status))
      .slice(0, 10);
  }, [leads]);

  const statusOptions: CcLeadStatus[] = ["emailed", "linkedIned", "replied", "no_response", "disqualified"];
  const [drafts, setDrafts] = useState<Record<DraftKey, Draft>>({});

  useEffect(() => {
    setDrafts((previous) => {
      const next = { ...previous };

      for (const lead of candidates) {
        const emailDraft = toDraft(lead, "email", outreachAttempts);
        const linkedinDraft = toDraft(lead, "linkedin", outreachAttempts);
        const emailKey = draftKey(emailDraft.leadId, emailDraft.channel);
        const linkedinKey = draftKey(linkedinDraft.leadId, linkedinDraft.channel);

        if (!next[emailKey]) {
          next[emailKey] = emailDraft;
        }
        if (!next[linkedinKey]) {
          next[linkedinKey] = linkedinDraft;
        }
      }

      return next;
    });
  }, [candidates, outreachAttempts]);

  const getDraft = (leadId: string, channel: CcOutreachChannel): Draft => {
    const lead = leads.find((entry) => entry.id === leadId);
    if (!lead) {
      throw new Error("Unknown lead for outreach draft");
    }

    const fallback = toDraft(lead, channel, outreachAttempts);
    return drafts[draftKey(leadId, channel)] || fallback;
  };

  const updateDraft = (leadId: string, channel: CcOutreachChannel, partial: Partial<Draft>) => {
    const lead = leads.find((entry) => entry.id === leadId);
    if (!lead) return;

    const fallback = toDraft(lead, channel, outreachAttempts);
    const key = draftKey(leadId, channel);
    setDrafts((previous) => ({
      ...previous,
      [key]: {
        ...fallback,
        ...previous[key],
        ...partial,
      },
    }));
  };

  const renderDraftSection = (lead: CcLeadRow, channel: CcOutreachChannel, label: string) => {
    const draft = getDraft(lead.id, channel);
    return (
      <div>
        <p className="mb-2 text-sm font-medium">{label} draft</p>
        <Textarea
          className="min-h-20 text-sm"
          value={draft.message}
          onChange={(event) =>
            updateDraft(lead.id, channel, {
              message: event.target.value,
            })
          }
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => copyToClipboard(draft.message)}>
            {channel === "email" ? "Copy Email" : "Copy LinkedIn"}
          </Button>
          <Button
            size="sm"
            onClick={() =>
              void onSave(draft.leadId, channel, {
                subjectA: draft.subjectA,
                subjectB: draft.subjectB,
                message: draft.message,
              })
            }
          >
            Save draft
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-white/15 bg-black/20">
      <CardHeader>
        <CardTitle>Outreach Draft Queue</CardTitle>
        <CardDescription>
          Copy draft email/LinkedIn copy for manual send. Upsert a draft anytime to keep history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No outreach-ready leads yet. Run discovery + scoring to seed the queue.
          </p>
        ) : (
          candidates.map((lead) => {
            return (
              <div key={lead.id} className="rounded-md border border-white/10 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{lead.institutionName}</p>
                    <p className="text-xs text-muted-foreground">Status: {lead.status}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`lead-${lead.id}-status`} className="text-xs text-muted-foreground">
                      Status
                    </label>
                    <select
                      id={`lead-${lead.id}-status`}
                      className="rounded-md border border-white/10 bg-background px-2 py-1 text-xs"
                      value={lead.status}
                      onChange={(event) => {
                        void onStatusUpdate(lead.id, event.target.value as CcLeadStatus);
                      }}
                    >
                      <option value={lead.status}>{lead.status}</option>
                      {statusOptions
                        .filter((status) => status !== lead.status)
                        .map((status) => (
                          <option key={`${lead.id}-${status}`} value={status}>
                            {status}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    {renderDraftSection(lead, "email", "Email")}
                    <div className="mt-4" />
                    {renderDraftSection(lead, "linkedin", "LinkedIn")}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
