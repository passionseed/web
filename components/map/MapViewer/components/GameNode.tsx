/**
 * GameNode - The main learning node component with sprite-based gamified design
 */

import React from "react";
import { Handle, Position } from "@xyflow/react";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Lock,
  Trophy,
} from "lucide-react";

import { GameNodeProps } from "../types";
import { getNodeStyling } from "../utils/mapAnimations";
import { NODE_STYLES } from "../constants";

export function GameNode({
  data,
  selected = false,
  isUnlocked,
  isCompleted,
  requirement,
  isTeamMap,
  isInstructorOrTA,
  allSubmissions,
}: GameNodeProps) {
  const progress = data.progress;
  const spriteUrl = data.sprite_url || NODE_STYLES.DEFAULT_SPRITE;

  // Get node styling based on progress and state
  const { glowEffect, animationClass, brightness, status } = getNodeStyling(
    progress,
    isUnlocked,
    selected,
    isCompleted
  );

  // Determine status icon based on progress
  let statusIcon = null;
  if (!isUnlocked) {
    statusIcon = null;
  } else if (isCompleted) {
    statusIcon = <CheckCircle className="h-4 w-4 text-green-500" />;
  } else if (progress) {
    switch (status) {
      case "failed":
        statusIcon = <AlertTriangle className="h-4 w-4 text-red-500" />;
        break;
      case "submitted":
        statusIcon = <Clock className="h-4 w-4 text-blue-500" />;
        break;
      case "in_progress":
        statusIcon = (
          <Clock className="h-4 w-4 text-orange-500 animate-pulse" />
        );
        break;
      case "not_started":
        if (isUnlocked) {
          statusIcon = <Play className="h-4 w-4 text-blue-400" />;
        }
        break;
    }
  } else if (isUnlocked) {
    statusIcon = <Play className="h-4 w-4 text-blue-400" />;
  }

  // Submission requirement indicator
  let requirementBadge = null;
  if (isTeamMap && isUnlocked) {
    requirementBadge = (
      <div className="absolute -top-2 -left-2 z-50">
        <div
          className={`rounded-full p-1 text-xs font-bold shadow-lg ${
            requirement === "all"
              ? "bg-purple-500 text-white"
              : "bg-blue-500 text-white"
          }`}
          title={`Submission requirement: ${requirement === "all" ? "All team members" : "Any team member"}`}
        >
          {requirement === "all" ? "👥" : "👤"}
        </div>
      </div>
    );
  }

  // End node indicator - Golden trophy badge
  let endNodeBadge = null;
  if (data.node_type === "end") {
    endNodeBadge = (
      <div className="absolute -top-3 -right-3 z-50 animate-bounce">
        <div
          className="rounded-full p-2 text-xs font-bold shadow-lg bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 border-2 border-yellow-300"
          title="End Node - Completing this will mark the seed as finished!"
        >
          <Trophy className="h-4 w-4 text-white" />
        </div>
      </div>
    );
  }

  // Grading indicators for instructors/TAs
  let gradingIndicator = null;
  let memberProgressInfo = null;

  if (isInstructorOrTA && data.id) {
    if (isTeamMap && progress && progress.member_progress) {
      // Show team member progress for team maps
      const memberProgress = progress.member_progress;
      const passedCount = memberProgress.filter(
        (mp: any) => mp.node_status === "passed"
      ).length;
      const submittedCount = memberProgress.filter(
        (mp: any) => mp.node_status === "submitted"
      ).length;
      const inProgressCount = memberProgress.filter(
        (mp: any) => mp.node_status === "in_progress"
      ).length;
      const totalMembers = memberProgress.length;
      const completedCount = passedCount + submittedCount;

      // Check if this is an "all" requirement node
      const requiresAll = requirement === "all";
      
      let badgeColor = "bg-blue-500";
      let badgeText = `${totalMembers}`;
      let title = `Team progress: ${passedCount} passed, ${submittedCount} submitted, ${inProgressCount} in progress`;

      if (requiresAll) {
        if (completedCount === totalMembers) {
          badgeColor = "bg-green-500";
          badgeText = "✓";
          title = `All members completed: ${passedCount} passed, ${submittedCount} submitted`;
        } else if (completedCount > 0) {
          badgeColor = "bg-orange-500";
          badgeText = `${completedCount}/${totalMembers}`;
          title = `Partial completion: ${completedCount}/${totalMembers} members submitted (${passedCount} passed, ${submittedCount} submitted)`;
        } else {
          badgeColor = "bg-red-500";
          badgeText = `0/${totalMembers}`;
          title = `No submissions yet from ${totalMembers} team members`;
        }
      }

      memberProgressInfo = (
        <div className="absolute -top-2 -right-2 z-50">
          <div
            className={`rounded-full p-1 text-xs font-bold shadow-lg text-white ${badgeColor} ${completedCount < totalMembers && requiresAll ? 'animate-pulse' : ''}`}
            title={title}
          >
            {badgeText}
          </div>
        </div>
      );
    } else {
      // Count submissions for individual progress
      const nodeSubmissions = allSubmissions.filter(
        (sub) => sub.node_assessments?.map_nodes?.id === data.id
      );
      const submissionCount = nodeSubmissions.length;
      const pendingCount = nodeSubmissions.filter(
        (sub) => sub.submission_grades.length === 0
      ).length;

      // Add grading badge if there are submissions
      if (submissionCount > 0) {
        gradingIndicator = (
          <div className="absolute -top-2 -right-2 z-50">
            <div
              className={`rounded-full p-1 text-xs font-bold shadow-lg ${
                pendingCount > 0
                  ? "bg-orange-500 text-white animate-pulse"
                  : "bg-green-500 text-white"
              }`}
            >
              {pendingCount > 0 ? pendingCount : submissionCount}
            </div>
          </div>
        );
      }
    }
  }

  return (
    <div className="relative inline-block group w-fit h-fit">
      {/* Connection handles - visible but non-interactive in viewer mode */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500/20 border-2 border-blue-400/50 shadow-sm opacity-60"
        style={{ pointerEvents: "none", display: "none" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-green-500/20 border-2 border-green-400/50 shadow-sm opacity-60"
        style={{ pointerEvents: "none", display: "none" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 bg-blue-500/20 border-2 border-blue-400/50 shadow-sm opacity-60"
        style={{ pointerEvents: "none", display: "none" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 bg-green-500/20 border-2 border-green-400/50 shadow-sm opacity-60"
        style={{ pointerEvents: "none", display: "none" }}
      />

      <div
        className={`relative ${selected ? "scale-110 translate-y-3" : ""} transition-transform duration-300 cursor-pointer ${animationClass}`}
        role="button"
        tabIndex={isUnlocked ? 0 : -1}
        aria-label={`${data.title} - ${isUnlocked ? "Available" : "Locked"} - Difficulty: ${data.difficulty} stars`}
        aria-describedby={progress ? `progress-${data.id}` : undefined}
      >
        {/* Selection Shadow - Enhanced for flying islands */}
        {selected && (
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

        {/* End Node Badge */}
        {endNodeBadge}

        {/* Sprite Image */}
        <img
          src={spriteUrl}
          alt={data.title}
          className={`w-auto h-auto object-contain z-20 drop-shadow-lg hover:drop-shadow-xl transition-all duration-300 ${glowEffect}`}
          style={{
            filter: brightness,
          }}
        />

        {/* Floating Label with Enhanced Animation */}
        <div
          className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 ${selected ? "scale-105 -translate-y-1" : ""} transition-all duration-300`}
        >
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1 shadow-lg hover:shadow-xl transition-shadow duration-200">
            <div className="text-xs font-bold text-gray-800 text-center whitespace-nowrap max-w-24 truncate">
              {data.title}
            </div>
            <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
              ⭐ {data.difficulty}
              {statusIcon && <span className="ml-1">{statusIcon}</span>}
            </div>
          </div>
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
        {progress && (
          <div id={`progress-${data.id}`} className="sr-only">
            Progress: {status.replace("_", " ")}
            {progress.submitted_at &&
              `, Submitted: ${new Date(progress.submitted_at).toLocaleDateString()}`}
          </div>
        )}
      </div>
    </div>
  );
}