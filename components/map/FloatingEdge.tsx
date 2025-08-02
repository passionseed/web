import { useCallback } from "react";
import { useStore, getBezierPath, EdgeProps, Node } from "@xyflow/react";

import { getEdgeParams } from "./utils";

function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  edit,
}: EdgeProps & { edit?: boolean }) {
  const sourceNode = useStore(
    useCallback((store) => store.nodeLookup.get(source), [source])
  );
  const targetNode = useStore(
    useCallback((store) => store.nodeLookup.get(target), [target])
  );

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  // Calculate path length for rope spacing
  const distance = Math.sqrt(Math.pow(tx - sx, 2) + Math.pow(ty - sy, 2));
  const ropeCount = Math.max(3, Math.floor(distance / 60));

  // Generate rope support positions along the path
  const ropePositions = Array.from({ length: ropeCount }, (_, i) => {
    const t = (i + 1) / (ropeCount + 1);
    // Bezier curve calculation for rope positions
    const x = sx + t * (tx - sx);
    const y = sy + t * (ty - sy) + Math.sin(t * Math.PI) * 15; // Slight sag
    return { x, y, t };
  });

  if (edit) {
    // Simple path for edit mode
    return (
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: "#8B4513",
          strokeWidth: 2,
          strokeDasharray: "5,5",
        }}
      />
    );
  }

  return (
    <g className="sky-bridge-group">
      {/* Bridge Shadow */}
      <path
        d={edgePath}
        className="bridge-shadow"
        style={{
          stroke: "rgba(0,0,0,0.2)",
          strokeWidth: 12,
          fill: "none",
          transform: "translate(2px, 4px)",
          filter: "blur(3px)",
        }}
      />

      {/* Main wooden bridge path */}
      <path
        id={id}
        className="sky-bridge-main animate-float-bridge"
        d={edgePath}
        style={{
          ...style,
          stroke: "#D2691E", // Sandy brown wood color
          strokeWidth: 8,
          fill: "none",
          strokeLinecap: "round",
          transition: "all 300ms ease-in-out",
        }}
      />

      {/* Wooden planks pattern */}
      <path
        className="sky-bridge-planks animate-float-bridge"
        d={edgePath}
        style={{
          stroke: "#8B4513", // Saddle brown
          strokeWidth: 6,
          fill: "none",
          strokeDasharray: "12,3",
          strokeLinecap: "round",
          opacity: 0.8,
          transition: "all 300ms ease-in-out",
        }}
      />

      {/* Side rails */}
      <path
        className="sky-bridge-rail-top animate-float-bridge"
        d={edgePath}
        style={{
          stroke: "#654321", // Dark brown
          strokeWidth: 2,
          fill: "none",
          transform: "translateY(-4px)",
          opacity: 0.7,
          transition: "all 300ms ease-in-out",
        }}
      />
      <path
        className="sky-bridge-rail-bottom animate-float-bridge"
        d={edgePath}
        style={{
          stroke: "#654321",
          strokeWidth: 2,
          fill: "none",
          transform: "translateY(4px)",
          opacity: 0.7,
          transition: "all 300ms ease-in-out",
        }}
      />

      {/* Rope supports */}
      {ropePositions.map((pos, index) => (
        <g key={`rope-${index}`} className="rope-support animate-float-rope">
          {/* Rope line extending upward */}
          <line
            x1={pos.x}
            y1={pos.y}
            x2={pos.x}
            y2={pos.y - 25}
            stroke="#8B4513"
            strokeWidth="1.5"
            opacity="0.6"
            strokeDasharray="2,1"
            className="rope-line"
            style={{
              transformOrigin: `${pos.x}px ${pos.y}px`,
              animation: `rope-sway ${3 + index * 0.5}s ease-in-out infinite`,
              animationDelay: `${index * 0.2}s`,
            }}
          />
          {/* Support knot */}
          <circle
            cx={pos.x}
            cy={pos.y}
            r="2"
            fill="#654321"
            opacity="0.8"
            className="rope-knot"
            style={{
              animation: `float-knot ${4 + index * 0.3}s ease-in-out infinite`,
              animationDelay: `${index * 0.15}s`,
            }}
          />
        </g>
      ))}

      {/* Magical floating particles along the bridge */}
      <g className="bridge-particles">
        {Array.from({ length: 3 }, (_, i) => {
          const t = (i + 1) / 4;
          const x = sx + t * (tx - sx);
          const y = sy + t * (ty - sy);
          return (
            <circle
              key={`particle-${i}`}
              cx={x}
              cy={y}
              r="1.5"
              fill="#FFD700"
              opacity="0.6"
              className="bridge-particle"
              style={{
                animation: `bridge-sparkle ${2 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.7}s`,
              }}
            />
          );
        })}
      </g>
    </g>
  );
}

export default FloatingEdge;

export const FloatingEdgeEdit = (props: EdgeProps) => (
  <FloatingEdge {...props} edit={true} />
);
