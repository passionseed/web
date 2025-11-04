/**
 * MilestoneList - Shows user's active milestones (in progress or not started)
 * Replaces the journey map preview in the dashboard
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Target,
  Plus,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { getUserActiveMilestones } from "@/lib/supabase/journey";
import { ProjectMilestone } from "@/types/journey";

interface MilestoneWithProject extends ProjectMilestone {
  project: {
    title: string;
    id: string;
  };
}

export function MilestoneList() {
  const [milestones, setMilestones] = useState<MilestoneWithProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMilestones();
  }, []);

  const loadMilestones = async () => {
    try {
      setIsLoading(true);
      const data = await getUserActiveMilestones();
      setMilestones(data);
    } catch (error) {
      console.error("Error loading milestones:", error);
      setMilestones([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "in_progress":
        return {
          icon: Clock,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          label: "In Progress",
        };
      case "not_started":
        return {
          icon: Target,
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          label: "Not Started",
        };
      default:
        return {
          icon: CheckCircle2,
          color: "text-green-600",
          bgColor: "bg-green-100",
          label: status,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="h-[400px] md:h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="text-sm text-muted-foreground">Loading milestones...</p>
        </div>
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <div className="h-[400px] md:h-[500px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Target className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold mb-2">No Active Milestones</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first project and add milestones to track your progress
            </p>
            <Button asChild>
              <Link href="/me/journey">
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[400px] md:h-[500px] overflow-hidden">
      <div className="h-full overflow-y-auto space-y-3 pr-2">
        {milestones.map((milestone) => {
          const statusConfig = getStatusConfig(milestone.status);
          const StatusIcon = statusConfig.icon;
          const progressPercentage = (milestone as any).progress_percentage || 0;

          return (
            <Card
              key={milestone.id}
              className="hover:shadow-md transition-shadow relative group"
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {milestone.project.title}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm leading-tight line-clamp-2">
                      {milestone.title}
                    </h4>
                  </div>
                  
                  <Badge
                    variant="secondary"
                    className={`text-xs flex items-center gap-1 ${statusConfig.bgColor} ${statusConfig.color}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </Badge>
                </div>

                {/* Description */}
                {milestone.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {milestone.description}
                  </p>
                )}

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Progress</span>
                    <span className="text-xs font-medium text-purple-600">
                      {progressPercentage}%
                    </span>
                  </div>
                  <Progress 
                    value={progressPercentage} 
                    className="h-1.5"
                  />
                </div>

                {/* Due date if available */}
                {milestone.due_date && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/me/journey">
            View All Projects
          </Link>
        </Button>
      </div>
    </div>
  );
}