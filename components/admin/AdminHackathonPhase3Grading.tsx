"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Users,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ImageLightbox } from "@/components/admin/ImageLightbox";

type Phase3EntityType = "cycle" | "midphase" | "video";
type Phase3Status = "ungraded" | "graded" | "all";

interface Phase3Item {
  type: Phase3EntityType;
  id: string;
  team_id: string;
  team_name: string | null;
  team_lobby_code: string | null;
  cycle_number?: number;
  status?: string;
  gate_decision?: string | null;
  hypothesis?: string | null;
  synthesis_result?: string | null;
  confidence_score?: number | null;
  what_learned?: string | null;
  what_changed?: string | null;
  what_wrong?: string | null;
  video_url?: string | null;
  score: number | null;
  scored_by: string | null;
  started_at?: string | null;
  submitted_at: string | null;
  completed_at?: string | null;
  steps?: Array<{ step_type: string; status: string }>;
}

interface Phase3Counts {
  total: number;
  cycles: number;
  midphase: number;
  videos: number;
}

interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

interface CycleDetail {
  cycle_number: number;
  hypothesis_who: string | null;
  hypothesis_will_do: string | null;
  hypothesis_because: string | null;
  hypothesis_measured_by: string | null;
  hypothesis_full: string | null;
  variable_changed: string | null;
  prior_variable: string | null;
  pretotype_method: string | null;
  pretotype_description: string | null;
  pretotype_artifact_url: string | null;
  synthesis_result: string | null;
  synthesis_what_changed: string | null;
  synthesis_honest_wrongness: string | null;
  ai_score: Record<string, number> | null;
  mentor_score: Record<string, number> | null;
  mentor_notes: string | null;
  steps?: Array<{
    id: string;
    step_type: string;
    status: string;
    submission_data: Record<string, any>;
  }>;
  test_sessions?: Array<{
    id: string;
    tester_name: string;
    tester_role: string | null;
    tester_channel: string | null;
    fresh_tester: boolean;
    session_result: string | null;
    behavior_log: Record<string, unknown>[];
    painful_detail: string | null;
    unprompted_quotes: string[];
    session_date: string;
    session_duration_min: number | null;
  }>;
}

interface MidphaseDetail {
  what_learned: string | null;
  what_changed: string | null;
  what_wrong: string | null;
  next_hypothesis: string | null;
  confidence_score: number | null;
  ai_score: { total?: number } | null;
  auto_draft: string | null;
}

interface VideoDetail {
  video_url: string | null;
  storyboard: Record<string, unknown>[];
  ai_scrutinizer_output: { total?: number } | null;
  judge_scores: { total?: number } | null;
  human_review_status: string;
  human_reviewer_notes: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  ungraded: "Needs grading",
  graded: "Graded",
  all: "All",
};

function ScoredByBadge({ scoredBy, score }: { scoredBy: string | null; score: number | null }) {
  if (!scoredBy) return <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-200">Ungraded</Badge>;
  const label = scoredBy === "ai" ? "AI" : scoredBy === "mentor" ? "Mentor" : scoredBy === "judge" ? "Judge" : scoredBy;
  const colorClass = scoredBy === "mentor" || scoredBy === "judge"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
    : "border-blue-500/40 bg-blue-500/10 text-blue-200";
  return (
    <Badge variant="outline" className={colorClass}>
      {label} {score !== null ? `· ${score}` : ""}
    </Badge>
  );
}

function EntityTypeBadge({ type }: { type: Phase3EntityType }) {
  const labels: Record<Phase3EntityType, string> = { cycle: "Cycle", midphase: "Midphase", video: "Video" };
  return (
    <Badge variant="outline" className="border-slate-600 text-slate-400">
      {labels[type]}
    </Badge>
  );
}

export function AdminHackathonPhase3Grading() {
  const [items, setItems] = useState<Phase3Item[]>([]);
  const [counts, setCounts] = useState<Phase3Counts>({ total: 0, cycles: 0, midphase: 0, videos: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiGrading, setAiGrading] = useState(false);
  const [aiStreamMessages, setAiStreamMessages] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCycleStep, setSelectedCycleStep] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Phase3Status | "all">("ungraded");
  const [typeFilter, setTypeFilter] = useState<Phase3EntityType | "all">("all");
  const [cycleFilter, setCycleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("submitted_desc");
  const [showTest, setShowTest] = useState(false);
  const [search, setSearch] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [bulkGradeDialogOpen, setBulkGradeDialogOpen] = useState(false);
  const [bulkGradeStep, setBulkGradeStep] = useState<'preflight' | 'grading' | 'review' | 'submitting'>('preflight');
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkGradeResults, setBulkGradeResults] = useState<Array<{
    id: string;
    type: Phase3EntityType;
    team_name: string | null;
    feedback: string;
    reasoning: string;
    scorecard?: any;
    confidence_score?: number | null;
  }>>([]);

  // Review form state
  const [cycleScores, setCycleScores] = useState({ hypothesis_quality: "", variable_isolation: "", behavioral_evidence: "", tester_freshness: "", synthesis_honesty: "" });
  const [midphaseConfidence, setMidphaseConfidence] = useState("");
  const [judgeScore, setJudgeScore] = useState("");
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState("");
  const [notes, setNotes] = useState("");
  const pageRef = useRef(1);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [selectedId, items]
  );

  const fetchItems = useCallback(async (pg?: number) => {
    const targetPage = pg ?? pageRef.current;
    setLoading(true);
    setMessage("");
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (cycleFilter !== "all") params.set("cycle", cycleFilter);
    if (sortBy !== "submitted_desc") params.set("sort", sortBy);
    if (showTest) params.set("show_test", "true");
    params.set("page", String(targetPage));

    try {
      const response = await fetch(`/api/admin/hackathon/phase3/queue?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to fetch Phase 3 items");
        return;
      }
      setItems(data.items ?? []);
      setCounts(data.counts ?? { total: 0, cycles: 0, midphase: 0, videos: 0 });
      if (data.pagination) setPagination(data.pagination);
      pageRef.current = data.pagination?.page ?? 1;
      setSelectedId((current) => {
        if (current && data.items?.some((s: Phase3Item) => s.id === current)) return current;
        return data.items?.[0]?.id ?? null;
      });
    } catch {
      setMessage("Failed to fetch Phase 3 items");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, cycleFilter, sortBy, showTest]);

  useEffect(() => {
    pageRef.current = 1;
    void fetchItems(1);
  }, [fetchItems]);



  // Reset form when selection changes
  useEffect(() => {
    if (!selected) return;
    setFeedback("");
    setNotes("");
    setCycleScores({ hypothesis_quality: "", variable_isolation: "", behavioral_evidence: "", tester_freshness: "", synthesis_honesty: "" });
    setMidphaseConfidence("");
    setJudgeScore("");
    setAiStreamMessages([]);
    setSelectedCycleStep(null);
  }, [selected?.id]);

  // Load detail when selected
  useEffect(() => {
    if (!selected) return;
    if (detailCache[selected.id]) return;

    let cancelled = false;
    setLoadingDetail(true);

    fetch(`/api/admin/hackathon/phase3/${selected.type === 'cycle' ? 'cycles' : selected.type}/${selected.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setDetailCache((prev) => ({ ...prev, [selected.id]: data }));
      })
      .catch(() => null)
      .finally(() => { if (!cancelled) setLoadingDetail(false); });

    return () => { cancelled = true; };
  }, [selected?.id, selected?.type]);

  function goToPage(pg: number) {
    if (pg < 1 || pg > pagination.total_pages || pg === pagination.page) return;
    pageRef.current = pg;
    void fetchItems(pg);
  }

  const visibleItems = items.filter((item) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [
      item.team_name,
      item.team_lobby_code,
      item.hypothesis,
      item.what_learned,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  async function submitReview() {
    if (!selected) return;
    setSaving(true);
    setMessage("");

    let body: Record<string, unknown> = { feedback, notes };
    if (selected.type === "cycle") {
      body = {
        ...body,
        hypothesis_quality: Number(cycleScores.hypothesis_quality) || 0,
        variable_isolation: Number(cycleScores.variable_isolation) || 0,
        behavioral_evidence: Number(cycleScores.behavioral_evidence) || 0,
        tester_freshness: Number(cycleScores.tester_freshness) || 0,
        synthesis_honesty: Number(cycleScores.synthesis_honesty) || 0,
      };
    } else if (selected.type === "midphase") {
      body = { ...body, confidence_score: Number(midphaseConfidence) || null };
    } else if (selected.type === "video") {
      body = { ...body, total_score: Number(judgeScore) || null, human_review_status: "reviewed" };
    }

    try {
      const response = await fetch(
        `/api/admin/hackathon/phase3/${selected.type === 'cycle' ? 'cycles' : selected.type}/${selected.id}/review`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to save review");
        return;
      }
      setMessage("Review saved.");
      await fetchItems();
    } catch {
      setMessage("Failed to save review");
    } finally {
      setSaving(false);
    }
  }

  async function runAiGrade() {
    if (!selected || selected.type === "video") return; // video not supported yet
    setAiGrading(true);
    setAiStreamMessages([]);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/hackathon/phase3/${selected.type === 'cycle' ? 'cycles' : selected.type}/${selected.id}/ai-grade`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setMessage(data.error ?? "AI grading failed");
        setAiGrading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setMessage("No response stream");
        setAiGrading(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let finalScorecard: Record<string, unknown> | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.type === "thinking") {
              setAiStreamMessages((prev) => prev.slice(-10).concat(`[${obj.model}] ${obj.delta?.slice(0, 80) ?? ""}`));
            } else if (obj.type === "done") {
              finalScorecard = obj.scorecard ?? null;
              if (obj.feedback) setFeedback(obj.feedback);
              setAiStreamMessages((prev) => prev.concat("AI grading complete."));
            } else if (obj.type === "error") {
              setAiStreamMessages((prev) => prev.concat(`Error: ${obj.message}`));
            }
          } catch {
            // ignore malformed lines
          }
        }
      }

      if (finalScorecard && selected.type === "cycle") {
        const c = finalScorecard as Record<string, number>;
        setCycleScores({
          hypothesis_quality: String(c.hypothesis_quality ?? ""),
          variable_isolation: String(c.variable_isolation ?? ""),
          behavioral_evidence: String(c.behavioral_evidence ?? ""),
          tester_freshness: String(c.tester_freshness ?? ""),
          synthesis_honesty: String(c.synthesis_honesty ?? ""),
        });
      }

      await fetchItems();
    } catch (err) {
      setMessage(`AI grading error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAiGrading(false);
    }
  }

  function startBulkAiGrade() {
    const targets = visibleItems.filter((i) => i.type !== "video" && !i.scored_by);
    if (targets.length === 0) {
      setMessage("No ungraded cycles or midphase items in the current view.");
      return;
    }
    setBulkGradeStep("preflight");
    setBulkGradeResults([]);
    setBulkProgress({ current: 0, total: targets.length });
    setBulkGradeDialogOpen(true);
  }

  async function executeBulkAiGrade() {
    const targets = visibleItems.filter((i) => i.type !== "video" && !i.scored_by);
    setBulkGradeStep("grading");
    setBulkProgress({ current: 0, total: targets.length });
    const results = [];

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      setBulkProgress({ current: i + 1, total: targets.length });
      
      try {
        const response = await fetch(
          `/api/admin/hackathon/phase3/${target.type === 'cycle' ? 'cycles' : target.type}/${target.id}/ai-grade`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
        );
        
        if (!response.ok) throw new Error("AI grade failed");
        
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No stream");
        
        const decoder = new TextDecoder();
        let buffer = "";
        let finalData: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line);
              if (obj.type === "done") {
                finalData = obj;
              }
            } catch {}
          }
        }

        if (!finalData) throw new Error("No final data");

        results.push({
          id: target.id,
          type: target.type,
          team_name: target.team_name,
          feedback: finalData.feedback || "",
          reasoning: finalData.reasoning || "",
          scorecard: finalData.scorecard,
        });

      } catch (err) {
        console.error(`Failed to AI grade ${target.id}:`, err);
        // Push an empty result so the admin knows it failed
        results.push({
          id: target.id,
          type: target.type,
          team_name: target.team_name,
          feedback: "",
          reasoning: "AI GRADING FAILED. Please review manually.",
        });
      }
    }

    setBulkGradeResults(results);
    setBulkGradeStep("review");
  }

  async function submitBulkAiGrade() {
    setBulkGradeStep("submitting");
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < bulkGradeResults.length; i++) {
      const result = bulkGradeResults[i];
      setBulkProgress({ current: i + 1, total: bulkGradeResults.length });

      try {
        let reviewBody: Record<string, unknown> = {
          feedback: result.feedback,
          notes: result.reasoning ? `AI Reasoning:\n${result.reasoning}` : "",
        };

        if (result.type === "cycle") {
           const c = result.scorecard || {};
           reviewBody = {
             ...reviewBody,
             hypothesis_quality: Number(c.hypothesis_quality) || 0,
             variable_isolation: Number(c.variable_isolation) || 0,
             behavioral_evidence: Number(c.behavioral_evidence) || 0,
             tester_freshness: Number(c.tester_freshness) || 0,
             synthesis_honesty: Number(c.synthesis_honesty) || 0,
           };
        } else if (result.type === "midphase") {
           reviewBody = { ...reviewBody, confidence_score: null };
        }

        const reviewRes = await fetch(
          `/api/admin/hackathon/phase3/${result.type === 'cycle' ? 'cycles' : result.type}/${result.id}/review`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reviewBody) }
        );

        if (!reviewRes.ok) throw new Error("Save review failed");
        successCount++;
      } catch (err) {
        console.error(`Failed to submit bulk comment for ${result.id}:`, err);
        failCount++;
      }
    }

    setBulkGradeDialogOpen(false);
    setMessage(`Bulk grade complete: ${successCount} saved, ${failCount} failed.`);
    await fetchItems();
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-700/50 bg-slate-900/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{pagination.total_items || counts.total}</CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cycles</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-amber-200">{counts.cycles}</CardContent>
        </Card>
        <Card className="border-blue-500/30 bg-blue-500/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Midphase</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-blue-200">{counts.midphase}</CardContent>
        </Card>
        <Card className="border-purple-500/30 bg-purple-500/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Videos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-purple-200">{counts.videos}</CardContent>
        </Card>
      </div>

      <Card className="border-slate-700/50 bg-slate-900/50">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-amber-300" />
                Phase 3 Grading
              </CardTitle>
              <CardDescription>Grade cycles, mid-phase synthesis, and video submissions.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={startBulkAiGrade} disabled={loading} className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20">
                <Sparkles className="mr-2 h-4 w-4" />
                Bulk AI Grade
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchItems()} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full lg:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team, lobby, or hypothesis" className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as Phase3Status | "all")}>
                <SelectTrigger className="h-10 w-40 border-slate-700 bg-slate-950 text-slate-100">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="ungraded">Needs grading</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val as Phase3EntityType | "all")}>
                <SelectTrigger className="h-10 w-36 border-slate-700 bg-slate-950 text-slate-100">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="cycle">Cycles</SelectItem>
                  <SelectItem value="midphase">Midphase</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>
              {typeFilter === "cycle" || typeFilter === "all" ? (
                <Select value={cycleFilter} onValueChange={setCycleFilter}>
                  <SelectTrigger className="h-10 w-32 border-slate-700 bg-slate-950 text-slate-100">
                    <SelectValue placeholder="Cycle" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                    <SelectItem value="all">All cycles</SelectItem>
                    <SelectItem value="1">Cycle 1</SelectItem>
                    <SelectItem value="2">Cycle 2</SelectItem>
                    <SelectItem value="3">Cycle 3</SelectItem>
                    <SelectItem value="4">Cycle 4</SelectItem>
                    <SelectItem value="5">Cycle 5</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-40 border-slate-700 bg-slate-950 text-slate-100">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                  <SelectItem value="submitted_desc">Newest first</SelectItem>
                  <SelectItem value="submitted_asc">Oldest first</SelectItem>
                  <SelectItem value="score_desc">Highest score</SelectItem>
                  <SelectItem value="score_asc">Lowest score</SelectItem>
                  <SelectItem value="cycle_asc">Cycle number</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5">
                <Switch id="show-test" checked={showTest} onCheckedChange={setShowTest} />
                <Label htmlFor="show-test" className="cursor-pointer text-xs text-slate-300">
                  Test teams
                </Label>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={runAiGrade} disabled={aiGrading || !selected || selected.type === "video"}>
              {aiGrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              AI Grade
            </Button>
          </div>

          {message && <div className="rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">{message}</div>}

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
          ) : visibleItems.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">No Phase 3 items match these filters.</div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
              <div className="flex flex-col gap-4">
                {/* Sidebar list — grouped by team */}
                <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
                  {(() => {
                    // Group visible items by team_id
                    const groups = new Map<string, Phase3Item[]>();
                    for (const item of visibleItems) {
                      const list = groups.get(item.team_id) ?? [];
                      list.push(item);
                      groups.set(item.team_id, list);
                    }

                    // Sort teams by their most recent submission
                    const teamIds = Array.from(groups.keys()).sort((a, b) => {
                      const aItems = groups.get(a)!;
                      const bItems = groups.get(b)!;
                      const aTime = Math.max(...aItems.map((i) => i.submitted_at ? new Date(i.submitted_at).getTime() : 0));
                      const bTime = Math.max(...bItems.map((i) => i.submitted_at ? new Date(i.submitted_at).getTime() : 0));
                      return bTime - aTime;
                    });

                    return teamIds.map((teamId) => {
                      const teamItems = groups.get(teamId)!;
                      const first = teamItems[0];
                      const teamName = first.team_name ?? "Unnamed team";
                      const lobbyCode = first.team_lobby_code;
                      const isExpanded = expandedTeams[teamId] ?? true;

                      // Cycles for this team
                      const cycles = teamItems.filter((i) => i.type === "cycle");
                      const nonCycles = teamItems.filter((i) => i.type !== "cycle");

                      return (
                        <div key={teamId} className="rounded-md border border-slate-800 bg-slate-950/30">
                          {/* Team header */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setExpandedTeams((prev) => ({ ...prev, [teamId]: !isExpanded }))}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedTeams((prev) => ({ ...prev, [teamId]: !isExpanded })); } }}
                            className="flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-slate-900/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-semibold text-slate-100 truncate">{teamName}</span>
                              {lobbyCode && <Badge variant="outline" className="border-slate-700 text-slate-400 shrink-0 text-[10px]">{lobbyCode}</Badge>}
                              <span className="text-xs text-slate-500 shrink-0">{teamItems.length} item{teamItems.length > 1 ? "s" : ""}</span>
                            </div>
                            <div className="shrink-0 text-slate-500">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>

                          {/* Team items */}
                          {isExpanded && (
                            <div className="border-t border-slate-800/50 space-y-1 p-2">
                              {/* Cycles shown as compact pills */}
                              {cycles.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 py-1">
                                  <span className="text-[10px] text-slate-500 mr-1">Cycles:</span>
                                  {cycles
                                    .sort((a, b) => (a.cycle_number ?? 0) - (b.cycle_number ?? 0))
                                    .map((cycle) => {
                                      const isSelected = selected?.id === cycle.id;
                                      return (
                                        <button
                                          key={cycle.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedId(cycle.id);
                                            setSelectedCycleStep(null);
                                          }}
                                          className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                                            isSelected
                                              ? "bg-amber-500/20 text-amber-200 border border-amber-500/40"
                                              : cycle.scored_by
                                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20"
                                              : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                                          }`}
                                        >
                                          <span>#{cycle.cycle_number}</span>
                                          {cycle.scored_by && <span className="text-[9px] opacity-70">· {cycle.score}</span>}
                                          {/* Step progress dots */}
                                          <span className="ml-1 inline-flex items-center gap-0.5">
                                            {(["hypothesis", "pretotype", "test_session", "test_run", "synthesis"] as const).map((st) => {
                                              const step = cycle.steps?.find((s) => s.step_type === st);
                                              const isSubmitted = step?.status === "submitted" || step?.status === "completed";
                                              const hasStep = Boolean(step);
                                              return (
                                                <span
                                                  key={st}
                                                  title={st}
                                                  className={`inline-block h-2 w-2 rounded-full ${
                                                    isSubmitted
                                                      ? "bg-emerald-400"
                                                      : hasStep
                                                      ? "bg-amber-400/70"
                                                      : "bg-slate-600"
                                                  }`}
                                                />
                                              );
                                            })}
                                          </span>
                                        </button>
                                      );
                                    })}
                                </div>
                              )}
                              {/* Non-cycle items */}
                              {nonCycles.map((item) => {
                                const isSelected = selected?.id === item.id;
                                return (
                                  <div
                                    key={`${item.type}-${item.id}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedId(item.id)}
                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(item.id); } }}
                                    className={`flex items-center justify-between gap-2 rounded-md border p-2 text-left transition-colors cursor-pointer ${
                                      isSelected ? "border-amber-400/60 bg-amber-500/10" : "border-slate-800 bg-slate-950/50 hover:border-slate-600"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <EntityTypeBadge type={item.type} />
                                      <span className="text-xs text-slate-300 truncate">
                                        {item.type === "midphase" ? "Mid-phase synthesis" : "Video submission"}
                                      </span>
                                      {item.submitted_at && <span className="text-[10px] text-slate-500 shrink-0">{format(new Date(item.submitted_at), "MMM d, HH:mm")}</span>}
                                    </div>
                                    <ScoredByBadge scoredBy={item.scored_by} score={item.score} />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                    <span className="text-xs text-slate-500">Page {pagination.page} of {pagination.total_pages} · {pagination.total_items} items</span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                      {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                        const start = Math.max(1, Math.min(pagination.page - 2, pagination.total_pages - 4));
                        const pg = start + i;
                        if (pg > pagination.total_pages) return null;
                        return (
                          <Button key={pg} variant={pg === pagination.page ? "default" : "outline"} size="sm" onClick={() => goToPage(pg)} className="min-w-[36px]">{pg}</Button>
                        );
                      })}
                      <Button variant="outline" size="sm" disabled={pagination.page >= pagination.total_pages} onClick={() => goToPage(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Detail panel */}
              {selected && (
                <div className="max-h-[720px] overflow-y-auto rounded-md border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-100">
                          {selected.type === "cycle" ? `Cycle #${selected.cycle_number}` : selected.type === "midphase" ? "Mid-phase Synthesis" : "Video Submission"}
                        </h3>
                        <ScoredByBadge scoredBy={selected.scored_by} score={selected.score} />
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        {selected.team_name ?? "Unnamed team"} {selected.team_lobby_code ? `(${selected.team_lobby_code})` : ""}
                      </p>
                    </div>
                  </div>

                  {loadingDetail && <div className="py-4 text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading details...</div>}

                  {/* AI stream messages */}
                  {aiStreamMessages.length > 0 && (
                    <div className="mt-3 rounded-md border border-blue-800/50 bg-blue-950/20 p-3">
                      <div className="mb-1 text-xs font-semibold text-blue-300">AI Grading</div>
                      <div className="max-h-32 overflow-y-auto space-y-1 text-[10px] text-slate-400 font-mono">
                        {aiStreamMessages.map((m, i) => (<div key={i}>{m}</div>))}
                      </div>
                    </div>
                  )}

                  {/* CYCLE DETAIL */}
                  {selected.type === "cycle" && (
                    <div className="grid gap-4 py-4 lg:grid-cols-[1fr_320px]">
                      <div>
                        {(() => {
                          const detail = detailCache[selected.id] as CycleDetail | undefined;
                          // Preloaded steps from the list API give us immediate tab rendering.
                          // Full detail fetch brings in submission_data lazily.
                          const listSteps = (selected.steps ?? []).map((s) => ({
                            id: "",
                            step_type: s.step_type,
                            status: s.status,
                            submission_data: {},
                          }));
                          const allSteps = detail?.steps ?? listSteps;
                          const stepOrder = ["hypothesis", "pretotype", "test_session", "test_run", "synthesis"];
                          const stepLabel: Record<string, string> = {
                            hypothesis: "Hypothesis",
                            pretotype: "Pretotype",
                            test_session: "Test Session",
                            test_run: "Test Run",
                            synthesis: "Synthesis",
                          };
                          const hasSteps = stepOrder.some((st) => allSteps.some((s) => s.step_type === st));

                          if (!hasSteps) {
                            return (
                              <div className="space-y-4">
                                {selected.hypothesis && (
                                  <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                                    <h4 className="mb-2 text-sm font-semibold text-slate-300">Hypothesis</h4>
                                    <p className="whitespace-pre-wrap text-sm text-slate-200">{selected.hypothesis}</p>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          const firstAvailable = stepOrder.find((st) => allSteps.some((s) => s.step_type === st)) ?? "hypothesis";
                          const activeTab = selectedCycleStep && allSteps.some((s) => s.step_type === selectedCycleStep)
                            ? selectedCycleStep
                            : firstAvailable;

                          return (
                            <Tabs
                              value={activeTab}
                              onValueChange={(val) => setSelectedCycleStep(val)}
                              className="w-full"
                            >
                              <TabsList className="mb-3 flex-wrap h-auto gap-1 bg-slate-950/60 border border-slate-800">
                                {stepOrder.map((st) => {
                                  const step = allSteps.find((s) => s.step_type === st);
                                  const isSubmitted = step?.status === "submitted" || step?.status === "completed";
                                  return (
                                    <TabsTrigger
                                      key={st}
                                      value={st}
                                      disabled={!step}
                                      className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-200 text-xs px-2 py-1"
                                    >
                                      {stepLabel[st]}
                                      {isSubmitted && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                                      {!step && <span className="ml-1 text-slate-600">—</span>}
                                    </TabsTrigger>
                                  );
                                })}
                              </TabsList>

                              <TabsContent value="hypothesis" className="mt-0">
                                {(() => {
                                  const step = allSteps.find((s) => s.step_type === "hypothesis");
                                  const stepData = step?.submission_data ?? {};
                                  const detail = detailCache[selected.id] as CycleDetail | undefined;

                                  const full = stepData?.full_hypothesis || selected.hypothesis || stepData?.hypothesis || detail?.hypothesis_full;
                                  const who = stepData?.who || stepData?.hypothesis_who || detail?.hypothesis_who;
                                  const willDo = stepData?.will_do || stepData?.will || stepData?.hypothesis_will_do || detail?.hypothesis_will_do;
                                  const because = stepData?.because || stepData?.hypothesis_because || detail?.hypothesis_because;
                                  const measuredBy = stepData?.measured_by || stepData?.hypothesis_measured_by || detail?.hypothesis_measured_by;

                                  if (!full && !who && !willDo && !because && !measuredBy) return <div className="text-sm text-slate-500">No hypothesis data yet.</div>;
                                  return (
                                    <div className="space-y-4">
                                      {full && (
                                        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                                          <h4 className="mb-2 text-sm font-semibold text-slate-300">Full Hypothesis</h4>
                                          <p className="whitespace-pre-wrap text-sm text-slate-200">{full}</p>
                                        </div>
                                      )}
                                      {(who || willDo || because || measuredBy) && (
                                        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 space-y-2 text-sm text-slate-200">
                                          {who && <div><span className="font-semibold text-slate-400">Who:</span> {who}</div>}
                                          {willDo && <div><span className="font-semibold text-slate-400">Will do:</span> {willDo}</div>}
                                          {because && <div><span className="font-semibold text-slate-400">Because:</span> {because}</div>}
                                          {measuredBy && <div><span className="font-semibold text-slate-400">Measured by:</span> {measuredBy}</div>}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </TabsContent>

                              <TabsContent value="pretotype" className="mt-0">
                                {(() => {
                                  const step = allSteps.find((s) => s.step_type === "pretotype");
                                  const stepData = step?.submission_data ?? {};
                                  const detail = detailCache[selected.id] as CycleDetail | undefined;

                                  const varChanged = stepData?.variable_changed || stepData?.prior_variable || stepData?.variable || detail?.variable_changed || detail?.prior_variable;
                                  const method = stepData?.method || stepData?.pretotype_method || detail?.pretotype_method;
                                  const desc = stepData?.description || stepData?.pretotype_description || detail?.pretotype_description;
                                  const artifact = stepData?.artifact_url || stepData?.pretotype_artifact_url || detail?.pretotype_artifact_url;

                                  if (!method && !desc && !varChanged && !artifact) return <div className="text-sm text-slate-500">No pretotype data yet.</div>;
                                  return (
                                    <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                                      <h4 className="mb-2 text-sm font-semibold text-slate-300">Pretotype & Setup</h4>
                                      <div className="space-y-2 text-sm text-slate-200">
                                        {varChanged && <div><span className="font-semibold text-slate-400">Variable Changed:</span> {varChanged}</div>}
                                        {method && <div><span className="font-semibold text-slate-400">Method:</span> {method}</div>}
                                        {desc && <div><span className="font-semibold text-slate-400">Description:</span> <p className="whitespace-pre-wrap mt-1">{desc}</p></div>}
                                        {artifact && (
                                          <div>
                                            <span className="font-semibold text-slate-400">Artifact:</span>{" "}
                                            <a href={artifact} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{artifact}</a>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </TabsContent>

                              <TabsContent value="test_session" className="mt-0">
                                {(() => {
                                  const step = allSteps.find((s) => s.step_type === "test_session");
                                  const data = step?.submission_data;
                                  const testers = data?.testers as Array<any> | undefined;
                                  if (!testers?.length) return <div className="text-sm text-slate-500">No test session data yet.</div>;
                                  return (
                                    <div className="space-y-3">
                                      {testers.map((t, idx) => (
                                        <div key={idx} className="rounded border border-slate-700 bg-slate-950/60 p-3 space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-200">{t.name || t.tester_name || `Tester ${idx + 1}`}</span>
                                            {t.fresh_tester !== undefined && (
                                              <Badge variant="outline" className={t.fresh_tester ? "border-emerald-500/40 text-emerald-300" : "border-slate-600 text-slate-400"}>
                                                {t.fresh_tester ? "Fresh" : "Repeat"}
                                              </Badge>
                                            )}
                                          </div>
                                          {t.role && <p className="text-xs text-slate-400">Role: {t.role}</p>}
                                          {t.oldHabit && <p className="text-xs text-slate-400">Old Habit: {t.oldHabit}</p>}
                                          {t.painful_detail && <p className="mt-1 text-xs text-slate-400">Pain: {t.painful_detail}</p>}
                                          {t.session_result && <Badge variant="outline" className="mt-1">{t.session_result}</Badge>}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </TabsContent>

                              <TabsContent value="test_run" className="mt-0">
                                {(() => {
                                  const step = allSteps.find((s) => s.step_type === "test_run");
                                  const data = step?.submission_data;
                                  const runs = data?.runs as Array<any> | undefined;
                                  if (!runs?.length) return <div className="text-sm text-slate-500">No test run data yet.</div>;
                                  return (
                                    <div className="space-y-3">
                                      {runs.map((t, idx) => (
                                        <div key={idx} className="rounded border border-slate-700 bg-slate-950/60 p-3 space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-200">{t.name || `Run ${idx + 1}`}</span>
                                            {t.result && <Badge variant="outline" className="mt-1">{t.result}</Badge>}
                                          </div>
                                          {t.role && <p className="text-xs text-slate-400">Role: {t.role}</p>}
                                          {t.oldHabit && <p className="text-xs text-slate-400">Old Habit: {t.oldHabit}</p>}
                                          {t.observation && <p className="mt-1 text-xs text-slate-400">Observation: {t.observation}</p>}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </TabsContent>

                              <TabsContent value="synthesis" className="mt-0">
                                {(() => {
                                  const step = allSteps.find((s) => s.step_type === "synthesis");
                                  const stepData = step?.submission_data ?? {};
                                  const detail = detailCache[selected.id] as CycleDetail | undefined;

                                  const result = selected.synthesis_result || stepData?.gate_decision || stepData?.result || detail?.synthesis_result;
                                  const changed = stepData?.what_changed || stepData?.synthesis_what_changed || detail?.synthesis_what_changed;
                                  const wrongness = stepData?.honest_wrongness || stepData?.synthesis_honest_wrongness || detail?.synthesis_honest_wrongness;
                                  const nextVar = stepData?.next_variable;

                                  if (!result && !changed && !wrongness && !nextVar) return <div className="text-sm text-slate-500">No synthesis data yet.</div>;
                                  return (
                                    <div className="space-y-4">
                                      {result && (
                                        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                                          <h4 className="mb-2 text-sm font-semibold text-slate-300">Result</h4>
                                          <Badge variant="outline">{result}</Badge>
                                        </div>
                                      )}
                                      <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 space-y-3 text-sm text-slate-200">
                                        {changed && (
                                          <div>
                                            <span className="font-semibold text-slate-400 block mb-1">What Changed / Learned:</span>
                                            <p className="whitespace-pre-wrap">{changed}</p>
                                          </div>
                                        )}
                                        {wrongness && (
                                          <div>
                                            <span className="font-semibold text-slate-400 block mb-1">Honest Wrongness:</span>
                                            <p className="whitespace-pre-wrap">{wrongness}</p>
                                          </div>
                                        )}
                                        {nextVar && (
                                          <div>
                                            <span className="font-semibold text-slate-400 block mb-1">Next Variable to Test:</span>
                                            <p className="whitespace-pre-wrap">{nextVar}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </TabsContent>
                            </Tabs>
                          );
                        })()}
                      </div>

                      {/* Grading form */}
                      <div className="space-y-4 rounded-md border border-slate-800 bg-slate-900/40 p-4">
                        {(() => {
                          const detail = detailCache[selected.id] as CycleDetail | undefined;
                          const aiScore = detail?.ai_score;
                          const mentorScore = detail?.mentor_score;
                          const hasAi = aiScore != null && typeof aiScore === "object";
                          const hasMentor = mentorScore != null && typeof mentorScore === "object";

                          const scoreLabels = [
                            { key: "hypothesis_quality" as const, label: "Hypothesis Quality", icon: "🎯" },
                            { key: "variable_isolation" as const, label: "Variable Isolation", icon: "🔬" },
                            { key: "behavioral_evidence" as const, label: "Behavioral Evidence", icon: "📊" },
                            { key: "tester_freshness" as const, label: "Tester Freshness", icon: "👤" },
                            { key: "synthesis_honesty" as const, label: "Synthesis Honesty", icon: "🧠" },
                          ];

                          const getVal = (key: string) => Number(cycleScores[key as keyof typeof cycleScores]) || 0;
                          const total = scoreLabels.reduce((sum, { key }) => sum + getVal(key), 0);
                          const maxTotal = 100;
                          const passing = 60;

                          return (
                            <div className="space-y-5">
                              {/* Score summary card */}
                              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-semibold text-slate-200">Total Score</span>
                                  <span className={`text-2xl font-bold ${total >= passing ? "text-emerald-400" : "text-amber-400"}`}>
                                    {total}<span className="text-sm text-slate-500 font-normal">/{maxTotal}</span>
                                  </span>
                                </div>
                                <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${total >= passing ? "bg-emerald-500" : "bg-amber-500"}`}
                                    style={{ width: `${Math.min(100, (total / maxTotal) * 100)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
                                  <span>0</span>
                                  <span className={total >= passing ? "text-emerald-400" : "text-amber-400"}>
                                    {total >= passing ? "✓ Passed" : `Needs ${passing - total} more`}
                                  </span>
                                  <span>{maxTotal}</span>
                                </div>
                              </div>

                              {/* Dimension bars */}
                              <div className="space-y-3">
                                {scoreLabels.map(({ key, label, icon }) => {
                                  const val = getVal(key);
                                  const aiVal = hasAi ? (aiScore as Record<string, number>)[key] : null;
                                  const mentorVal = hasMentor ? (mentorScore as Record<string, number>)[key] : null;
                                  return (
                                    <div key={key} className="space-y-1.5">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-300">{icon} {label}</span>
                                        <div className="flex items-center gap-2">
                                          {aiVal != null && (
                                            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">AI {aiVal}</span>
                                          )}
                                          {mentorVal != null && (
                                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Mentor {mentorVal}</span>
                                          )}
                                          <span className={`font-mono font-bold w-6 text-right ${val >= 12 ? "text-emerald-300" : val >= 8 ? "text-amber-300" : "text-rose-300"}`}>{val}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-300 ${val >= 15 ? "bg-emerald-500" : val >= 10 ? "bg-amber-500" : val >= 5 ? "bg-orange-500" : "bg-rose-500"}`}
                                            style={{ width: `${Math.min(100, (val / 20) * 100)}%` }}
                                          />
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                          {[0, 5, 10, 15, 20].map((tick) => (
                                            <button
                                              key={tick}
                                              type="button"
                                              onClick={() => setCycleScores((prev) => ({ ...prev, [key]: String(tick) }))}
                                              className={`w-5 h-6 rounded text-[10px] font-mono transition-colors ${
                                                val === tick
                                                  ? "bg-slate-200 text-slate-900 font-bold"
                                                  : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                                              }`}
                                            >
                                              {tick}
                                            </button>
                                          ))}
                                        </div>
                                        <input
                                          type="number"
                                          min="0"
                                          max="20"
                                          value={cycleScores[key as keyof typeof cycleScores]}
                                          onChange={(e) => setCycleScores((prev) => ({ ...prev, [key]: e.target.value }))}
                                          className="w-12 h-7 rounded border border-slate-700 bg-slate-950 px-1 text-center text-xs text-slate-200"
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor="feedback" className="text-slate-300">Student Feedback</Label>
                                <Textarea
                                  id="feedback"
                                  value={feedback}
                                  onChange={(e) => setFeedback(e.target.value)}
                                  rows={4}
                                  placeholder="What should the team improve? Be specific..."
                                  className="border-slate-700 bg-slate-950 text-slate-200 placeholder:text-slate-600"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="notes" className="text-slate-300">Private Mentor Notes</Label>
                                <Textarea
                                  id="notes"
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  rows={2}
                                  placeholder="Internal notes (not shown to students)"
                                  className="border-slate-700 bg-slate-950 text-slate-200 placeholder:text-slate-600"
                                />
                              </div>
                              <Button onClick={submitReview} disabled={saving} className="w-full">
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Save Review
                              </Button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* MIDPHASE DETAIL */}
                  {selected.type === "midphase" && (
                    <div className="grid gap-4 py-4 lg:grid-cols-[1fr_320px]">
                      <div className="space-y-4">
                        {selected.what_learned && (
                          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                            <h4 className="mb-1 text-sm font-semibold text-slate-300">What learned</h4>
                            <p className="text-sm text-slate-200">{selected.what_learned}</p>
                          </div>
                        )}
                        {selected.what_changed && (
                          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                            <h4 className="mb-1 text-sm font-semibold text-slate-300">What changed</h4>
                            <p className="text-sm text-slate-200">{selected.what_changed}</p>
                          </div>
                        )}
                        {selected.what_wrong && (
                          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                            <h4 className="mb-1 text-sm font-semibold text-slate-300">What was wrong</h4>
                            <p className="text-sm text-slate-200">{selected.what_wrong}</p>
                          </div>
                        )}
                        {(() => {
                          const detail = detailCache[selected.id] as MidphaseDetail | undefined;
                          if (!detail?.next_hypothesis) return null;
                          return (
                            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                              <h4 className="mb-1 text-sm font-semibold text-slate-300">Next hypothesis</h4>
                              <p className="text-sm text-slate-200">{detail.next_hypothesis}</p>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="space-y-4 rounded-md border border-slate-800 bg-slate-900/40 p-4">
                        <h4 className="text-sm font-semibold text-slate-300">Grading</h4>
                        <div className="space-y-1">
                          <Label htmlFor="confidence">Confidence (1-10)</Label>
                          <Input id="confidence" type="number" min="1" max="10" value={midphaseConfidence} onChange={(e) => setMidphaseConfidence(e.target.value)} placeholder="1-10" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="feedback">Feedback</Label>
                          <Textarea id="feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5} placeholder="Student-facing feedback" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="notes">Mentor notes</Label>
                          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Private mentor notes" />
                        </div>
                        <Button onClick={submitReview} disabled={saving} className="w-full">
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Save review
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* VIDEO DETAIL */}
                  {selected.type === "video" && (
                    <div className="grid gap-4 py-4 lg:grid-cols-[1fr_320px]">
                      <div className="space-y-4">
                        {selected.video_url && (
                          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                            <h4 className="mb-2 text-sm font-semibold text-slate-300">Video</h4>
                            <video src={selected.video_url} controls className="w-full max-h-96 rounded-md" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 rounded-md border border-slate-800 bg-slate-900/40 p-4">
                        <h4 className="text-sm font-semibold text-slate-300">Judge scoring</h4>
                        <div className="space-y-1">
                          <Label htmlFor="judge-score">Total score (0-100)</Label>
                          <Input id="judge-score" type="number" min="0" max="100" value={judgeScore} onChange={(e) => setJudgeScore(e.target.value)} placeholder="0-100" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="notes">Judge notes</Label>
                          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Judge feedback" />
                        </div>
                        <Button onClick={submitReview} disabled={saving} className="w-full">
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Save review
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      {/* Bulk Grade Dialog */}
      <Dialog open={bulkGradeDialogOpen} onOpenChange={setBulkGradeDialogOpen}>
        <DialogContent className="border-slate-700 bg-slate-900 text-slate-100 sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk AI Grade & Review</DialogTitle>
            <DialogDescription className="text-slate-400">
              Grade multiple items simultaneously, review the AI outputs, and submit them in one go.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 py-4">
            {bulkGradeStep === "preflight" && (
              <div className="space-y-4 text-center py-8">
                <Sparkles className="mx-auto h-12 w-12 text-emerald-400 opacity-80" />
                <p className="text-lg">
                  You are about to grade <span className="font-bold text-white">{bulkProgress.total}</span> items.
                </p>
                <p className="text-sm text-slate-400">
                  The AI will process each item. You will be able to review and adjust the feedback before any scores are saved to the database.
                </p>
              </div>
            )}

            {bulkGradeStep === "grading" && (
              <div className="space-y-6 text-center py-8">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-400" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Grading in progress...</p>
                  <p className="text-sm text-slate-400">
                    {bulkProgress.current} / {bulkProgress.total} completed
                  </p>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {bulkGradeStep === "review" && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400 mb-4">
                  Review the generated feedback. If you make changes here, they will be saved when you click submit.
                </p>
                <Accordion type="multiple" className="w-full">
                  {bulkGradeResults.map((result, idx) => (
                    <AccordionItem value={`item-${idx}`} key={result.id} className="border-slate-800">
                      <AccordionTrigger className="hover:no-underline hover:bg-slate-800/50 rounded-sm px-3 data-[state=open]:bg-slate-800/50">
                        <div className="flex justify-between items-center w-full pr-4">
                          <span className="font-medium text-slate-200">
                            {result.team_name || "Unknown Team"} <span className="text-slate-500 text-xs font-normal">({result.type})</span>
                          </span>
                          <span className="text-sm font-semibold text-emerald-400">
                            {result.scorecard?.total ? `Score: ${result.scorecard.total}` : "No score"}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 pb-2 px-3 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-400 uppercase tracking-wider">Student Feedback</Label>
                          <Textarea 
                            className="min-h-[120px] font-mono text-sm border-slate-700 bg-slate-950" 
                            value={result.feedback}
                            onChange={(e) => {
                              const newResults = [...bulkGradeResults];
                              newResults[idx].feedback = e.target.value;
                              setBulkGradeResults(newResults);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-400 uppercase tracking-wider">AI Reasoning (Mentor Notes)</Label>
                          <Textarea 
                            className="min-h-[80px] font-mono text-sm border-slate-700 bg-slate-950 text-slate-400" 
                            value={result.reasoning}
                            onChange={(e) => {
                              const newResults = [...bulkGradeResults];
                              newResults[idx].reasoning = e.target.value;
                              setBulkGradeResults(newResults);
                            }}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {bulkGradeStep === "submitting" && (
              <div className="space-y-6 text-center py-8">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-indigo-400" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Submitting to Database...</p>
                  <p className="text-sm text-slate-400">
                    {bulkProgress.current} / {bulkProgress.total} saved
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-slate-800">
            <Button 
              variant="outline" 
              onClick={() => setBulkGradeDialogOpen(false)} 
              disabled={bulkGradeStep === 'grading' || bulkGradeStep === 'submitting'} 
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            
            {bulkGradeStep === "preflight" && (
              <Button onClick={executeBulkAiGrade} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Start AI Grading
              </Button>
            )}

            {bulkGradeStep === "review" && (
              <Button onClick={submitBulkAiGrade} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Send className="mr-2 h-4 w-4" />
                Submit All to Database
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
