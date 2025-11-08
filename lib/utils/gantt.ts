import {
  addDays,
  addMonths,
  differenceInDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  min,
  max,
} from "date-fns";
import { ProjectMilestone } from "@/types/journey";

export type ZoomLevel = "day" | "week" | "month" | "quarter";

/**
 * Extract date fields from milestone, checking both direct properties and metadata
 * Dates are stored in the metadata JSONB column in the database
 */
function getMilestoneDates(milestone: ProjectMilestone): {
  start_date: string | null;
  due_date: string | null;
} {
  return {
    start_date: milestone.start_date || milestone.metadata?.start_date || null,
    due_date: milestone.due_date || milestone.metadata?.due_date || null,
  };
}

export interface TimelineBounds {
  start: Date;
  end: Date;
  totalDays: number;
}

export interface GanttBar {
  milestone: ProjectMilestone;
  startDate: Date;
  endDate: Date;
  x: number;
  width: number;
  y: number;
}

/**
 * Calculate the timeline bounds from an array of milestones
 * Adds padding of 30 days before the earliest date and 30 days after the latest date
 */
export function calculateTimelineBounds(
  milestones: ProjectMilestone[]
): TimelineBounds {
  const dates: Date[] = [];

  milestones.forEach((milestone) => {
    const { start_date, due_date } = getMilestoneDates(milestone);

    if (start_date) {
      dates.push(new Date(start_date));
    }
    if (due_date) {
      dates.push(new Date(due_date));
    }
    // Fallback to created_at if no dates are set
    if (!start_date && !due_date) {
      dates.push(new Date(milestone.created_at));
    }
  });

  if (dates.length === 0) {
    // Default to 3 months from today if no dates
    const today = new Date();
    return {
      start: startOfMonth(today),
      end: endOfMonth(addMonths(today, 3)),
      totalDays: 90,
    };
  }

  const minDate = min(dates);
  const maxDate = max(dates);

  // Add generous padding - 30 days (1 month) on each side for better UX
  const start = addDays(startOfDay(minDate), -30);
  const end = addDays(endOfDay(maxDate), 30);

  return {
    start,
    end,
    totalDays: differenceInDays(end, start),
  };
}

/**
 * Convert a date to a pixel position within the timeline
 */
export function dateToPosition(
  date: Date,
  bounds: TimelineBounds,
  containerWidth: number
): number {
  const daysSinceStart = differenceInDays(date, bounds.start);
  const pixelsPerDay = containerWidth / bounds.totalDays;
  return daysSinceStart * pixelsPerDay;
}

/**
 * Convert a pixel position to a date within the timeline
 */
export function positionToDate(
  x: number,
  bounds: TimelineBounds,
  containerWidth: number
): Date {
  const pixelsPerDay = containerWidth / bounds.totalDays;
  const days = Math.floor(x / pixelsPerDay);
  return addDays(bounds.start, days);
}

/**
 * Calculate the duration between two dates in days
 */
export function calculateDuration(start: Date, end: Date): number {
  return differenceInDays(end, start);
}

/**
 * Snap a date to the nearest day boundary
 * Always snaps to day for better UX - even in week/month view,
 * users should be able to set dates with day precision
 */
export function snapToGrid(date: Date, zoomLevel: ZoomLevel): Date {
  // Always snap to start of day for precise date control
  return startOfDay(date);
}

/**
 * Get the scale factor (pixels per day) for a given zoom level
 * This determines how much horizontal space each day takes up
 */
export function getZoomScaleFactor(zoomLevel: ZoomLevel): number {
  switch (zoomLevel) {
    case "day":
      return 40; // 40 pixels per day
    case "week":
      return 20; // 20 pixels per day
    case "month":
      return 8; // 8 pixels per day
    case "quarter":
      return 3; // 3 pixels per day
    default:
      return 20;
  }
}

/**
 * Get timeline intervals for rendering the timeline header
 */
export function getTimelineIntervals(
  bounds: TimelineBounds,
  zoomLevel: ZoomLevel
) {
  const interval = { start: bounds.start, end: bounds.end };

  switch (zoomLevel) {
    case "day":
      return eachDayOfInterval(interval).map((date) => ({
        date,
        label: format(date, "d"),
        sublabel: format(date, "EEE"),
      }));
    case "week":
      return eachWeekOfInterval(interval, { weekStartsOn: 1 }).map((date) => ({
        date,
        label: format(date, "MMM d"),
        sublabel: `Week ${format(date, "w")}`,
      }));
    case "month":
      return eachMonthOfInterval(interval).map((date) => ({
        date,
        label: format(date, "MMM yyyy"),
        sublabel: "",
      }));
    case "quarter":
      return eachMonthOfInterval(interval)
        .filter((date) => date.getMonth() % 3 === 0)
        .map((date) => ({
          date,
          label: format(date, "QQQ yyyy"),
          sublabel: "",
        }));
    default:
      return [];
  }
}

/**
 * Calculate the total container width based on timeline bounds and zoom level
 */
export function calculateContainerWidth(
  bounds: TimelineBounds,
  zoomLevel: ZoomLevel
): number {
  const pixelsPerDay = getZoomScaleFactor(zoomLevel);
  return bounds.totalDays * pixelsPerDay;
}

/**
 * Get the default dates for a milestone if they're not set
 * Uses created_at as start, and adds 7 days for due date
 */
export function getDefaultMilestoneDates(
  milestone: ProjectMilestone
): { startDate: Date; endDate: Date } {
  const { start_date, due_date } = getMilestoneDates(milestone);

  const startDate = start_date
    ? new Date(start_date)
    : new Date(milestone.created_at);

  const endDate = due_date ? new Date(due_date) : addDays(startDate, 7);

  return { startDate, endDate };
}

/**
 * Calculate the position and width for a Gantt bar
 */
export function calculateGanttBar(
  milestone: ProjectMilestone,
  bounds: TimelineBounds,
  containerWidth: number,
  rowIndex: number,
  rowHeight: number = 60
): GanttBar {
  const { startDate, endDate } = getDefaultMilestoneDates(milestone);

  const x = dateToPosition(startDate, bounds, containerWidth);
  const endX = dateToPosition(endDate, bounds, containerWidth);
  const width = Math.max(endX - x, 20); // Minimum width of 20px

  return {
    milestone,
    startDate,
    endDate,
    x,
    width,
    y: rowIndex * rowHeight,
  };
}

/**
 * Get status color for milestone
 */
export function getMilestoneStatusColor(
  status: string
): {
  bg: string;
  border: string;
  text: string;
} {
  switch (status) {
    case "not_started":
      return {
        bg: "bg-slate-500/20",
        border: "border-slate-500",
        text: "text-slate-300",
      };
    case "in_progress":
      return {
        bg: "bg-blue-500/20",
        border: "border-blue-500",
        text: "text-blue-300",
      };
    case "blocked":
      return {
        bg: "bg-red-500/20",
        border: "border-red-500",
        text: "text-red-300",
      };
    case "completed":
      return {
        bg: "bg-green-500/20",
        border: "border-green-500",
        text: "text-green-300",
      };
    case "skipped":
      return {
        bg: "bg-yellow-500/20",
        border: "border-yellow-500",
        text: "text-yellow-300",
      };
    default:
      return {
        bg: "bg-slate-500/20",
        border: "border-slate-500",
        text: "text-slate-300",
      };
  }
}

/**
 * Format duration for display
 */
export function formatDuration(days: number): string {
  if (days === 0) return "< 1 day";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    if (remainingDays === 0) {
      return weeks === 1 ? "1 week" : `${weeks} weeks`;
    }
    return `${weeks}w ${remainingDays}d`;
  }
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  if (remainingDays === 0) {
    return months === 1 ? "1 month" : `${months} months`;
  }
  return `${months}mo ${Math.floor(remainingDays / 7)}w`;
}

/**
 * Check if a milestone's date range overlaps with today
 * Used to highlight active milestones in the Gantt chart
 */
export function isMilestoneActive(milestone: ProjectMilestone): boolean {
  const { startDate, endDate } = getDefaultMilestoneDates(milestone);
  const today = startOfDay(new Date());

  // Check if today falls within the milestone's date range
  return today >= startOfDay(startDate) && today <= endOfDay(endDate);
}
