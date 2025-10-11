"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { TeamStats } from "@/types/teams";

interface TeamStatsCardProps {
  stats: TeamStats;
  classroomName: string;
}

export function TeamStatsCard({ stats, classroomName }: TeamStatsCardProps) {
  const totalStudents = stats.students_in_teams + stats.students_without_teams;
  const teamFormationRate =
    totalStudents > 0
      ? Math.round((stats.students_in_teams / totalStudents) * 100)
      : 0;

  // Calculate distribution percentages
  const distributionData = Object.entries(stats.team_size_distribution).map(
    ([size, count]) => ({
      size: Number(size),
      count,
      percentage: stats.total_teams > 0 ? (count / stats.total_teams) * 100 : 0,
    })
  );
  distributionData.sort((a, b) => a.size - b.size);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Overview Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Team Formation Overview
          </CardTitle>
          <CardDescription>Statistics for {classroomName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Team Formation Rate</span>
              <span className="font-bold">{teamFormationRate}%</span>
            </div>
            <Progress value={teamFormationRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {stats.students_in_teams} of {totalStudents} students in teams
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Teams</p>
              <p className="text-2xl font-bold">{stats.total_teams}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active Teams</p>
              <p className="text-2xl font-bold">{stats.active_teams}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg Team Size</p>
              <p className="text-2xl font-bold">{stats.average_team_size}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">At Capacity</p>
              <p className="text-2xl font-bold">{stats.teams_at_capacity}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Size Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Team Size Distribution
          </CardTitle>
          <CardDescription>
            Distribution of team sizes across the classroom
          </CardDescription>
        </CardHeader>
        <CardContent>
          {distributionData.length > 0 ? (
            <div className="space-y-4">
              {distributionData.map(({ size, count, percentage }) => (
                <div key={size} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {size} {size === 1 ? "member" : "members"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {count} {count === 1 ? "team" : "teams"}
                      </span>
                      <Badge variant="outline">{percentage.toFixed(0)}%</Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                No team size data available
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Participation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Student Participation
          </CardTitle>
          <CardDescription>
            How students are distributed across teams
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">In Teams</p>
                  <p className="text-sm text-muted-foreground">
                    Active team members
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.students_in_teams}</p>
                <p className="text-xs text-muted-foreground">
                  {teamFormationRate}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Without Teams</p>
                  <p className="text-sm text-muted-foreground">
                    Need assignment
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {stats.students_without_teams}
                </p>
                <p className="text-xs text-muted-foreground">
                  {100 - teamFormationRate}%
                </p>
              </div>
            </div>
          </div>

          {stats.students_without_teams > 0 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-orange-900">
                    Action Required
                  </p>
                  <p className="text-sm text-orange-700">
                    {stats.students_without_teams}{" "}
                    {stats.students_without_teams === 1 ? "student needs" : "students need"}{" "}
                    to be assigned to teams. Consider creating new teams or
                    inviting them to existing ones.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Insights & Recommendations
          </CardTitle>
          <CardDescription>
            Suggestions to improve team collaboration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.average_team_size < 3 && stats.total_teams > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Small Team Sizes
              </p>
              <p className="text-sm text-blue-700">
                Average team size is {stats.average_team_size}. Consider merging
                smaller teams to improve collaboration.
              </p>
            </div>
          )}

          {stats.average_team_size > 6 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Large Team Sizes
              </p>
              <p className="text-sm text-blue-700">
                Average team size is {stats.average_team_size}. Larger teams may
                benefit from splitting into smaller groups.
              </p>
            </div>
          )}

          {stats.teams_at_capacity > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-900 mb-1">
                Teams at Capacity
              </p>
              <p className="text-sm text-yellow-700">
                {stats.teams_at_capacity}{" "}
                {stats.teams_at_capacity === 1 ? "team is" : "teams are"} full.
                Consider increasing capacity or creating new teams.
              </p>
            </div>
          )}

          {stats.total_teams > 0 &&
            stats.students_without_teams === 0 &&
            stats.average_team_size >= 3 &&
            stats.average_team_size <= 6 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900 mb-1">
                  Well-Balanced Teams
                </p>
                <p className="text-sm text-green-700">
                  All students are assigned to teams with optimal sizes. Great
                  work!
                </p>
              </div>
            )}

          {stats.total_teams === 0 && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">
                Get Started
              </p>
              <p className="text-sm text-gray-700">
                No teams created yet. Start by creating teams and inviting
                students to join.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
