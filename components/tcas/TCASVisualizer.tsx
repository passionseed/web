"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Dynamic import to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

type Node = {
  id: string;
  name: string;
  faculty: string;
  university: string;
  x: number;
  y: number;
  color?: string;
};

const FACULTY_COLORS: Record<string, string> = {
  "คณะวิศวกรรมศาสตร์": "#3b82f6", // blue
  "คณะแพทยศาสตร์": "#ef4444", // red
  "คณะวิทยาศาสตร์": "#10b981", // green
  "คณะอักษรศาสตร์": "#f59e0b", // amber
  "คณะนิติศาสตร์": "#6366f1", // indigo
  "คณะรัฐศาสตร์": "#ec4899", // pink
  "คณะพาณิชยศาสตร์และการบัญชี": "#8b5cf6", // violet
  "คณะสถาปัตยกรรมศาสตร์": "#14b8a6", // teal
};

const DEFAULT_COLOR = "#94a3b8"; // slate

export function TCASVisualizer() {
  const [data, setData] = useState<{ nodes: Node[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverNode, setHoverNode] = useState<Node | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/tcas/projection")
      .then((res) => res.json())
      .then((d) => {
        const nodesWithColors = d.nodes.map((n: Node) => ({
          ...n,
          color: FACULTY_COLORS[n.faculty] || DEFAULT_COLOR,
        }));
        setData({ nodes: nodesWithColors });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch projection:", err);
        setLoading(false);
      });
  }, []);

  const filteredNodes = useMemo(() => {
    if (!data) return [];
    if (!searchQuery) return data.nodes;
    const lowerQuery = searchQuery.toLowerCase();
    return data.nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(lowerQuery) ||
        n.university.toLowerCase().includes(lowerQuery) ||
        n.faculty.toLowerCase().includes(lowerQuery)
    );
  }, [data, searchQuery]);

  const graphData = useMemo(() => {
    return {
      nodes: filteredNodes,
      links: [],
    };
  }, [filteredNodes]);

  if (loading) {
    return (
      <Card className="w-full h-[600px]">
        <CardHeader>
          <CardTitle>TCAS Program Semantic Map</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full">
          <Skeleton className="w-full h-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-[700px] relative overflow-hidden">
      <CardHeader className="absolute top-0 left-0 z-10 bg-background/80 backdrop-blur-sm w-full border-b">
        <CardTitle className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col">
            <span>TCAS Program Semantic Map</span>
            <span className="text-sm font-normal text-muted-foreground">
              {filteredNodes.length} programs shown
            </span>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-full">
        <ForceGraph2D
          graphData={graphData}
          nodeLabel={(node: any) => `
            <div class="p-2 bg-popover text-popover-foreground rounded border shadow-sm">
              <strong>${node.name}</strong><br/>
              <span class="text-xs">${node.faculty}</span><br/>
              <span class="text-xs text-muted-foreground">${node.university}</span>
            </div>
          `}
          nodeColor={(node: any) => node.color}
          nodeRelSize={6}
          enableNodeDrag={false}
          enablePanInteraction={true}
          enableZoomInteraction={true}
          onNodeHover={(node: any) => setHoverNode(node)}
          cooldownTicks={0}
        />
        
        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-10 bg-background/90 p-3 rounded-lg border shadow-lg text-xs space-y-1">
          <div className="font-bold mb-2">Faculties</div>
          {Object.entries(FACULTY_COLORS).map(([name, color]) => (
            <div key={name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span>{name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEFAULT_COLOR }} />
            <span>Others</span>
          </div>
        </div>

        {/* Hover Detail */}
        {hoverNode && (
          <div className="absolute bottom-4 left-4 z-10 bg-background/90 p-4 rounded-lg border shadow-lg max-w-xs">
            <div className="font-bold text-sm">{hoverNode.name}</div>
            <div className="text-xs text-primary">{hoverNode.faculty}</div>
            <div className="text-xs text-muted-foreground">{hoverNode.university}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
