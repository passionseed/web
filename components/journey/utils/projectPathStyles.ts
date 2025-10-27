/**
 * Project Path Styling Configuration
 * Defines visual styles for different types of project relationships
 */

import { MarkerType } from "@xyflow/react";

export type ProjectPathType = "dependency" | "relates_to" | "leads_to";

export interface PathStyleConfig {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  animated: boolean;
  markerEnd: {
    type: MarkerType;
    color: string;
    width?: number;
    height?: number;
  };
  label: string;
  description: string;
}

export const PROJECT_PATH_STYLES: Record<ProjectPathType, PathStyleConfig> = {
  dependency: {
    stroke: "#3b82f6", // Blue - solid, directional
    strokeWidth: 2.5,
    strokeDasharray: undefined,
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#3b82f6",
      width: 20,
      height: 20,
    },
    label: "Dependency",
    description: "This project depends on completing the other first",
  },
  relates_to: {
    stroke: "#a855f7", // Purple - dashed, bidirectional feel
    strokeWidth: 2,
    strokeDasharray: "8,4",
    animated: false,
    markerEnd: {
      type: MarkerType.Arrow,
      color: "#a855f7",
      width: 16,
      height: 16,
    },
    label: "Related",
    description: "These projects share common themes or goals",
  },
  leads_to: {
    stroke: "#10b981", // Green - animated, progression
    strokeWidth: 2.5,
    strokeDasharray: undefined,
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#10b981",
      width: 20,
      height: 20,
    },
    label: "Leads To",
    description: "This project naturally progresses to the next one",
  },
};

/**
 * Get style configuration for a path type
 */
export function getProjectPathStyle(pathType: ProjectPathType): PathStyleConfig {
  return PROJECT_PATH_STYLES[pathType];
}

/**
 * Get hover style for a path
 */
export function getHoverStyle(baseColor: string) {
  return {
    strokeWidth: 3.5,
    filter: `drop-shadow(0 0 6px ${baseColor}80)`,
  };
}

/**
 * Get selected style for a path
 */
export function getSelectedStyle(baseColor: string) {
  return {
    strokeWidth: 4,
    filter: `drop-shadow(0 0 8px ${baseColor})`,
  };
}
