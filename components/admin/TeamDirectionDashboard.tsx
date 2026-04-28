"use client";

import { useState } from "react";
import { TeamDirectionClusterView } from "./TeamDirectionClusterView";
import { TeamDirectionSearch } from "./TeamDirectionSearch";
import { TeamDirectionRagPanel } from "./TeamDirectionRagPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Zap, RefreshCw, Play } from "lucide-react";

export function TeamDirectionDashboard() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [embeddingLoading, setEmbeddingLoading] = useState(false);
  const [reclusterLoading, setReclusterLoading] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [testTeamId, setTestTeamId] = useState("");

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

  const handleProcessPending = async () => {
    setProcessLoading(true);
    setLastAction(null);
    try {
      const res = await fetch("/api/admin/hackathon/team-directions/process-pending", { method: "POST" });
      const data = await res.json();
      const completed = data.results?.filter((r: any) => r.status === "completed").length ?? 0;
      const failed = data.results?.filter((r: any) => r.status === "failed").length ?? 0;
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
            placeholder="Team ID..."
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
