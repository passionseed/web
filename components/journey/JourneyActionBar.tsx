/**
 * JourneyActionBar - Top action bar for journey map
 *
 * Displays journey statistics and quick actions like creating new projects.
 */

"use client";

import React from "react";
import { Plus, Target, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface JourneyStats {
  totalProjects: number;
  northStarCount: number;
  activeProjects: number;
  completedProjects: number;
  totalMilestones: number;
  completedMilestones: number;
  progressPercentage: number;
}

interface JourneyActionBarProps {
  stats: JourneyStats;
  onCreateProject: () => void;
}

export function JourneyActionBar({
  stats,
  onCreateProject,
}: JourneyActionBarProps) {
  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border border-slate-800 rounded-lg px-4 py-2 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-slate-300">
              {stats.totalProjects} Projects
            </span>
          </div>
          <div className="w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-slate-300">
              {stats.northStarCount} North Star
            </span>
          </div>
          <div className="w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm text-slate-300">
              {stats.progressPercentage}% Complete
            </span>
          </div>
        </div>
      </div>

      <Button
        onClick={onCreateProject}
        size="sm"
        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
      >
        <Plus className="w-4 h-4 mr-2" />
        New Project
      </Button>
    </div>
  );
}
