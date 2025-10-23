/**
 * DailyActivityPanel - Fixed panel showing today's activity
 * Displays updates, streak counter, and quick actions
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Flame,
  ChevronDown,
  ChevronUp,
  Plus,
  ArrowRight,
  Activity,
} from "lucide-react";
import { getDailyActivity } from "@/lib/supabase/journey";
import { DailyActivitySummary } from "@/types/journey";
import { format } from "date-fns";

interface DailyActivityPanelProps {
  onQuickJournal: () => void;
  onProjectClick: (projectId: string) => void;
}

export function DailyActivityPanel({
  onQuickJournal,
  onProjectClick,
}: DailyActivityPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [activitySummary, setActivitySummary] =
    useState<DailyActivitySummary | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    loadDailyActivity();
  }, []);

  const loadDailyActivity = async () => {
    setIsLoading(true);
    try {
      const summary = await getDailyActivity();
      setActivitySummary(summary);
      // TODO: Calculate streak from backend
      setCurrentStreak(3); // Placeholder
    } catch (error) {
      console.error("Error loading daily activity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const today = format(new Date(), "EEEE, MMM d");
  const activityCount = activitySummary?.activity_count || 0;
  const projectsCount = activitySummary?.projects_worked_on.length || 0;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
      {/* Header - Always visible */}
      <div
        className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                Today's Activity
              </h3>
              <p className="text-white/80 text-xs">{today}</p>
            </div>
          </div>
          <button
            aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-white/80" />
            <span className="text-white font-semibold">{activityCount}</span>
            <span className="text-white/80 text-xs">updates</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-300" />
            <span className="text-white font-semibold">{currentStreak}</span>
            <span className="text-white/80 text-xs">day streak</span>
          </div>
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <>
          <div className="p-4 space-y-4">
            {/* Quick action button */}
            <Button
              onClick={onQuickJournal}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Quick Journal
            </Button>

            <Separator />

            {/* Projects worked on today */}
            {isLoading ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                Loading...
              </div>
            ) : projectsCount > 0 ? (
              <>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Active Projects Today
                  </h4>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {activitySummary?.projects_worked_on.map((projectId) => (
                        <button
                          key={projectId}
                          onClick={() => onProjectClick(projectId)}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left group"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-sm text-gray-700 truncate">
                              Project {projectId.slice(0, 8)}...
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Milestone summary */}
                {activitySummary &&
                  activitySummary.milestones_worked_on.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-blue-700 text-sm">
                        <Badge
                          variant="secondary"
                          className="bg-blue-200 text-blue-800"
                        >
                          {activitySummary.milestones_worked_on.length}
                        </Badge>
                        <span>
                          milestone
                          {activitySummary.milestones_worked_on.length !== 1
                            ? "s"
                            : ""}{" "}
                          updated
                        </span>
                      </div>
                    </div>
                  )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No activity today yet</p>
                <p className="text-xs mt-1">
                  Start journaling to build your streak!
                </p>
              </div>
            )}
          </div>

          {/* Streak encouragement */}
          {currentStreak > 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-3 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <Flame className="w-5 h-5 text-orange-500 animate-bounce" />
                <div>
                  <p className="font-semibold text-orange-900">
                    {currentStreak} day streak!
                  </p>
                  <p className="text-xs text-orange-700">Keep it going!</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
