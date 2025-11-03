/**
 * NorthStarDetailsPanel - Displays North Star entity details in sidebar
 * Shows north star information, linked projects, and action buttons
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  Edit,
  Plus,
  Loader2,
  TrendingUp,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  Circle,
} from "lucide-react";
import { NorthStar } from "@/types/journey";
import { getNorthStarById } from "@/lib/supabase/north-star";
import { getProjectsByNorthStarId } from "@/lib/supabase/journey";
import { ProjectWithMilestones } from "@/types/journey";
import { format } from "date-fns";

interface NorthStarDetailsPanelProps {
  northStarId: string | null;
  onEdit: () => void;
  onCreateProject: () => void;
  onProjectSelect: (projectId: string) => void;
}

export function NorthStarDetailsPanel({
  northStarId,
  onEdit,
  onCreateProject,
  onProjectSelect,
}: NorthStarDetailsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [northStar, setNorthStar] = useState<NorthStar | null>(null);
  const [linkedProjects, setLinkedProjects] = useState<ProjectWithMilestones[]>([]);

  useEffect(() => {
    if (northStarId) {
      loadNorthStarData();
    }
  }, [northStarId]);

  const loadNorthStarData = async () => {
    if (!northStarId) return;

    setIsLoading(true);
    try {
      const [northStarData, projectsData] = await Promise.all([
        getNorthStarById(northStarId),
        getProjectsByNorthStarId(northStarId),
      ]);

      setNorthStar(northStarData);
      setLinkedProjects(projectsData);
    } catch (error) {
      console.error("Error loading north star data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!northStar) {
    return null;
  }

  const statusStyle = {
    active: "bg-blue-700 text-blue-200",
    achieved: "bg-green-700 text-green-200",
    on_hold: "bg-yellow-700 text-yellow-200",
    archived: "bg-gray-700 text-gray-200",
  }[northStar.status] || "bg-slate-700 text-slate-200";

  // Get first SDG goal if available
  const firstSdgGoal = northStar.sdg_goals && northStar.sdg_goals.length > 0
    ? northStar.sdg_goals[0]
    : null;

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-lg">
                <Star className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-100">
                  {northStar.title}
                </h2>
                <p className="text-xs text-slate-500">North Star</p>
              </div>
            </div>
            <Badge className={statusStyle}>{northStar.status}</Badge>
          </div>
          <Button
            onClick={onEdit}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-200"
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>

        {northStar.description && (
          <p className="text-sm text-slate-400 mb-3">{northStar.description}</p>
        )}

        {/* SDG Goals */}
        {northStar.sdg_goals && northStar.sdg_goals.length > 0 && (
          <div className="bg-slate-800/30 rounded-lg p-3 mb-3">
            <div className="text-xs text-slate-500 mb-2">SDG Goals</div>
            <div className="flex flex-wrap gap-1">
              {northStar.sdg_goals.map((goal) => (
                <Badge key={goal} variant="secondary" className="text-xs">
                  Goal {goal}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Why Section */}
          {northStar.why && (
            <>
              <div className="bg-slate-800/30 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">
                  Why
                </h3>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">
                  {northStar.why}
                </p>
              </div>
              <Separator className="bg-slate-800" />
            </>
          )}

          {/* Career Path */}
          {northStar.career_path && (
            <>
              <div className="bg-slate-800/30 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">
                  Career Path
                </h3>
                <p className="text-sm text-slate-300">
                  {northStar.career_path}
                </p>
              </div>
              <Separator className="bg-slate-800" />
            </>
          )}

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Timeline
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Created</span>
                <span>
                  {format(new Date(northStar.created_at), "MMM d, yyyy")}
                </span>
              </div>
              {northStar.achieved_at && (
                <div className="flex justify-between text-green-400">
                  <span>Achieved</span>
                  <span>
                    {format(new Date(northStar.achieved_at), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-slate-800" />

          {/* Linked Projects */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Linked Projects ({linkedProjects.length})
              </h3>
              <Button
                onClick={onCreateProject}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>

            {linkedProjects.length === 0 ? (
              <div className="text-center py-6 bg-slate-800/30 rounded-lg">
                <Target className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No projects linked yet</p>
                <p className="text-xs text-slate-600 mt-1">
                  Create a project and link it to this North Star
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedProjects.map((project) => {
                  const getStatusIcon = (status: string) => {
                    switch (status) {
                      case "completed":
                        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
                      case "in_progress":
                        return <Clock className="w-4 h-4 text-blue-400" />;
                      default:
                        return <Circle className="w-4 h-4 text-slate-600" />;
                    }
                  };

                  const statusColor = {
                    completed: "text-green-400",
                    in_progress: "text-blue-400",
                    planning: "text-slate-400",
                    not_started: "text-slate-500",
                    on_hold: "text-yellow-400",
                    archived: "text-gray-400",
                  }[project.status] || "text-slate-500";

                  return (
                    <div
                      key={project.id}
                      onClick={() => onProjectSelect(project.id)}
                      className="bg-slate-800/50 rounded-lg p-3 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-2">
                        {getStatusIcon(project.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{project.icon || "🎯"}</span>
                            <h4 className={`text-sm font-medium ${statusColor}`}>
                              {project.title}
                            </h4>
                          </div>
                          {project.description && (
                            <p className="text-xs text-slate-500 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {project.status.replace("_", " ")}
                            </Badge>
                            {project.progress_percentage !== undefined && (
                              <span className="text-xs text-slate-500">
                                {project.progress_percentage}% complete
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
