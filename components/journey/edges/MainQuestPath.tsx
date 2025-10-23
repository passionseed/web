/**
 * MainQuestPath - Animated edge for main quest connections
 * Features gradient styling and pulse animation
 */

import React from "react";
import { BaseEdge, EdgeProps, getStraightPath, getBezierPath } from "@xyflow/react";

export function MainQuestPath({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  // Use bezier path for smoother curves
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Background glow */}
      <path
        id={`${id}-glow`}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={8}
        stroke="url(#mainQuestGradient)"
        fill="none"
        opacity={0.4}
        style={{
          filter: "blur(4px)",
        }}
      />

      {/* Main path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 4,
          stroke: "url(#mainQuestGradient)",
          strokeLinecap: "round",
          animation: "dash 20s linear infinite",
          strokeDasharray: "10,5",
        }}
      />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="mainQuestGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity={1}>
            <animate
              attributeName="stop-color"
              values="#06b6d4;#3b82f6;#06b6d4"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%" stopColor="#3b82f6" stopOpacity={1}>
            <animate
              attributeName="stop-color"
              values="#3b82f6;#8b5cf6;#3b82f6"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1}>
            <animate
              attributeName="stop-color"
              values="#8b5cf6;#06b6d4;#8b5cf6"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>

        {/* Arrow marker */}
        <marker
          id="mainQuestArrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
        </marker>
      </defs>

      <style>
        {`
          @keyframes dash {
            to {
              stroke-dashoffset: -1000;
            }
          }
        `}
      </style>
    </>
  );
}
