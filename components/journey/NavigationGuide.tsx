/**
 * NavigationGuide - Expandable navigation help panel
 *
 * Shows journey statistics and keyboard/mouse controls.
 */

"use client";

import React from "react";
import { Info, ChevronDown } from "lucide-react";
import { JourneyStats } from "./JourneyActionBar";

interface NavigationGuideProps {
  stats: JourneyStats;
  isExpanded: boolean;
  onToggle: () => void;
}

export function NavigationGuide({
  stats,
  isExpanded,
  onToggle,
}: NavigationGuideProps) {
  if (!isExpanded) {
    return (
      <button
        onClick={onToggle}
        className="absolute bottom-4 right-4 z-10 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border border-slate-800 rounded-lg p-2 shadow-lg hover:bg-slate-800 transition-colors"
        aria-expanded={false}
        title="Show statistics"
      >
        <Info className="h-4 w-4 text-slate-400" />
      </button>
    );
  }

  return (
    <>
      <div className="bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border-t border-slate-800 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-200">
            <Info className="h-4 w-4" />
            Journey Statistics
          </h3>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
            aria-label="Hide statistics"
          >
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Journey Stats */}
        <div className="mb-4 bg-slate-800/30 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-slate-300">
                {stats.activeProjects} Active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-slate-300">
                {stats.completedProjects} Completed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span className="text-slate-300">
                {stats.completedMilestones}/{stats.totalMilestones} Milestones
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-slate-300">
                {stats.northStarCount} North Stars
              </span>
            </div>
          </div>
          <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              style={{ width: `${stats.progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Navigation Instructions */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Select Project</span>
              <span className="text-slate-500">Click</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Pan Map</span>
              <span className="text-slate-500">Drag</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Zoom</span>
              <span className="text-slate-500">Mouse Wheel</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Deselect</span>
              <kbd className="px-1 py-0.5 bg-slate-800 rounded text-xs text-slate-400">
                Esc
              </kbd>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onToggle}
        className="absolute bottom-4 right-4 z-10 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border border-slate-800 rounded-lg p-2 shadow-lg hover:bg-slate-800 transition-colors"
        aria-expanded={true}
        title="Hide statistics"
      >
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
    </>
  );
}
