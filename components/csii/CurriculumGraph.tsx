"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CurriculumGraphData, CurriculumNode } from "@/types/csii";
import { CSIICourse } from "@/types/csii";

// Dynamic import to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});

interface CurriculumGraphProps {
  data: CurriculumGraphData;
  onNodeClick: (course: CSIICourse) => void;
  selectedCourseId?: string;
  chargeStrength?: number;
  linkDistance?: number;
}

export function CurriculumGraph({
  data,
  onNodeClick,
  selectedCourseId,
  chargeStrength = -100,
  linkDistance = 50,
}: CurriculumGraphProps) {
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Center graph on load
  useEffect(() => {
    if (fgRef.current && data.nodes.length > 0) {
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 50);
      }, 500);
    }
  }, [data.nodes.length]);

  // Update force parameters
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force("charge")?.strength(chargeStrength);
      fgRef.current.d3Force("link")?.distance(linkDistance);
      fgRef.current.d3ReheatSimulation();
    }
  }, [chargeStrength, linkDistance]);

  const handleNodeClick = useCallback(
    (node: any) => {
      const curriculumNode = node as CurriculumNode;
      onNodeClick(curriculumNode.course);

      // Zoom to node
      if (fgRef.current) {
        fgRef.current.centerAt(node.x, node.y, 300);
        fgRef.current.zoom(2, 300);
      }
    },
    [onNodeClick]
  );

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const currNode = node as CurriculumNode;
      const label = currNode.course.courseTitle || currNode.name;
      const fontSize = Math.max(12 / globalScale, 4);
      const nodeSize = currNode.val || 6;
      const isSelected = currNode.id === selectedCourseId;

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
      ctx.fillStyle = currNode.color || "#6b7280";
      ctx.fill();

      // Draw selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeSize + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeSize + 5, 0, 2 * Math.PI);
        ctx.strokeStyle = currNode.color || "#6b7280";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw label (only at sufficient zoom)
      if (globalScale > 0.8 || isSelected) {
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Background for text
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(
          node.x - textWidth / 2 - 2,
          node.y + nodeSize + 4,
          textWidth + 4,
          fontSize + 4
        );

        // Text
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, node.x, node.y + nodeSize + fontSize / 2 + 6);
      }
    },
    [selectedCourseId]
  );

  const paintLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D) => {
      const start = link.source;
      const end = link.target;

      if (!start || !end || typeof start === "string" || typeof end === "string") {
        return;
      }

      // Draw link
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);

      // Link opacity based on strength
      const opacity = Math.min(0.3 + (link.value || 1) * 0.1, 0.8);
      ctx.strokeStyle = `rgba(156, 163, 175, ${opacity})`;
      ctx.lineWidth = Math.max(0.5, (link.value || 1) * 0.3);
      ctx.stroke();
    },
    []
  );

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-950">
      {data.nodes.length > 0 ? (
        <ForceGraph2D
          ref={fgRef}
          graphData={data}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node, color, ctx) => {
            const currNode = node as CurriculumNode;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, currNode.val || 6, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkCanvasObject={paintLink}
          onNodeClick={handleNodeClick}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          nodeRelSize={6}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          minZoom={0.3}
          maxZoom={5}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No courses match your filters
        </div>
      )}
    </div>
  );
}
