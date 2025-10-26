/**
 * NorthStarFloatingLink - Floating dotted line connecting short-term projects to North Star
 * Subtle animation with star-themed styling and dynamic connection points
 */

import React, { useCallback } from "react";
import { EdgeProps, getBezierPath, useStore } from "@xyflow/react";
import { getEdgeParams } from "../utils/edgeUtils";

export function NorthStarFloatingLink({
  id,
  source,
  target,
  markerEnd,
  style = {},
}: EdgeProps) {
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

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  return (
    <>
      {/* Background glow */}
      <path
        id={`${id}-glow`}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={6}
        stroke="url(#northStarGradient)"
        fill="none"
        opacity={0.3}
        style={{
          filter: "blur(3px)",
        }}
      />

      {/* Main dotted path */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2.5,
          stroke: "url(#northStarGradient)",
          strokeLinecap: "round",
          strokeDasharray: "8,6",
          animation: "northStarPulse 4s ease-in-out infinite",
        }}
      />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="northStarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.8} />
          <stop offset="50%" stopColor="#f59e0b" stopOpacity={1} />
          <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
        </linearGradient>

        {/* Star marker at the end */}
        <marker
          id="northStarMarker"
          viewBox="0 0 20 20"
          refX="10"
          refY="10"
          markerWidth="12"
          markerHeight="12"
          orient="auto"
        >
          <path
            d="M10 2l2.4 4.9 5.4.8-3.9 3.8.9 5.5-4.8-2.5-4.8 2.5.9-5.5-3.9-3.8 5.4-.8z"
            fill="#fbbf24"
            stroke="#f59e0b"
            strokeWidth="0.5"
          >
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              from="0 10 10"
              to="360 10 10"
              dur="6s"
              repeatCount="indefinite"
            />
          </path>
        </marker>
      </defs>

      <style>
        {`
          @keyframes northStarPulse {
            0%, 100% {
              opacity: 0.6;
              stroke-width: 2.5;
            }
            50% {
              opacity: 1;
              stroke-width: 3;
            }
          }
        `}
      </style>
    </>
  );
}
