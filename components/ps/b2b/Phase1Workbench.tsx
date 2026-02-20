"use client";

import { useState } from "react";
import type { CRMFeedbackEvent, Phase1WorkflowOutput, RawInstitutionLead } from "@/lib/ps-b2b/types";
import { buildPhase1Payload, parseJsonArrayInput } from "@/components/ps/b2b/phase1-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

const SAMPLE_LEADS: RawInstitutionLead[] = [
  {
    name: "Northbridge International School",
    website: "https://northbridge.example.edu",
    geography: "Bangkok, Thailand",
    studentCount: 1800,
    annualTuitionUsd: 32000,
    counselingProgramSize: 9,
    notes: "Strong college counseling and career-readiness with AI lab pilot.",
    tags: ["college counseling", "career readiness", "ai", "internships"],
    decisionMakers: [
      {
        fullName: "Jane Carter",
        role: "Director of College Counseling",
        email: "jane.carter@northbridge.example.edu",
        linkedinUrl: "https://linkedin.com/in/jane-carter",
      },
    ],
  },
  {
    name: "Riverside Preparatory Academy",
    website: "https://riversideprep.example.edu",
    geography: "Bangkok, Thailand",
    studentCount: 1200,
    annualTuitionUsd: 21000,
    counselingProgramSize: 6,
    notes: "University advising team expanding internship partnerships this year.",
    tags: ["university advising", "career readiness", "internship program"],
    decisionMakers: [
      {
        fullName: "Emma Reid",
        role: "Head of University Guidance",
        email: "emma.reid@riversideprep.example.edu",
      },
    ],
  },
];

const SAMPLE_FEEDBACK: CRMFeedbackEvent[] = [
  {
    leadId: "lead-northbridge-example-edu",
    segmentKey: "bangkok-private-international",
    outcome: "meeting_booked",
    scoreSnapshot: {
      budgetStrength: 80,
      problemUrgency: 70,
      innovationOpenness: 84,
      alignment: 90,
      easeOfAccess: 88,
    },
  },
];

function numberOrDash(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString();
}

function shortText(value: string | undefined, max = 110): string {
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

export function Phase1Workbench() {
  const [geographiesInput, setGeographiesInput] = useState("bangkok, thailand");
  const [keywordsInput, setKeywordsInput] = useState("college counseling, career readiness");
  const [minStudentCount, setMinStudentCount] = useState("500");
  const [minAnnualTuitionUsd, setMinAnnualTuitionUsd] = useState("10000");
  const [topN, setTopN] = useState("10");
  const [includeOutreach, setIncludeOutreach] = useState(true);
  const [useAIOutreach, setUseAIOutreach] = useState(false);

  const [leadsJson, setLeadsJson] = useState(JSON.stringify(SAMPLE_LEADS, null, 2));
  const [feedbackJson, setFeedbackJson] = useState("[]");

  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Phase1WorkflowOutput | null>(null);

  const topLeads = result?.topLeads || [];
  const allLeads = result?.leads || [];

  const averageTopScore = topLeads.length
    ? Math.round((topLeads.reduce((acc, lead) => acc + lead.totalScore, 0) / topLeads.length) * 100) / 100
    : 0;

  const handleLoadSamples = () => {
    setLeadsJson(JSON.stringify(SAMPLE_LEADS, null, 2));
    setFeedbackJson(JSON.stringify(SAMPLE_FEEDBACK, null, 2));
  };

  const handleRun = async () => {
    setError(null);
    setResult(null);

    const leadsParsed = parseJsonArrayInput<RawInstitutionLead>(leadsJson);
    if (leadsParsed.error) {
      setError(`Leads JSON error: ${leadsParsed.error}`);
      return;
    }
    if (!leadsParsed.value.length) {
      setError("Leads JSON must include at least one institution.");
      return;
    }

    const feedbackParsed = parseJsonArrayInput<CRMFeedbackEvent>(feedbackJson);
    if (feedbackParsed.error) {
      setError(`Feedback JSON error: ${feedbackParsed.error}`);
      return;
    }

    const payload = buildPhase1Payload({
      geographiesInput,
      keywordsInput,
      minStudentCount,
      minAnnualTuitionUsd,
      topN,
      includeOutreach,
      useAIOutreach,
      leads: leadsParsed.value,
      feedbackEvents: feedbackParsed.value,
    });

    setIsRunning(true);
    try {
      const response = await fetch("/api/ps/b2b/phase1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.error || `Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as Phase1WorkflowOutput;
      setResult(data);
    } catch (runError: unknown) {
      const message = runError instanceof Error ? runError.message : "Failed to run Phase 1 workflow";
      setError(message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="border border-white/10 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-xl">Phase 1 Controls</CardTitle>
          <CardDescription>
            Configure filters, provide seed institutions, optionally include CRM feedback, then run the pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="geo-input">Geographies (comma-separated)</Label>
              <Input id="geo-input" value={geographiesInput} onChange={(e) => setGeographiesInput(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyword-input">Keywords (comma-separated)</Label>
              <Input id="keyword-input" value={keywordsInput} onChange={(e) => setKeywordsInput(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topn-input">Top N</Label>
              <Input id="topn-input" type="number" min={1} max={100} value={topN} onChange={(e) => setTopN(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-input">Min student count</Label>
              <Input
                id="student-input"
                type="number"
                min={0}
                value={minStudentCount}
                onChange={(e) => setMinStudentCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tuition-input">Min annual tuition (USD)</Label>
              <Input
                id="tuition-input"
                type="number"
                min={0}
                value={minAnnualTuitionUsd}
                onChange={(e) => setMinAnnualTuitionUsd(e.target.value)}
              />
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between rounded-md border border-white/10 p-3">
                <Label htmlFor="outreach-switch" className="text-sm">
                  Include outreach drafts
                </Label>
                <Switch id="outreach-switch" checked={includeOutreach} onCheckedChange={setIncludeOutreach} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-white/10 p-3">
                <Label htmlFor="ai-switch" className="text-sm">
                  Use AI outreach (fallback safe)
                </Label>
                <Switch id="ai-switch" checked={useAIOutreach} onCheckedChange={setUseAIOutreach} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leads-json">Seed leads (JSON array)</Label>
              <Textarea
                id="leads-json"
                className="min-h-[260px] font-mono text-xs"
                value={leadsJson}
                onChange={(e) => setLeadsJson(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-json">CRM feedback events (JSON array, optional)</Label>
              <Textarea
                id="feedback-json"
                className="min-h-[260px] font-mono text-xs"
                value={feedbackJson}
                onChange={(e) => setFeedbackJson(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-950/20 px-3 py-2 text-sm text-red-300">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={handleLoadSamples}>
              Load sample data
            </Button>
            <Button type="button" variant="outline" onClick={() => setFeedbackJson("[]")}>
              Clear feedback events
            </Button>
            <Button type="button" onClick={handleRun} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running pipeline...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Run Phase 1
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Discovered</CardDescription>
                <CardTitle>{result.pipelineStats.discoveredCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Scored</CardDescription>
                <CardTitle>{result.pipelineStats.scoredCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Top Leads</CardDescription>
                <CardTitle>{result.pipelineStats.topCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Top Score</CardDescription>
                <CardTitle>{averageTopScore}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Tabs defaultValue="top-leads" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="top-leads">Top Leads</TabsTrigger>
              <TabsTrigger value="outreach">Outreach</TabsTrigger>
              <TabsTrigger value="learning">Model Learning</TabsTrigger>
            </TabsList>

            <TabsContent value="top-leads">
              <Card>
                <CardHeader>
                  <CardTitle>Qualified Institutions</CardTitle>
                  <CardDescription>Sorted by total score with dimension details.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Institution</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Tuition</TableHead>
                        <TableHead>Signals</TableHead>
                        <TableHead>Red Flags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topLeads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <div className="font-medium">{lead.name}</div>
                            <div className="text-xs text-muted-foreground">{lead.geography || "-"}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono">
                              {lead.totalScore}
                            </Badge>
                          </TableCell>
                          <TableCell>{numberOrDash(lead.studentCount)}</TableCell>
                          <TableCell>{lead.annualTuitionUsd ? `$${lead.annualTuitionUsd.toLocaleString()}` : "-"}</TableCell>
                          <TableCell className="max-w-[240px] text-xs text-muted-foreground">
                            {shortText(
                              [
                                ...lead.alignmentSignals,
                                ...lead.urgencySignals,
                                ...lead.innovationSignals,
                              ].join(", "),
                            ) || "-"}
                          </TableCell>
                          <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                            {shortText(lead.redFlags.join(", ")) || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="mt-6">
                    <h4 className="mb-3 text-sm font-semibold text-muted-foreground">All Scored Leads</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Urgency</TableHead>
                          <TableHead>Innovation</TableHead>
                          <TableHead>Alignment</TableHead>
                          <TableHead>Access</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allLeads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>{lead.name}</TableCell>
                            <TableCell>{lead.totalScore}</TableCell>
                            <TableCell>{lead.breakdown.budgetStrength.score}</TableCell>
                            <TableCell>{lead.breakdown.problemUrgency.score}</TableCell>
                            <TableCell>{lead.breakdown.innovationOpenness.score}</TableCell>
                            <TableCell>{lead.breakdown.alignment.score}</TableCell>
                            <TableCell>{lead.breakdown.easeOfAccess.score}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="outreach">
              <div className="grid gap-4 lg:grid-cols-2">
                {topLeads.map((lead) => (
                  <Card key={lead.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{lead.name}</CardTitle>
                      <CardDescription>
                        {lead.outreach?.usedAI ? "Generated with AI" : "Template-safe draft"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Subject A</div>
                        <div>{lead.outreach?.subjectA || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Subject B</div>
                        <div>{lead.outreach?.subjectB || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Email</div>
                        <div className="whitespace-pre-wrap text-muted-foreground">{lead.outreach?.email || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">LinkedIn</div>
                        <div className="whitespace-pre-wrap text-muted-foreground">
                          {lead.outreach?.linkedinMessage || "-"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="learning">
              <Card>
                <CardHeader>
                  <CardTitle>Manual CRM Learning Loop</CardTitle>
                  <CardDescription>
                    Updates shown when feedback events are included in the request.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.feedbackLearning ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                        {Object.entries(result.feedbackLearning.updatedWeights).map(([key, value]) => (
                          <div key={key} className="rounded-md border border-white/10 p-3">
                            <div className="text-xs uppercase text-muted-foreground">{key}</div>
                            <div className="text-lg font-semibold">{value}</div>
                          </div>
                        ))}
                      </div>

                      <div>
                        <h4 className="mb-2 text-sm font-semibold">Objection Frequency</h4>
                        {Object.keys(result.feedbackLearning.objectionFrequency).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No objections recorded.</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Reason</TableHead>
                                <TableHead>Count</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(result.feedbackLearning.objectionFrequency).map(([reason, count]) => (
                                <TableRow key={reason}>
                                  <TableCell>{reason}</TableCell>
                                  <TableCell>{count}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No feedback events were provided. Add events in the JSON box and run again to update ICP weights.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
