"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CcCampaignSummary } from "@/lib/cc-research/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function splitCommaList(input: string): string[] {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.toLowerCase());
}

function toInt(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

interface CampaignListClientProps {
  initialCampaigns: CcCampaignSummary[];
}

export function CampaignListClient({ initialCampaigns }: CampaignListClientProps) {
  const router = useRouter();
  const campaigns = initialCampaigns;
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [geographies, setGeographies] = useState("northeast, west coast, texas");
  const [keywords, setKeywords] = useState("career pathways, transfer, workforce");
  const [minStudentCount, setMinStudentCount] = useState("1200");
  const [minTuition, setMinTuition] = useState("4000");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stateClassMap: Record<CcCampaignSummary["state"], string> = {
    draft: "secondary",
    active: "default",
    paused: "outline",
    completed: "secondary",
    archived: "outline",
  } as Record<CcCampaignSummary["state"], string>;

  const handleCreate = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Campaign title is required.");
      return;
    }

    const filters = {
      geographies: splitCommaList(geographies),
      minStudentCount: toInt(minStudentCount),
      minTuitionUsd: toNumber(minTuition),
      keywords: splitCommaList(keywords),
      personaSegments: [],
    };

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/cc-research/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          goal: goal.trim() || undefined,
          state: "draft",
          filters,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.error || `Failed to create campaign (${response.status})`);
      }

      const payload = (await response.json()) as { campaign: { id: string } };
      const createdId = payload?.campaign?.id;
      router.refresh();
      if (createdId) {
        router.push(`/cc-research/campaigns/${createdId}`);
      }
      setTitle("");
      setGoal("");
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Unable to create campaign";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create CC Campaign</CardTitle>
          <CardDescription>Seed filters apply to discovery; start with a draft campaign and iterate.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campaign-title">Campaign title</Label>
              <Input
                id="campaign-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Community college advisor research"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-goal">Goal</Label>
              <Input
                id="campaign-goal"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Validate lead quality and outreach outcomes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-geographies">Geographies (comma-separated)</Label>
              <Input
                id="campaign-geographies"
                value={geographies}
                onChange={(event) => setGeographies(event.target.value)}
                placeholder="southeast, midwest"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-keywords">Keywords (comma-separated)</Label>
              <Input
                id="campaign-keywords"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                placeholder="career pathways, transfer, work-based"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-student">Minimum student count</Label>
              <Input
                id="min-student"
                value={minStudentCount}
                onChange={(event) => setMinStudentCount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-tuition">Minimum tuition (USD)</Label>
              <Input
                id="min-tuition"
                value={minTuition}
                onChange={(event) => setMinTuition(event.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create campaign"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns</CardTitle>
          <CardDescription>Select a campaign to open its lead pipeline.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {campaigns.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-muted-foreground">
              No campaigns yet. Create one above to start discovery and scoring.
            </div>
          ) : (
            campaigns.map((campaign) => (
              <Link
                key={campaign.campaignId}
                href={`/cc-research/campaigns/${campaign.campaignId}`}
                className="block rounded-lg border border-white/10 p-4 transition hover:border-indigo-400/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{campaign.campaignTitle}</h3>
                    <p className="text-xs text-muted-foreground">/{campaign.campaignSlug}</p>
                  </div>
                  <Badge variant={stateClassMap[campaign.state] as "default" | "secondary" | "outline"}>
                    {campaign.state}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Leads: {campaign.leadCount} | Score avg: {campaign.scoreAvg}
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
