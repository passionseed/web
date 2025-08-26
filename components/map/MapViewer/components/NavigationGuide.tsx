/**
 * NavigationGuide - Bottom navigation panel with instructions and stats
 */

import React from "react";
import {
  Info,
  ChevronDown,
} from "lucide-react";

import { NavigationGuideProps } from "../types";
import { ProgressStats } from "./ProgressStats";

export function NavigationGuide({
  isExpanded,
  onToggle,
  progressStats,
  progressMap,
  isTeamMap,
  isInstructorOrTA,
}: NavigationGuideProps) {
  if (!isExpanded) {
    return (
      <button
        onClick={onToggle}
        className="absolute bottom-4 right-4 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-2 shadow-lg hover:bg-muted/50 transition-colors"
        aria-expanded={false}
        title="Show navigation guide"
      >
        <Info className="h-4 w-4" />
      </button>
    );
  }

  return (
    <>
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Navigation Guide & Progress
          </h3>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-muted/50 rounded transition-colors"
            aria-label="Hide navigation guide"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Progress Statistics */}
        <ProgressStats
          stats={progressStats}
          progressMap={progressMap}
          isTeamMap={isTeamMap}
          isInstructorOrTA={isInstructorOrTA}
        />

        {/* Navigation Instructions */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Select Node</span>
              <span className="text-muted-foreground">Click</span>
            </div>
            <div className="flex justify-between">
              <span>Next Node</span>
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                Tab
              </kbd>
            </div>
            <div className="flex justify-between">
              <span>Previous Node</span>
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                Shift+Tab
              </kbd>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Pan Map</span>
              <span className="text-muted-foreground">Drag</span>
            </div>
            <div className="flex justify-between">
              <span>Zoom</span>
              <span className="text-muted-foreground">Mouse Wheel</span>
            </div>
            <div className="flex justify-between">
              <span>Deselect</span>
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                Esc
              </kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Navigation Guide Button - Fixed Bottom Right */}
      <button
        onClick={onToggle}
        className="absolute bottom-4 right-4 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-2 shadow-lg hover:bg-muted/50 transition-colors"
        aria-expanded={true}
        title="Hide navigation guide"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </>
  );
}