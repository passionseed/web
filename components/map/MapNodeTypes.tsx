import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Lock,
} from "lucide-react";
import { MapNode } from "@/types/map";
import { StudentProgress } from "@/lib/supabase/progresses";
import { TextNode } from "@/components/map/MapEditor/components/TextNode";
import { CommentNode } from "@/components/map/CommentNode";

export interface MapNodeData extends MapNode {
  progress?: StudentProgress | any;
  isUnlocked?: boolean;
  isInstructorOrTA?: boolean;
  isTeamMap?: boolean;
  userRole?: string;
}

const isNodeCompleted = (data: MapNodeData): boolean => {
  const requirement = data.metadata?.submission_requirement || "single";
  const progress = data.progress;

  if (requirement === "single") {
    // Single requirement: any team member completion counts
    return progress?.status === "passed" || progress?.status === "submitted";
  } else {
    // All requirement: check if all team members have submitted
    if (progress?.member_progress) {
      return progress.member_progress.every(
        (member: any) =>
          member.status === "passed" || member.status === "submitted"
      );
    }
    return progress?.status === "passed" || progress?.status === "submitted";
  }
};

export const MapNodeDefault = memo(({
  data,
  selected,
}: {
  data: MapNodeData;
  selected?: boolean;
}) => {
  const progress = data.progress;
  const isUnlocked = data.isUnlocked;
  const spriteUrl = data.sprite_url || "/islands/crystal.png";

  // Determine node state and styling
  let statusIcon = null;
  let glowEffect = "";
  let brightness = "brightness(1)";
  let animationClass = "";

  // Base floating animation for all unlocked nodes
  if (isUnlocked) {
    animationClass = "animate-float";
  }

  if (!isUnlocked) {
    brightness = "brightness(0.3) grayscale(1)";
    statusIcon = null;
  } else if (progress) {
    // Handle both individual progress (StudentProgress) and team progress (any) structures
    const status = progress.status || (progress as any)?.status;
    const isCompleted = isNodeCompleted(data);

    if (isCompleted) {
      // Node is completed based on submission requirements
      glowEffect = "drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]";
      statusIcon = <CheckCircle className="h-4 w-4 text-green-500" />;
      animationClass = "animate-float-success";
    } else if (status === "failed") {
      // Submitted but failed (needs retry)
      glowEffect = "drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]";
      statusIcon = <AlertTriangle className="h-4 w-4 text-red-500" />;
      animationClass = "animate-shake";
    } else if (status === "submitted") {
      // Submitted awaiting grade (if not marked as complete by isNodeCompleted)
      glowEffect = "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]";
      statusIcon = <Clock className="h-4 w-4 text-blue-500" />;
      animationClass = "animate-float";
    } else if (status === "in_progress") {
      glowEffect = "drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]";
      statusIcon = <Play className="h-4 w-4 text-amber-500" />;
      animationClass = "animate-float";
    }
  }

  // If just unlocked but not started
  if (isUnlocked && (!progress || !progress.status)) {
    animationClass = "animate-float";
  }

  // Instructor/TA grading indicator
  let gradingIndicator = null;
  if (data.isInstructorOrTA) {
    const needsGrading =
      progress?.status === "submitted" &&
      !(progress as any)?.grade &&
      !(progress as any)?.is_graded;

    if (needsGrading) {
      gradingIndicator = (
        <div className="absolute -top-3 -right-3 z-30 animate-bounce">
          <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-red-400">
            GRADE
          </div>
        </div>
      );
    }
  }

  // Team Progress Info (for instructors viewing team maps)
  let memberProgressInfo = null;
  if (data.isInstructorOrTA && data.isTeamMap && (progress as any)?.member_progress) {
    const memberProgress = (progress as any).member_progress as any[];
    const totalMembers = memberProgress.length;
    const completedMembers = memberProgress.filter(
      (m) => m.status === "passed" || m.status === "submitted"
    ).length;

    const allCompleted = completedMembers === totalMembers;
    const anyCompleted = completedMembers > 0;

    // Show a small pill indicating how many completed
    const bgColor = allCompleted
      ? "bg-green-500"
      : anyCompleted
        ? "bg-amber-500"
        : "bg-slate-500";

    memberProgressInfo = (
      <div className="absolute -top-8 right-0 z-30 transform scale-90 origin-bottom-right">
        <div
          className={`${bgColor} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md border border-white/20 flex items-center gap-1`}
        >
          <span className="text-[9px]">👥</span>
          {completedMembers}/{totalMembers}
        </div>
      </div>
    );
  }

  // Submission requirement badge (Little icon near the node to show distinct requirements)
  let requirementBadge = null;
  if (data.isTeamMap) {
    const requirement = data.metadata?.submission_requirement || "single";
    if (requirement === "all") {
      requirementBadge = (
        <div className="absolute top-0 -left-2 z-20" title="All members must submit">
          <div className="bg-purple-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow border border-purple-400 font-bold">
            A
          </div>
        </div>
      );
    }
  }

  return (
    <div className={`relative group ${animationClass}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-slate-400/50 !border-2 !border-slate-600 !-left-2 transition-colors hover:!bg-slate-300"
        style={{ opacity: 0 }} // Hide handles visually but keep functional
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-slate-400/50 !border-2 !border-slate-600 !-right-2 transition-colors hover:!bg-slate-300"
        style={{ opacity: 0 }}
      />

      {/* Core Node Visuals */}
      <div className="relative min-w-[64px] min-h-[64px] w-fit h-fit flex items-center justify-center">
        {/* Background Atmosphere/Glow */}
        {isUnlocked && (
          <div className="absolute inset-0 -z-10">
            {/* Main shadow image */}
            <img
              src={spriteUrl}
              alt=""
              className="w-auto h-auto object-contain absolute opacity-60"
              style={{
                filter: "brightness(0) blur(4px)",
                transform: "scale(1.3)",
              }}
            />
            {/* Secondary softer shadow for depth */}
            <img
              src={spriteUrl}
              alt=""
              className="w-max h-max object-contain absolute opacity-30"
              style={{
                filter: "brightness(0) blur(8px)",
                transform: "translateY(16px) scale(1.2)",
              }}
            />
            {/* Ground shadow for flying island effect */}
            <div
              className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 w-16 h-6 bg-black/20 rounded-full blur-md"
              style={{
                animation: selected
                  ? "shadow-pulse 2s ease-in-out infinite"
                  : "none",
              }}
            />
          </div>
        )}

        {/* Progress Glow Effect */}
        {glowEffect && (
          <div
            className={`absolute inset-0 ${glowEffect} rounded-full animate-pulse-slow`}
          />
        )}

        {/* Grading Indicator for Instructors/TAs */}
        {gradingIndicator}
        {memberProgressInfo}

        {/* Submission Requirement Badge */}
        {requirementBadge}

        {/* Sprite Image */}
        <img
          src={spriteUrl}
          alt={data.title}
          className={`w-auto h-auto object-contain z-20 drop-shadow-lg hover:drop-shadow-xl transition-all duration-300 ${glowEffect}`}
          style={{
            filter: selected
              ? `${brightness} brightness(1.15) saturate(1.3)`
              : brightness,
          }}
        />

        {/* Floating Label with Enhanced Animation */}
        <div
          className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 ${selected ? "scale-105 -translate-y-1" : ""} transition-all duration-300 group/label`}
        >
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-lg hover:shadow-xl transition-all duration-200 min-w-[100px] max-w-[240px]">
            <div className="text-xs font-bold text-card-foreground text-center break-words line-clamp-2 leading-snug">
              {data.title}
            </div>
            <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1 mt-0.5">
              ⭐ {data.difficulty}
              {statusIcon && <span className="ml-1">{statusIcon}</span>}
            </div>
          </div>
          {/* Full title tooltip on hover - only if truncated */}
          {data.title && data.title.length > 20 && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover/label:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
              <div className="bg-gray-900/95 dark:bg-gray-800/95 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-normal max-w-xs backdrop-blur-sm break-words">
                {data.title}
                {/* Arrow pointing down */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
              </div>
            </div>
          )}
        </div>

        {/* Lock Overlay for locked nodes */}
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/60 rounded-full p-3 backdrop-blur-sm animate-pulse">
              <Lock className="h-6 w-6 text-white drop-shadow-sm" />
            </div>
          </div>
        )}

        {/* Hover Effect for Unlocked Nodes */}
        {isUnlocked && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute inset-0 bg-gradient-to-t from-blue-400/10 to-transparent rounded-full blur-sm" />
          </div>
        )}

        {/* Screen Reader Description */}
        <span className="sr-only">
          {data.title} node, difficulty {data.difficulty}, status:{" "}
          {progress?.status || "locked"}
        </span>
      </div>
    </div>
  );
});

MapNodeDefault.displayName = "MapNodeDefault";

export const MapNodeText = memo(({
  data,
  selected,
}: {
  data: MapNodeData & { node_type?: string };
  selected?: boolean;
}) => {
  // Text nodes are read-only in the viewer, so no onDataChange
  return (
    <TextNode
      data={data}
      selected={selected}
      // Disable editing and double-click in viewer mode
      allowEdit={false}
      allowDoubleClick={false}
      showHint={false}
    />
  );
});

MapNodeText.displayName = "MapNodeText";

export const MapNodeComment = memo(({
  data,
  selected,
}: {
  data: MapNodeData & { node_type?: string };
  selected?: boolean;
}) => {
  // Comment nodes can be edited by instructors/TAs
  return (
    <CommentNode
      data={data}
      selected={selected}
      userRole={data.userRole as any} // Cast userRole if needed
      // Allow editing for instructors/TAs, read-only for students
      allowEdit={data.isInstructorOrTA}
      allowDoubleClick={data.isInstructorOrTA}
      showHint={true}
      showEditButton={true}
      onDataChange={(updatedData) => {
        // Handle comment node updates
        if (data.isInstructorOrTA && updatedData) {
          // TODO: Persist comment changes to database
          console.log("Comment node updated:", updatedData);
        }
      }}
    />
  );
});

MapNodeComment.displayName = "MapNodeComment";
