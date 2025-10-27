/**
 * Milestone Status Configuration
 *
 * Centralized configuration for milestone status styling and display.
 * Provides consistent icons, colors, and labels across the application.
 */

import {
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { MilestoneStatus } from "@/types/journey";

export interface MilestoneStatusConfig {
  style: string;
  icon: LucideIcon;
  label: string;
  iconClassName?: string;
}

/**
 * Get display configuration for a milestone status
 */
export function getMilestoneStatusConfig(
  status: MilestoneStatus
): MilestoneStatusConfig {
  const configs: Record<MilestoneStatus, MilestoneStatusConfig> = {
    not_started: {
      style: "bg-slate-700 text-slate-200",
      icon: Circle,
      label: "Not Started",
      iconClassName: "text-slate-400",
    },
    in_progress: {
      style: "bg-blue-700 text-blue-200",
      icon: Clock,
      label: "In Progress",
      iconClassName: "text-blue-400",
    },
    completed: {
      style: "bg-green-700 text-green-200",
      icon: CheckCircle2,
      label: "Completed",
      iconClassName: "text-green-400",
    },
    blocked: {
      style: "bg-red-700 text-red-200",
      icon: AlertCircle,
      label: "Blocked",
      iconClassName: "text-red-400",
    },
    skipped: {
      style: "bg-yellow-700 text-yellow-200",
      icon: XCircle,
      label: "Skipped",
      iconClassName: "text-yellow-400",
    },
  };

  return configs[status] || configs.not_started;
}

/**
 * Get all available milestone statuses with their configurations
 */
export function getAllMilestoneStatuses(): Array<{
  value: MilestoneStatus;
  config: MilestoneStatusConfig;
}> {
  const statuses: MilestoneStatus[] = [
    "not_started",
    "in_progress",
    "blocked",
    "completed",
    "skipped",
  ];

  return statuses.map((status) => ({
    value: status,
    config: getMilestoneStatusConfig(status),
  }));
}
