"use client";

import { useMemo } from "react";
import type { CcLeadRow, CcLeadStatus, CcOutreachAttempt } from "@/lib/cc-research/types";
import {
  Badge,
  type BadgeProps,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ResponseState = "pending" | "replied" | "no_response" | "outreach_sent";

interface LeadTableProps {
  leads: CcLeadRow[];
  outreachAttempts: CcOutreachAttempt[];
  responseStates: Record<string, ResponseState>;
  onStatusUpdate: (leadId: string, status: CcLeadStatus, notes?: string) => Promise<void>;
  onRefresh: () => void;
}

const statusBadge: Record<CcLeadStatus, BadgeProps["variant"]> = {
  seeded: "secondary",
  enriched: "secondary",
  scored: "secondary",
  outreach_ready: "default",
  emailed: "outline",
  linkedIned: "outline",
  replied: "default",
  no_response: "outline",
  interviewed: "default",
  blocked: "destructive",
  disqualified: "destructive",
};

const statusTransitions: Record<CcLeadStatus, CcLeadStatus[]> = {
  seeded: ["enriched", "scored", "outreach_ready", "disqualified", "blocked"],
  enriched: ["scored", "outreach_ready", "disqualified", "blocked"],
  scored: ["outreach_ready", "emailed", "linkedIned", "disqualified", "blocked"],
  outreach_ready: ["emailed", "linkedIned", "replied", "no_response", "disqualified", "blocked"],
  emailed: ["replied", "no_response", "linkedIned", "disqualified", "blocked"],
  linkedIned: ["replied", "no_response", "emailed", "disqualified", "blocked"],
  replied: ["interviewed", "disqualified", "blocked"],
  no_response: ["emailed", "linkedIned", "replied", "disqualified", "blocked"],
  interviewed: ["disqualified", "blocked"],
  blocked: ["seeded", "scored", "disqualified"],
  disqualified: ["seeded", "scored", "blocked"],
};

const responseStateLabel: Record<ResponseState, string> = {
  pending: "Pending",
  replied: "Replied",
  no_response: "No response",
  outreach_sent: "Outreach sent",
};

function toScoreLabel(score: number | undefined): string {
  if (score === undefined) return "—";
  return `${score.toFixed(1)}`;
}

export function LeadTable({
  leads,
  outreachAttempts,
  responseStates,
  onStatusUpdate,
  onRefresh,
}: LeadTableProps) {
  const topOutreachLeads = useMemo(() => {
    const byLead = new Map<string, number>();
    for (const attempt of outreachAttempts) {
      byLead.set(attempt.leadId, (byLead.get(attempt.leadId) || 0) + 1);
    }
    return byLead;
  }, [outreachAttempts]);

  const handleTransition = (lead: CcLeadRow, next: CcLeadStatus) => async () => {
    await onStatusUpdate(lead.id, next);
  };

  const sorted = [...leads].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <Card className="border-white/15 bg-black/20">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Lead Table</CardTitle>
        <Button size="sm" variant="outline" onClick={onRefresh}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Institution</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Response</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>ICP fit</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Contacts with outreach</TableHead>
              <TableHead>Persona segment</TableHead>
              <TableHead>Next action</TableHead>
              <TableHead>Transition</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-sm text-muted-foreground">
                  No leads in selected filters.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <p className="font-medium">{lead.institutionName}</p>
                    <p className="text-xs text-muted-foreground">{lead.institutionWebsite}</p>
                  </TableCell>
                  <TableCell>{lead.geography || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadge[lead.status]}>{lead.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {responseStateLabel[responseStates[lead.id] || "pending"]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {toScoreLabel(lead.totalScore)} ({lead.weightedScoreBand})
                  </TableCell>
                  <TableCell className="text-sm">{toScoreLabel(lead.urgencyScore)}</TableCell>
                  <TableCell className="text-sm">{toScoreLabel(lead.icpFitScore)}</TableCell>
                  <TableCell>{lead.decisionMakerCount || 0}</TableCell>
                  <TableCell>{topOutreachLeads.get(lead.id) || 0}</TableCell>
                  <TableCell>
                    {lead.personaSegments.length > 0 ? (
                      <div className="space-x-1">
                        {lead.personaSegments.slice(0, 3).map((persona) => (
                          <Badge key={persona} variant="secondary">
                            {persona}
                          </Badge>
                        ))}
                        {lead.personaSegments.length > 3 ? (
                          <Badge variant="outline">+{lead.personaSegments.length - 3}</Badge>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">unmapped</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-56 text-xs text-muted-foreground">{lead.nextAction}</TableCell>
                  <TableCell>
                    <select
                      className="w-40 rounded-md border border-white/15 bg-background px-2 py-1 text-sm"
                      value={lead.status}
                      onChange={(event) => {
                        void handleTransition(lead, event.target.value as CcLeadStatus)();
                      }}
                    >
                      <option value={lead.status}>{lead.status}</option>
                      {statusTransitions[lead.status].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
