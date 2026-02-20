"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CcDashboardPayload,
  CcLeadStatus,
  CcOutreachAttempt,
  CcPersona,
  CcInterviewOutcome,
  CcInterviewStatus,
  CcOutreachChannel,
} from "@/lib/cc-research/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LeadFunnelChart } from "@/components/cc-research/LeadFunnelChart";
import { LeadTable } from "@/components/cc-research/LeadTable";
import { OutreachQueue } from "@/components/cc-research/OutreachQueue";
import { InterviewTracker } from "@/components/cc-research/InterviewTracker";
import { InsightCards } from "@/components/cc-research/InsightCards";
import { Play, RefreshCw, Download, RotateCcw } from "lucide-react";

type ResponseState = "pending" | "replied" | "no_response" | "outreach_sent";

type DashboardAction = "lead" | "campaign";

interface ResearchDashboardProps {
  payload: CcDashboardPayload;
}

const statusList: Array<"all" | CcLeadStatus> = [
  "all",
  "seeded",
  "enriched",
  "scored",
  "outreach_ready",
  "emailed",
  "linkedIned",
  "replied",
  "no_response",
  "interviewed",
  "blocked",
  "disqualified",
];

const scoreBandList = ["all", "0-40", "41-60", "61-80", "81-100"] as const;
const responseStateList: Array<"all" | ResponseState> = ["all", "pending", "replied", "outreach_sent", "no_response"];

const personaList: Array<"all" | CcPersona> = [
  "all",
  "student",
  "advisor",
  "counselor",
  "career_services",
  "transfer_office",
  "employer",
];

function deriveResponseState(
  leadId: string,
  attempts: CcOutreachAttempt[],
  status: CcLeadStatus,
): ResponseState {
  const related = attempts.filter((attempt) => attempt.leadId === leadId);
  if (related.some((attempt) => Boolean(attempt.responseAt))) {
    return "replied";
  }
  if (related.some((attempt) => Boolean(attempt.sentAt))) {
    return status === "no_response" ? "no_response" : "outreach_sent";
  }
  return "pending";
}

function downloadAsFile(name: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  link.click();
  URL.revokeObjectURL(href);
}

function quoteCsv(value: string): string {
  const escaped = String(value ?? "").replace(/"/g, '""');
  return `"${escaped}"`;
}

function serializePayload(payload: CcDashboardPayload): string {
  const rows: string[] = [];
  rows.push("record_type,lead_id,persona,institution,status,scheduled_at,outcome,pain_themes,notes");

  for (const interview of payload.interviews) {
    rows.push(
      [
        "interview",
        interview.leadId,
        interview.persona,
        "",
        interview.status,
        interview.scheduledAt || "",
        interview.outcome,
        interview.painThemeTags.join("|"),
        interview.notes || "",
      ]
        .map((value) => quoteCsv(value))
        .join(","),
    );
  }

  for (const lead of payload.leads) {
    rows.push(
      [
        "lead",
        lead.id,
        "",
        lead.institutionName,
        lead.status,
        lead.createdAt,
        lead.weightedScoreBand,
        `${lead.totalScore}/${lead.urgencyScore}/${lead.icpFitScore}`,
        lead.notes || "",
      ]
        .map((value) => quoteCsv(value))
        .join(","),
    );
  }

  for (const feedback of payload.feedbackEvents || []) {
    rows.push(
      [
        "feedback",
        feedback.leadId || "",
        "",
        "",
        feedback.outcome,
        "",
        "",
        feedback.objectionReason || "",
        feedback.notes || "",
      ]
        .map((value) => quoteCsv(value))
        .join(","),
    );
  }

  return rows.join("\n");
}

export function ResearchDashboard({ payload }: ResearchDashboardProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"all" | CcLeadStatus>("all");
  const [scoreBandFilter, setScoreBandFilter] = useState<(typeof scoreBandList)[number]>("all");
  const [personaFilter, setPersonaFilter] = useState<"all" | CcPersona>("all");
  const [responseFilter, setResponseFilter] = useState<"all" | ResponseState>("all");
  const [geographyFilter, setGeographyFilter] = useState<string>("all");
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");
  const [seedPayload, setSeedPayload] = useState<string>("");
  const [topN, setTopN] = useState("10");
  const [includeOutreach, setIncludeOutreach] = useState(true);
  const [actionState, setActionState] = useState<{ message: string | null; type: DashboardAction | null }>({
    message: null,
    type: null,
  });
  const [isBusy, setIsBusy] = useState(false);

  const geographies = useMemo(() => {
    const values = new Set<string>();
    for (const lead of payload.leads) {
      if (lead.geography) {
        values.add(lead.geography);
      }
    }
    return ["all", ...Array.from(values).sort()];
  }, [payload.leads]);

  const responseStatesByLead = useMemo(() => {
    const map = new Map<string, ResponseState>();
    for (const lead of payload.leads) {
      map.set(lead.id, deriveResponseState(lead.id, payload.outreachAttempts, lead.status));
    }
    return map;
  }, [payload.leads, payload.outreachAttempts]);

  const filteredLeads = useMemo(() => {
    const parsedStart = dateStart ? new Date(dateStart).getTime() : null;
    const parsedEnd = dateEnd ? new Date(dateEnd).getTime() : null;

    return payload.leads
      .filter((lead) => (statusFilter === "all" ? true : lead.status === statusFilter))
      .filter((lead) => (scoreBandFilter === "all" ? true : lead.weightedScoreBand === scoreBandFilter))
      .filter((lead) =>
        personaFilter === "all" ? true : lead.personaSegments.includes(personaFilter),
      )
      .filter((lead) => {
        if (geographyFilter === "all") return true;
        return (lead.geography || "").toLowerCase().includes(geographyFilter.toLowerCase());
      })
      .filter((lead) => {
        const responseState = responseStatesByLead.get(lead.id) || "pending";
        return responseFilter === "all" ? true : responseState === responseFilter;
      })
      .filter((lead) => {
        if (parsedStart === null && parsedEnd === null) return true;
        const created = new Date(lead.createdAt).getTime();
        if (parsedStart !== null && created < parsedStart) return false;
        if (parsedEnd !== null && created > parsedEnd + 86400000 - 1) return false;
        return true;
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [payload.leads, statusFilter, scoreBandFilter, personaFilter, responseFilter, geographyFilter, dateStart, dateEnd, responseStatesByLead]);

  const filteredFunnel = useMemo(() => {
    const statusOrder: CcLeadStatus[] = [
      "seeded",
      "enriched",
      "scored",
      "outreach_ready",
      "emailed",
      "linkedIned",
      "replied",
      "no_response",
      "interviewed",
      "blocked",
      "disqualified",
    ];
    const buckets = statusOrder.reduce<Record<CcLeadStatus, number>>(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<CcLeadStatus, number>,
    );

    for (const lead of filteredLeads) {
      buckets[lead.status] = (buckets[lead.status] || 0) + 1;
    }

    return statusOrder.map((status) => ({ status, count: buckets[status] }));
  }, [filteredLeads]);

  const clearMessage = () => setActionState({ message: null, type: null });

  const setMessage = (type: DashboardAction, message: string) => {
    setActionState({ message, type });
    window.setTimeout(() => {
      clearMessage();
    }, 5000);
  };

  const runCampaign = async () => {
    setIsBusy(true);
    clearMessage();
    try {
      const response = await fetch("/api/cc-research/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: payload.campaign.id,
          topN: Number.parseInt(topN, 10) || 10,
          includeOutreach,
          force: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to run campaign");
      }

      setMessage("campaign", "Pipeline run completed and scores recalculated.");
      router.refresh();
    } catch (error) {
      setMessage("campaign", error instanceof Error ? error.message : "Unable to run campaign");
    } finally {
      setIsBusy(false);
    }
  };

  const seedLeads = async (format: "json" | "csv") => {
    if (!seedPayload.trim()) {
      setMessage("lead", "Seed input is required.");
      return;
    }

    setIsBusy(true);
    clearMessage();
    try {
      if (format === "json") {
        const parsed = JSON.parse(seedPayload);
        const response = await fetch(`/api/cc-research/campaigns/${payload.campaign.id}/seed-leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: "json", source: "manual", payload: parsed }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Unable to seed leads");
        }
        setMessage("lead", `Seeded ${data.imported} new leads.` + (data.duplicates ? ` (${data.duplicates} duplicates skipped).` : ""));
      } else {
        const response = await fetch(`/api/cc-research/campaigns/${payload.campaign.id}/seed-leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            format: "csv",
            source: "manual",
            payload: seedPayload,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Unable to seed leads");
        }
        setMessage("lead", `Seeded ${data.imported} new leads.` + (data.duplicates ? ` (${data.duplicates} duplicates skipped).` : ""));
      }

      setSeedPayload("");
      router.refresh();
    } catch (error) {
      setMessage("lead", error instanceof Error ? error.message : "Unable to seed leads");
    } finally {
      setIsBusy(false);
    }
  };

  const updateLeadStatus = async (leadId: string, status: CcLeadStatus) => {
    try {
      const response = await fetch(`/api/cc-research/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || `Unable to update status (${response.status})`);
      }
      router.refresh();
    } catch (error) {
      setMessage("lead", error instanceof Error ? error.message : "Unable to update lead status");
      throw error;
    }
  };

  const saveOutreachDraft = async (
    leadId: string,
    channel: CcOutreachChannel,
    draft: { subjectA?: string; subjectB?: string; message: string },
  ) => {
    const response = await fetch("/api/cc-research/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        channel,
        subjectA: draft.subjectA,
        subjectB: draft.subjectB,
        message: draft.message,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || "Failed to save outreach draft");
    }
    router.refresh();
  };

  const createInterview = async (payload: {
    leadId: string;
    persona: CcPersona;
    contactName: string;
    contactRole: string;
    scheduledAt: string | null;
    status: CcInterviewStatus;
    outcome: CcInterviewOutcome;
    painThemeTags: string[];
    notes: string;
    rawTranscriptSnippet?: string;
    recordingLink?: string;
  }) => {
    const response = await fetch("/api/cc-research/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        scheduledAt: payload.scheduledAt || undefined,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error || "Unable to save interview");
    }
    router.refresh();
  };

  const exportEvidence = () => {
    downloadAsFile(
      `${payload.campaign.slug || "cc-campaign"}-evidence-pack.json`,
      JSON.stringify(payload, null, 2),
      "application/json",
    );
    downloadAsFile(
      `${payload.campaign.slug || "cc-campaign"}-evidence-pack.csv`,
      serializePayload(payload),
      "text/csv",
    );
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setScoreBandFilter("all");
    setPersonaFilter("all");
    setResponseFilter("all");
    setGeographyFilter("all");
    setDateStart("");
    setDateEnd("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/15 bg-black/20 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Campaign controls</h2>
            <p className="text-sm text-muted-foreground">
              Seed leads, run discovery/scoring, collect outreach/interview evidence, and export all notes.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2 justify-end">
            <Button onClick={() => void runCampaign()} disabled={isBusy}>
              <Play className="mr-2 h-4 w-4" />
              Run pipeline
            </Button>
            <Button variant="outline" onClick={() => router.refresh()}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reload data
            </Button>
            <Button variant="secondary" onClick={exportEvidence}>
              <Download className="mr-2 h-4 w-4" />
              Export evidence pack
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label htmlFor="topN">Top N</Label>
            <Input
              id="topN"
              type="number"
              min={1}
              max={100}
              value={topN}
              onChange={(event) => setTopN(event.target.value)}
            />
          </div>
          <label className="inline-flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={includeOutreach}
              onChange={(event) => setIncludeOutreach(event.target.checked)}
            />
            Generate outreach drafts
          </label>
          <div>
              <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => {
                void seedLeads("json");
              }}
            >
              Seed JSON
            </Button>
          </div>
          <div>
              <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => {
                void seedLeads("csv");
              }}
            >
              Seed CSV
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="seed-payload">Paste leads (JSON array or CSV payload)</Label>
          <Textarea
            id="seed-payload"
            className="min-h-24"
            placeholder='[{"institutionName":"ABC CC","institutionWebsite":"https://abc.edu",...}] or CSV text'
            value={seedPayload}
            onChange={(event) => setSeedPayload(event.target.value)}
          />
        </div>

        {actionState.message ? (
          <p
            className={`mt-3 text-sm ${actionState.type === "campaign" ? "text-emerald-300" : "text-amber-300"}`}
          >
            {actionState.message}
          </p>
        ) : null}
      </div>

      <Card className="border-white/15 bg-black/20">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Chip-like filters for lead filtering and KPI drilldowns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div>
              <Label htmlFor="geo-filter">Geography</Label>
              <select
                id="geo-filter"
                className="w-full rounded-md border border-white/10 bg-background px-2 py-2 text-sm"
                value={geographyFilter}
                onChange={(event) => setGeographyFilter(event.target.value)}
              >
                {geographies.map((geo) => (
                  <option key={geo} value={geo}>
                    {geo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Score band</Label>
              <select
                className="w-full rounded-md border border-white/10 bg-background px-2 py-2 text-sm"
                value={scoreBandFilter}
                onChange={(event) =>
                  setScoreBandFilter(event.target.value as (typeof scoreBandList)[number])
                }
              >
                {scoreBandList.map((band) => (
                  <option key={band} value={band}>
                    {band}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select
                className="w-full rounded-md border border-white/10 bg-background px-2 py-2 text-sm"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | CcLeadStatus)
                }
              >
                {statusList.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Persona segment</Label>
              <select
                className="w-full rounded-md border border-white/10 bg-background px-2 py-2 text-sm"
                value={personaFilter}
                onChange={(event) => setPersonaFilter(event.target.value as "all" | CcPersona)}
              >
                {personaList.map((persona) => (
                  <option key={persona} value={persona}>
                    {persona}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Response state</Label>
              <select
                className="w-full rounded-md border border-white/10 bg-background px-2 py-2 text-sm"
                value={responseFilter}
                onChange={(event) => setResponseFilter(event.target.value as "all" | ResponseState)}
              >
                {responseStateList.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(event) => setDateStart(event.target.value)}
                />
              </div>
              <div>
                <Label>End date</Label>
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(event) => setDateEnd(event.target.value)}
                />
              </div>
            </div>
            <div className="col-span-full flex flex-wrap items-center gap-2">
              {geographies.map((geo) => (
                <Badge
                  key={geo}
                  variant={geographyFilter === geo ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setGeographyFilter(geo)}
                >
                  {geo}
                </Badge>
              ))}
            </div>
            <div className="col-span-full">
              <Button variant="outline" onClick={resetFilters}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card className="border-white/15 bg-black/20">
          <CardHeader className="pb-2">
            <CardTitle>Status distribution</CardTitle>
            <CardDescription>Discovered {filteredLeads.length} leads under current filters</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {Object.entries(payload.scoreBandDistribution).map(([band, count]) => (
                <Badge key={band} variant="outline">
                  Score {band}: {count}
                </Badge>
              ))}
              {Object.entries(payload.responseStateDistribution).map(([state, count]) => (
                <Badge key={state} variant="secondary">
                  {state}: {count}
                </Badge>
              ))}
            </div>
            <LeadFunnelChart funnel={filteredFunnel} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.45fr_1fr]">
        <LeadTable
          leads={filteredLeads}
          outreachAttempts={payload.outreachAttempts}
          responseStates={Object.fromEntries(
            payload.leads.map((lead) => [lead.id, responseStatesByLead.get(lead.id) || "pending"]),
          )}
          onStatusUpdate={updateLeadStatus}
          onRefresh={() => router.refresh()}
        />
        <OutreachQueue
          leads={filteredLeads}
          outreachAttempts={payload.outreachAttempts}
          onSave={saveOutreachDraft}
          onStatusUpdate={updateLeadStatus}
        />
        <div className="space-y-4">
          <InsightCards payload={payload} interviews={payload.interviews} />
          <InterviewTracker
            leads={payload.leads}
            interviews={payload.interviews}
            onCreate={createInterview}
          />
        </div>
      </div>
    </div>
  );
}
