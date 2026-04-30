"use client";

import { useState } from "react";
import { TeamDirectionClusterView } from "./TeamDirectionClusterView";
import { TeamDirectionSearch } from "./TeamDirectionSearch";
import { TeamDirectionRagPanel } from "./TeamDirectionRagPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Zap, RefreshCw, Play, Eye } from "lucide-react";

export function TeamDirectionDashboard() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [embeddingLoading, setEmbeddingLoading] = useState(false);
  const [reclusterLoading, setReclusterLoading] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [testTeamId, setTestTeamId] = useState("");
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewDebug, setPreviewDebug] = useState<Record<string, unknown> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleEmbedAll = async () => {
    if (!confirm("This will enqueue embedding jobs for ALL teams. Continue?")) return;
    setEmbeddingLoading(true);
    try {
      const res = await fetch("/api/admin/hackathon/team-directions/embed-all", { method: "POST" });
      const data = await res.json();
      setLastAction(`Enqueued ${data.enqueued ?? 0} teams for embedding`);
    } catch (err) {
      setLastAction("Failed to enqueue embeddings");
    } finally {
      setEmbeddingLoading(false);
    }
  };

  const handleEmbedSingle = async () => {
    if (!testTeamId.trim()) return;
    setEmbeddingLoading(true);
    setLastAction(null);
    try {
      const res = await fetch("/api/admin/hackathon/team-directions/embed-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: testTeamId.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setLastAction(`✓ Embedded team ${data.teamId} → snapshot ${data.snapshotId}`);
        setTestTeamId("");
      } else {
        setLastAction(`✗ ${data.error ?? "Failed"}`);
      }
    } catch (err) {
      setLastAction(`✗ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setEmbeddingLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!testTeamId.trim()) return;
    setPreviewLoading(true);
    setPreviewText(null);
    try {
      const res = await fetch("/api/admin/hackathon/team-directions/embed-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: testTeamId.trim(), dryRun: true }),
      });
      const data = await res.json();
      if (data.error) setLastAction(`✗ ${data.error}`);
      else {
        setPreviewText(data.text || "(empty — no text submissions found)");
        setPreviewDebug(data.debug ?? null);
      }
    } catch (err) {
      setLastAction(`✗ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleProcessPending = async () => {
    setProcessLoading(true);
    setLastAction(null);
    try {
      const res = await fetch("/api/admin/hackathon/team-directions/process-pending", { method: "POST" });
      const data = await res.json();
      const completed = data.results?.filter((r: { status: string }) => r.status === "completed").length ?? 0;
      const failed = data.results?.filter((r: { status: string }) => r.status === "failed").length ?? 0;
      setLastAction(`Processed ${data.processed ?? 0} jobs: ${completed} OK, ${failed} failed`);
    } catch (err) {
      setLastAction("Failed to process pending jobs");
    } finally {
      setProcessLoading(false);
    }
  };

  const handleRecluster = async () => {
    if (!confirm("This will recluster all team directions. Continue?")) return;
    setReclusterLoading(true);
    try {
      const res = await fetch("/api/admin/hackathon/team-directions/recluster", { method: "POST" });
      const data = await res.json();
      setLastAction(`Reclustered: ${data.clusteringId ?? "done"}`);
    } catch (err) {
      setLastAction("Failed to recluster");
    } finally {
      setReclusterLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          onClick={handleEmbedAll}
          disabled={embeddingLoading}
          variant="outline"
          size="sm"
        >
          {embeddingLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
          Embed All Teams
        </Button>
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Team ID or lobby code..."
            value={testTeamId}
            onChange={(e) => setTestTeamId(e.target.value)}
            className="w-64 text-xs"
            disabled={embeddingLoading}
          />
          <Button
            onClick={handleEmbedSingle}
            disabled={embeddingLoading || !testTeamId.trim()}
            variant="default"
            size="sm"
          >
            {embeddingLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Embed One Team
          </Button>
          <Button
            onClick={handlePreview}
            disabled={previewLoading || !testTeamId.trim()}
            variant="outline"
            size="sm"
          >
            {previewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Preview Text
          </Button>
        </div>
        <Button
          onClick={handleProcessPending}
          disabled={processLoading}
          variant="secondary"
          size="sm"
        >
          {processLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Process Pending
        </Button>
        <Button
          onClick={handleRecluster}
          disabled={reclusterLoading}
          variant="outline"
          size="sm"
        >
          {reclusterLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Recluster
        </Button>
        {lastAction && (
          <span className="text-sm text-muted-foreground">{lastAction}</span>
        )}
      </div>

      <Tabs defaultValue="clusters" className="w-full">

        {previewText !== null && (
          <div className="mb-4 rounded-md border border-slate-700 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">
                Collected text preview · {previewText.length} chars
              </span>
              <button onClick={() => setPreviewText(null)} className="text-xs text-slate-500 hover:text-slate-300">
                Close
              </button>
            </div>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed">
              {previewText}
            </pre>
          </div>
        )}
        <TabsList>
          <TabsTrigger value="clusters">Cluster Map</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="insights">Ask AI</TabsTrigger>
        </TabsList>

        <TabsContent value="clusters">
          <TeamDirectionClusterView
            onSelectTeam={setSelectedTeamId}
            selectedTeamId={selectedTeamId}
          />
        </TabsContent>

        <TabsContent value="search">
          <TeamDirectionSearch onSelectTeam={setSelectedTeamId} />
        </TabsContent>

        <TabsContent value="insights">
          <TeamDirectionRagPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
