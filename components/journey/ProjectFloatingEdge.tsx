/**
 * ProjectFloatingEdge - Custom edge for project-to-project connections
 * Displays relationship between projects with appropriate styling
 */

"use client";

import { useCallback } from "react";
import { useStore, getBezierPath, EdgeProps } from "@xyflow/react";
import { getEdgeParams } from "../map/utils";
import { getProjectPathStyle, getHoverStyle, getSelectedStyle } from "./utils/projectPathStyles";
import { ProjectPath } from "@/types/journey";

interface ProjectFloatingEdgeProps extends EdgeProps {
  data?: {
    pathType: ProjectPath["path_type"];
    pathId: string;
    onDelete?: (pathId: string) => void;
  };
}

export function ProjectFloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  selected,
  data,
}: ProjectFloatingEdgeProps) {
  const sourceNode = useStore(
    useCallback((store) => store.nodeLookup.get(source), [source])
  );
  const targetNode = useStore(
    useCallback((store) => store.nodeLookup.get(target), [target])
  );

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode
  );

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  // Get style configuration for this path type
  const pathType = data?.pathType || "relates_to";
  const pathStyle = getProjectPathStyle(pathType);

  // Apply hover and selected styles
  const baseColor = pathStyle.stroke;
  const edgeStyle = {
    ...style,
    stroke: pathStyle.stroke,
    strokeWidth: selected ? 4 : pathStyle.strokeWidth,
    strokeDasharray: pathStyle.strokeDasharray,
    filter: selected
      ? `drop-shadow(0 0 8px ${baseColor})`
      : undefined,
  };

  return (
    <g className="react-flow__edge">
      {/* Invisible thick path for easier selection */}
      <path
        className="react-flow__edge-interaction"
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: "pointer" }}
      />

      {/* Main visible path */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        style={edgeStyle}
        markerEnd={markerEnd}
      />

      {/* Animated dash for leads_to type */}
      {pathStyle.animated && (
        <path
          d={edgePath}
          fill="none"
          stroke={baseColor}
          strokeWidth={pathStyle.strokeWidth}
          strokeDasharray="8,8"
          style={{
            animation: "dashdraw 0.8s linear infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Label badge on hover */}
      {selected && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-30}
            y={-12}
            width={60}
            height={24}
            rx={12}
            fill={baseColor}
            opacity={0.9}
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fill="white"
            fontSize={11}
            fontWeight="600"
          >
            {pathStyle.label}
          </text>
        </g>
      )}

      <style jsx global>{`
        @keyframes dashdraw {
          to {
            stroke-dashoffset: -16;
          }
        }
      `}</style>
    </g>
  );
}
