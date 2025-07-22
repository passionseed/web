"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getGraphData } from "@/lib/supabase/reflection";
import { Project } from "@/types/project";
import { ReflectionWithMetrics } from "@/types/reflection";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { getEmojiForEmotion } from "@/lib/emotions";
import { ExpandedReflectionCard } from "@/components/reflection/ExpandedReflectionCard";
import dynamic from "next/dynamic";
import {
  ForceGraphMethods,
  LinkObject,
  NodeObject,
} from "react-force-graph-2d";

// --- GRAPH TYPE DEFINITIONS ---
type GraphNode = NodeObject & {
  id: string;
  type: "project" | "tag" | "reflection";
  label: string;
  color: string;
  emotion?: string;
};
type GraphLink = LinkObject;
type GraphData = { nodes: GraphNode[]; links: GraphLink[] };

// --- DYNAMIC IMPORT FOR THE GRAPH ---
const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d").then((mod) => mod.default as any),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    ),
  }
);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

export default function ReflectionHome() {
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [reflections, setReflections] = useState<ReflectionWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const graphRef = useRef<ForceGraphMethods>();
  const [highlightedNodes, setHighlightedNodes] = useState(new Set<string>());
  const [highlightedLinks, setHighlightedLinks] = useState(new Set<GraphLink>());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { projects, reflections } = await getGraphData();
      setProjects(projects);
      setReflections(reflections);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (projects.length > 0) {
      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];
      const tagMap = new Map<string, GraphNode>();

      projects.forEach((project) => {
        nodes.push({
          id: project.id,
          type: "project",
          label: project.name,
          color: "#4FD1C5", // Teal for projects
        });

        project.tags?.forEach((tag) => {
          if (!tagMap.has(tag.id)) {
            const tagNode: GraphNode = {
              id: tag.id,
              type: "tag",
              label: tag.name,
              color: tag.color || "#FF4136", // Red for tags
            };
            tagMap.set(tag.id, tagNode);
            nodes.push(tagNode);
          }
          links.push({ source: project.id, target: tag.id });
        });

        project.reflections?.forEach((reflection) => {
          nodes.push({
            id: reflection.id,
            type: "reflection",
            label: formatDate(reflection.created_at),
            color: "#3182CE", // Blue for reflections
            emotion: getEmojiForEmotion(reflection.emotion),
          });
          links.push({ source: project.id, target: reflection.id });
        });
      });

      setGraphData({ nodes, links });
    }
  }, [projects]);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force("charge")?.strength(-150);
      graphRef.current.d3Force("link")?.distance(60);
    }
  }, []);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.type === "reflection") {
        setExpandedCardId(node.id);
        clearHighlight();
        return;
      }

      const newHighlightedNodes = new Set<string>([node.id]);
      const newHighlightedLinks = new Set<GraphLink>();

      graphData.links.forEach((link) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (sourceId === node.id || targetId === node.id) {
          newHighlightedNodes.add(sourceId as string);
          newHighlightedNodes.add(targetId as string);
          newHighlightedLinks.add(link);
        }
      });
      setHighlightedNodes(newHighlightedNodes);
      setHighlightedLinks(newHighlightedLinks);

      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 1000);
        graphRef.current.zoom(2.5, 1000);
      }
    },
    [graphData.links]
  );

  const clearHighlight = () => {
    setHighlightedNodes(new Set());
    setHighlightedLinks(new Set());
  };

  const nodeCanvasObject = (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label || "";
    const isHighlighted = highlightedNodes.has(node.id as string);
    const isFaded = highlightedNodes.size > 0 && !isHighlighted;
    const nodeSize = node.type === "project" ? 12 : node.type === "tag" ? 6 : 8;

    ctx.globalAlpha = isFaded ? 0.15 : 1;

    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, nodeSize, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.color || "rgba(255,255,255,0.8)";
    ctx.fill();

    // Draw highlight ring for non-faded nodes
    if (isHighlighted) {
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, nodeSize * 1.4, 0, 2 * Math.PI, false);
      ctx.strokeStyle = "rgba(255, 255, 0, 0.7)";
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }

    // Draw text/emoji
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";

    if (node.type === "reflection" && node.emotion) {
      const emojiSize = nodeSize * 1.5;
      ctx.font = `${emojiSize}px Sans-Serif`;
      ctx.fillText(node.emotion, node.x!, node.y!);
    } else {
      const fontSize = 12 / globalScale;
      ctx.font = `bold ${fontSize}px Sans-Serif`;
      
      if (globalScale > 1.5) { // Only show labels when zoomed in
        ctx.fillText(label, node.x!, node.y! + nodeSize + fontSize);
      }
    }
    ctx.globalAlpha = 1;
  };

  const expandedCard = expandedCardId
    ? reflections.find((r) => r.id === expandedCardId)
    : undefined;

  return (
    <div className="relative">
      <AnimatePresence>
        {expandedCard && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setExpandedCardId(null)}
            />
            <ExpandedReflectionCard
              reflection={expandedCard}
              onClose={() => setExpandedCardId(null)}
            />
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-col min-h-screen bg-background">
        <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-sm z-10">
          <h1 className="text-2xl font-semibold">Reflection Journey</h1>
          <Button onClick={() => router.push("/me/reflection/new")}>
            <Plus className="mr-2 h-4 w-4" /> Add Reflection
          </Button>
        </div>

        <main className="flex-1 p-4 md:p-6">
          {loading ? (
            <>
              <div className="mb-8 p-4 border rounded-lg bg-card shadow-md">
                <h2 className="text-lg font-semibold mb-4">Project Connections</h2>
                <Skeleton className="w-full h-[500px] rounded-md" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : reflections.length === 0 ? (
            <div className="text-center mt-16">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold mt-4">No reflections yet</h2>
              <Button
                onClick={() => router.push("/me/reflection/new")}
                className="mt-4"
              >
                Add First Reflection
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8 p-4 border rounded-lg bg-card shadow-md">
                <h2 className="text-lg font-semibold mb-2">
                  Project Connections
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Click on a project or tag to see its connections, or click a reflection to view details.
                </p>
                <div className="w-full h-[500px] relative rounded-md overflow-hidden border bg-gray-900/20">
                  <ForceGraph2D
                    ref={graphRef}
                    graphData={graphData}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={clearHighlight}
                    nodeLabel="label"
                    nodeCanvasObject={nodeCanvasObject}
                    linkColor={(link) => highlightedLinks.has(link) ? "rgba(255, 255, 0, 0.9)" : "rgba(255, 255, 255, 0.2)"}
                    linkWidth={(link) => highlightedLinks.has(link) ? 2 : 0.5}
                    linkDirectionalParticles={link => highlightedLinks.has(link) ? 4 : 0}
                    linkDirectionalParticleWidth={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reflections.map((reflection) => (
                  <motion.div
                    key={reflection.id}
                    layoutId={`card-${reflection.id}`}
                    onClick={() => setExpandedCardId(reflection.id)}
                    className="cursor-pointer"
                  >
                    <Card className="hover:shadow-lg transition-shadow h-full">
                      <CardHeader>
                        <CardTitle className="text-base">
                          {reflection.project.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(reflection.created_at)}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <p className="line-clamp-3 text-sm">{reflection.content}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}