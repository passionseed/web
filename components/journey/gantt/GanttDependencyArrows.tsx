"use client";

import { ProjectMilestone } from "@/types/journey";
import { TimelineBounds, calculateGanttBar } from "@/lib/utils/gantt";

interface GanttDependencyArrowsProps {
  milestones: ProjectMilestone[];
  bounds: TimelineBounds;
  containerWidth: number;
  rowHeight: number;
}

export function GanttDependencyArrows({
  milestones,
  bounds,
  containerWidth,
  rowHeight,
}: GanttDependencyArrowsProps) {
  const milestoneMap = new Map(milestones.map((m, i) => [m.id, i]));
  const arrows: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
  }> = [];

  // Build arrows based on dependencies
  milestones.forEach((milestone, index) => {
    if (!milestone.dependencies || milestone.dependencies.length === 0) return;

    milestone.dependencies.forEach((depId) => {
      const depIndex = milestoneMap.get(depId);
      if (depIndex === undefined) return;

      const fromBar = calculateGanttBar(
        milestones[depIndex],
        bounds,
        containerWidth,
        depIndex,
        rowHeight
      );
      const toBar = calculateGanttBar(
        milestone,
        bounds,
        containerWidth,
        index,
        rowHeight
      );

      // Arrow from end of dependency to start of dependent milestone
      arrows.push({
        from: {
          x: fromBar.x + fromBar.width,
          y: depIndex * rowHeight + rowHeight / 2,
        },
        to: {
          x: toBar.x,
          y: index * rowHeight + rowHeight / 2,
        },
      });
    });
  });

  if (arrows.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-5"
      style={{ width: containerWidth, height: milestones.length * rowHeight }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          fill="#64748b"
        >
          <polygon points="0 0, 10 3, 0 6" />
        </marker>
      </defs>

      {arrows.map((arrow, index) => {
        const { from, to } = arrow;

        // Create a simple path with a right-angle turn
        const midX = from.x + (to.x - from.x) / 2;
        const path = `
          M ${from.x} ${from.y}
          L ${midX} ${from.y}
          L ${midX} ${to.y}
          L ${to.x} ${to.y}
        `;

        return (
          <path
            key={index}
            d={path}
            stroke="#64748b"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrowhead)"
            opacity="0.5"
          />
        );
      })}
    </svg>
  );
}
