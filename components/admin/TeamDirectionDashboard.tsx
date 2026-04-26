"use client";

import { useState } from "react";
import { TeamDirectionClusterView } from "./TeamDirectionClusterView";
import { TeamDirectionSearch } from "./TeamDirectionSearch";
import { TeamDirectionRagPanel } from "./TeamDirectionRagPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, RefreshCw } from "lucide-react";

export function TeamDirectionDashboard() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [embeddingLoading, setEmbeddingLoading] = useState(false);
  const [reclusterLoading, setReclusterLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

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
