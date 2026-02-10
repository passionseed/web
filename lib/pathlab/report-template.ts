import type {
  PathEnrollmentStatus,
  PathExitInterestChange,
  PathExitReasonCategory,
  PathReportData,
  PathTrendPoint,
  PathWouldExploreDeeper,
} from "@/types/pathlab";

type TrendMetric = "energy_level" | "confusion_level" | "interest_level";

function formatStatus(status: PathEnrollmentStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "quit":
      return "Quit";
    case "explored":
      return "Explored";
    default:
      return status;
  }
}

function findMetricExtreme(
  trend: PathTrendPoint[],
  metric: TrendMetric,
  mode: "max" | "min",
): PathTrendPoint | null {
  if (trend.length === 0) {
    return null;
  }

  return trend.reduce((best, point) => {
    if (mode === "max") {
      return point[metric] > best[metric] ? point : best;
    }
    return point[metric] < best[metric] ? point : best;
  }, trend[0]);
}

function describeInterestDirection(trend: PathTrendPoint[]): string {
  if (trend.length < 2) {
    return "Not enough data to determine a direction yet.";
  }

  const first = trend[0].interest_level;
  const last = trend[trend.length - 1].interest_level;
  const delta = last - first;

  if (delta >= 2) {
    return `Interest increased strongly (${first}/5 to ${last}/5).`;
  }
  if (delta === 1) {
    return `Interest increased (${first}/5 to ${last}/5).`;
  }
  if (delta === 0) {
    return `Interest remained steady (${last}/5).`;
  }
  if (delta === -1) {
    return `Interest decreased slightly (${first}/5 to ${last}/5).`;
  }
  return `Interest decreased (${first}/5 to ${last}/5).`;
}

function describeExitReason(reason: PathExitReasonCategory): string {
  switch (reason) {
    case "boring":
      return "The work felt boring.";
    case "confusing":
      return "The work felt confusing.";
    case "stressful":
      return "The work felt stressful.";
    case "not_me":
      return "The work felt like a mismatch for them.";
    default:
      return reason;
  }
}

function describeInterestChange(change: PathExitInterestChange): string {
  switch (change) {
    case "more":
      return "interest increased";
    case "less":
      return "interest decreased";
    case "same":
      return "interest stayed the same";
    default:
      return change;
  }
}

function describeWouldExploreDeeper(value: PathWouldExploreDeeper): string {
  switch (value) {
    case "yes":
      return "Yes";
    case "maybe":
      return "Maybe";
    case "no":
      return "No";
    default:
      return value;
  }
}

export function buildPathReportTemplate(reportData: PathReportData): string {
  const studentLabel = reportData.student_name || "The student";
  const energyHigh = findMetricExtreme(reportData.trend, "energy_level", "max");
  const energyLow = findMetricExtreme(reportData.trend, "energy_level", "min");
  const confusionHigh = findMetricExtreme(reportData.trend, "confusion_level", "max");
  const interestDirection = describeInterestDirection(reportData.trend);

  const lines: string[] = [
    `Student: ${studentLabel}`,
    `Path: ${reportData.seed_title}`,
    "",
    "Participation Snapshot",
    `${studentLabel} completed ${reportData.days_completed} of ${reportData.total_days} day(s) and spent ${reportData.total_time_minutes} minute(s) in total.`,
    `Current status: ${formatStatus(reportData.status)}.`,
  ];

  if (reportData.trend.length > 0) {
    lines.push("");
    lines.push("Signal Highlights");
    if (energyHigh && energyLow) {
      lines.push(
        `Energy peaked on Day ${energyHigh.day_number} (${energyHigh.energy_level}/5) and dipped on Day ${energyLow.day_number} (${energyLow.energy_level}/5).`,
      );
    }
    if (confusionHigh) {
      lines.push(
        `Highest confusion was Day ${confusionHigh.day_number} (${confusionHigh.confusion_level}/5).`,
      );
    }
    lines.push(interestDirection);
  }

  if (reportData.exit_reflection) {
    lines.push("");
    lines.push("Exit Reflection");
    lines.push(describeExitReason(reportData.exit_reflection.reason_category));
    lines.push(
      `At exit, the student reported that ${describeInterestChange(reportData.exit_reflection.interest_change)}.`,
    );
    if (reportData.exit_reflection.open_response) {
      lines.push(`Student note: ${reportData.exit_reflection.open_response}`);
    }
  }

  if (reportData.end_reflection) {
    lines.push("");
    lines.push("End Reflection");
    lines.push(
      `Overall interest: ${reportData.end_reflection.overall_interest}/5. Fit: ${reportData.end_reflection.fit_level}/5.`,
    );
    lines.push(
      `Would explore deeper: ${describeWouldExploreDeeper(reportData.end_reflection.would_explore_deeper)}.`,
    );
    if (reportData.end_reflection.surprise_response) {
      lines.push(`Student surprise: ${reportData.end_reflection.surprise_response}`);
    }
  }

  lines.push("");
  lines.push("Parent Conversation Prompts");
  lines.push("- Which day felt most energizing, and why?");
  lines.push("- What made the harder moments difficult?");
  lines.push("- What would they want to try next in this area?");

  return lines.join("\n");
}
