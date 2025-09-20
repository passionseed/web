"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Submission {
  id: string;
  grade: "pass" | "fail" | null;
  points_awarded: number | null;
  status: "ungraded" | "graded";
  is_grading_enabled: boolean;
  student_name: string;
  node_title: string;
  submitted_at: string;
}

interface GradeCellProps {
  submission?: Submission;
  onClick?: () => void;
  className?: string;
}

export function GradeCell({ submission, onClick, className }: GradeCellProps) {
  if (!submission) {
    // No submission
    return (
      <div 
        className={cn(
          "h-12 border border-gray-700 bg-gray-800 flex items-center justify-center text-xs text-gray-400",
          className
        )}
      >
        -
      </div>
    );
  }

  const getCellContent = () => {
    if (submission.status === "ungraded") {
      return (
        <button
          onClick={onClick}
          className="w-full h-full flex items-center justify-center bg-orange-900 hover:bg-orange-800 border-orange-700 text-orange-200 font-medium text-xs transition-colors"
        >
          Need Grading
        </button>
      );
    }

    // Graded submission
    if (submission.is_grading_enabled && submission.points_awarded !== null) {
      // Show score
      const bgColor = submission.grade === "pass" ? "bg-green-900" : "bg-red-900";
      const textColor = submission.grade === "pass" ? "text-green-200" : "text-red-200";
      const borderColor = submission.grade === "pass" ? "border-green-700" : "border-red-700";
      
      return (
        <button
          onClick={onClick}
          className={cn(
            "w-full h-full flex items-center justify-center font-bold text-sm transition-colors",
            bgColor,
            textColor,
            borderColor,
            "hover:opacity-80"
          )}
        >
          {submission.points_awarded}
        </button>
      );
    } else {
      // Show pass/fail with full cell background
      const bgColor = submission.grade === "pass" ? "bg-green-900" : "bg-red-900";
      const hoverColor = submission.grade === "pass" ? "hover:bg-green-800" : "hover:bg-red-800";
      const textColor = submission.grade === "pass" ? "text-green-200" : "text-red-200";
      const borderColor = submission.grade === "pass" ? "border-green-700" : "border-red-700";
      
      return (
        <button
          onClick={onClick}
          className={cn(
            "w-full h-full flex items-center justify-center font-medium text-xs transition-colors",
            bgColor,
            hoverColor,
            textColor,
            borderColor
          )}
        >
          {submission.grade === "pass" ? "Pass" : "Fail"}
        </button>
      );
    }
  };

  return (
    <div className={cn("h-full w-full", className)}>
      {getCellContent()}
    </div>
  );
}