"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getReflectionTimeline } from "@/lib/supabase/reflection";
import { ReflectionTimelineNode } from "@/types/reflection";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { getEmotionColor, getEmojiForEmotion } from "@/lib/emotions";
import { ExpandedReflectionCard } from "@/components/reflection/ExpandedReflectionCard";
import dynamic from "next/dynamic";
import {
  ForceGraphMethods,
  LinkObject,
  NodeObject,
} from "react-force-graph-2d";

// --- TYPE DEFINITIONS ---

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type ReflectionWithSatisfaction = ReflectionTimelineNode & {
  satisfaction?: number;
  metrics?: {
    satisfaction: number;
    engagement: number;
  };
  contentPreview: string;
  tags?: Tag[];
  emotion: string;
  date: string;
};

// --- GRAPH TYPE DEFINITIONS (ENHANCED) ---
// We add more specific properties that we'll use for rendering
type GraphNode = NodeObject & {
  id: string;
  type: "reflection" | "tag";
  label: string;
  color: string;
  emotion?: string; // For reflection nodes
};

type GraphLink = LinkObject;

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

// --- DYNAMIC IMPORT FOR THE GRAPH ---
const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d").then((mod) => mod.default as any),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] flex items-center justify-center">
        <p className="text-center text-muted-foreground">Loading Graph...</p>
      </div>
    ),
  }
);

// --- HELPER FUNCTIONS ---
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// --- MAIN PAGE COMPONENT ---
export default function ReflectionHome() {
  const router = useRouter();
  const { toast } = useToast();
  const [reflections, setReflections] = useState<ReflectionWithSatisfaction[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // --- ENHANCED STATE FOR GRAPH INTERACTIVITY ---
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods>();
  const [graphDimensions, setGraphDimensions] = useState({
    width: 0,
    height: 400,
  });
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  const [highlightedLinks, setHighlightedLinks] = useState(new Set());
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  const fetchReflections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReflectionTimeline();
      if (Array.isArray(data)) {
        setReflections(data);
      } else {
        console.error("Unexpected data format:", data);
        throw new Error("Invalid data format received");
      }
    } catch (error) {
      console.error("Error fetching reflections:", error);
      toast({
        title: "Error",
        description: "Failed to load reflections. Please try again.",
        variant: "destructive",
      });
      setReflections([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReflections();
  }, [fetchReflections]);

  // Effect to update graph dimensions when the container is available
  useEffect(() => {
    const updateDimensions = () => {
      if (graphContainerRef.current) {
        setGraphDimensions({
          width: graphContainerRef.current.offsetWidth,
          height: 400,
        });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [loading]); // Rerun when data loads to ensure container is rendered

  // Effect to transform reflection data into graph data
  useEffect(() => {
    if (reflections.length > 0) {
      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];
      const tagMap = new Map<string, GraphNode>();

      reflections.forEach((reflection) => {
        nodes.push({
          id: reflection.id,
          type: "reflection",
          label: formatDate(reflection.date),
          color: "#3182CE", // A consistent blue for reflections
          emotion: getEmojiForEmotion(reflection.emotion),
        });

        reflection.tags?.forEach((tag) => {
          if (!tagMap.has(tag.id)) {
            const tagNode: GraphNode = {
              id: tag.id,
              type: "tag",
              label: tag.name,
              color: tag.color || "#FF4136",
            };
            tagMap.set(tag.id, tagNode);
            nodes.push(tagNode);
          }
          links.push({
            source: reflection.id,
            target: tag.id,
          });
        });
      });

      setGraphData({ nodes, links });
    }
  }, [reflections]);

  const handleCloseExpandedCard = useCallback(() => {
    setExpandedCardId(null);
  }, []);

  // --- NEW GRAPH INTERACTION HANDLERS ---
  const clearHighlight = () => {
    setHighlightedNodes(new Set());
    setHighlightedLinks(new Set());
  };

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      // Clear previous highlights
      clearHighlight();

      if (node.type === "reflection") {
        setExpandedCardId(node.id);
      } else if (node.type === "tag") {
        // Highlight this tag and all connected reflections
        const newHighlightedNodes = new Set([node.id]);
        const newHighlightedLinks = new Set();

        graphData.links.forEach((link) => {
          if (link.target === node.id) {
            newHighlightedNodes.add(link.source as string);
            newHighlightedLinks.add(link);
          }
        });

        setHighlightedNodes(newHighlightedNodes);
        setHighlightedLinks(newHighlightedLinks);
      }
      // Center view on clicked node
      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 1000);
        graphRef.current.zoom(2.5, 1000);
      }
    },
    [graphData.links]
  );

  const handleBackgroundClick = useCallback(() => {
    clearHighlight();
    if (graphRef.current) {
      graphRef.current.zoomToFit(1000, 100);
    }
  }, []);

  // --- CUSTOM NODE RENDERING FUNCTION ---
  const handleNodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.label;
      const isHighlighted =
        highlightedNodes.size === 0 || highlightedNodes.has(node.id);
      const isHovered = hoveredNode?.id === node.id;

      // Dim non-highlighted nodes
      ctx.globalAlpha = isHighlighted ? 1 : 0.2;

      // --- Draw Glow for Hovered/Highlighted Nodes ---
      if (isHovered || (highlightedNodes.has(node.id) && node.type === "tag")) {
        const glowColor = node.type === "tag" ? node.color : "yellow";
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 15;
      }

      // --- Draw Node Shapes ---
      if (node.type === "reflection") {
        const radius = 8;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
        ctx.fill();

        // Draw emotion emoji inside
        const emojiSize = radius * 1.5;
        ctx.font = `${emojiSize}px Sans-Serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.emotion!, node.x!, node.y!);
      } else {
        // 'tag' node
        const rectWidth = ctx.measureText(label).width + 10;
        const rectHeight = 16;
        ctx.fillStyle = node.color;

        // Draw rounded rectangle
        ctx.beginPath();
        ctx.roundRect(
          node.x! - rectWidth / 2,
          node.y! - rectHeight / 2,
          rectWidth,
          rectHeight,
          4
        );
        ctx.fill();

        // Draw tag label inside
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff"; // White text for better contrast
        ctx.font = `8px Sans-Serif`;
        ctx.fillText(label, node.x!, node.y! + 1);
      }

      // Reset shadow and alpha for other elements
      ctx.shadowBlur = 0;
      ctx.globalAlpha = isHighlighted ? 1 : 0.3;

      // --- Draw Label Below Node ---
      const fontSize = 10 / globalScale;
      ctx.font = `${fontSize}px Sans-Serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      if (node.type === "reflection") {
        ctx.fillText(label, node.x!, node.y! + 12);
      }

      ctx.globalAlpha = 1.0; // Reset alpha
    },
    [hoveredNode, highlightedNodes]
  );

  const expandedCard = expandedCardId
    ? reflections.find((r) => r.id === expandedCardId)
    : undefined;

  // Initial loading state skeleton
  if (loading && reflections.length === 0) {
    return (
      <div className="flex flex-col min-h-screen p-4">
        <div className="border-b pb-4 flex justify-between items-center sticky top-0 bg-background z-10 mb-4">
          <h1 className="text-2xl font-semibold">Reflection Journey</h1>
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {expandedCard && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={handleCloseExpandedCard}
            />
            <ExpandedReflectionCard
              reflection={expandedCard}
              onClose={handleCloseExpandedCard}
            />
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-col min-h-screen">
        <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-background z-10">
          <h1 className="text-2xl font-semibold">Reflection Journey</h1>
          <Button
            onClick={() => router.push("/me/reflection/new")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Reflection
          </Button>
        </div>

        <main className="flex-1 overflow-auto p-4">
          {!loading && reflections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center mt-16">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold">No reflections yet</h2>
              <p className="text-muted-foreground mt-2">
                Start your journey by adding your first reflection.
              </p>
              <Button
                onClick={() => router.push("/me/reflection/new")}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" /> Add First Reflection
              </Button>
            </div>
          ) : (
            <>
              {/* --- Live Graph View --- */}
              <div className="mb-8 p-4 border rounded-lg bg-card shadow-md">
                <h2 className="text-lg font-semibold mb-2">
                  Reflection & Tag Connections
                </h2>
                <div
                  ref={graphContainerRef}
                  className="w-full h-[400px] relative rounded-md overflow-hidden bg-gray-900/50"
                >
                  {graphDimensions.width > 0 && graphData.nodes.length > 0 && (
                    <ForceGraph2D
                      ref={graphRef}
                      graphData={graphData}
                      width={graphDimensions.width}
                      height={graphDimensions.height}
                      onNodeClick={handleNodeClick}
                      onBackgroundClick={handleBackgroundClick}
                      onNodeHover={(node) =>
                        setHoveredNode((node as GraphNode) || null)
                      }
                      nodeCanvasObject={handleNodeCanvasObject}
                      nodePointerAreaPaint={(node, color, ctx) => {
                        ctx.fillStyle = color;
                        const r = node.type === "reflection" ? 8 : 10;
                        ctx.fillRect(node.x! - r, node.y! - r, 2 * r, 2 * r);
                      }}
                      linkColor={(link) =>
                        highlightedLinks.size === 0 ||
                        highlightedLinks.has(link)
                          ? "rgba(255,255,255,0.4)"
                          : "rgba(255,255,255,0.1)"
                      }
                      linkWidth={(link) =>
                        highlightedLinks.size === 0 ||
                        highlightedLinks.has(link)
                          ? 1
                          : 0.5
                      }
                      linkDirectionalParticles={(link) =>
                        highlightedLinks.size === 0 ||
                        highlightedLinks.has(link)
                          ? 1
                          : 0
                      }
                      linkDirectionalParticleWidth={2}
                      cooldownTicks={100}
                      onEngineStop={() => graphRef.current?.zoomToFit(400, 100)}
                    />
                  )}
                </div>
              </div>

              {/* --- Card View --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reflections.map((reflection) => (
                  <motion.div
                    key={reflection.id}
                    layoutId={`card-${reflection.id}`}
                    className="cursor-pointer"
                    onClick={() => setExpandedCardId(reflection.id)}
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-300">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base font-medium">
                            {formatDate(reflection.date)}
                          </CardTitle>
                          {reflection.emotion && (
                            <span
                              className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full border-2 text-lg ${getEmotionColor(reflection.emotion)}`}
                              title={reflection.emotion}
                            >
                              {getEmojiForEmotion(reflection.emotion)}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <p className="text-sm text-muted-foreground line-clamp-4 flex-grow">
                          {reflection.contentPreview}
                        </p>
                        {reflection.tags && reflection.tags.length > 0 && (
                          <div className="mt-auto flex flex-wrap gap-1 pt-2">
                            {reflection.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                                style={{
                                  backgroundColor: `${tag.color}1A`,
                                  borderColor: `${tag.color}40`,
                                  color: tag.color,
                                }}
                              >
                                {tag.name}
                              </span>
                            ))}
                            {reflection.tags.length > 3 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                +{reflection.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
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
