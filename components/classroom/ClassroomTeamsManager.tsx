"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  UserPlus,
  Settings,
  Crown,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Plus,
  Eye,
  UserMinus,
  UserX,
  LogOut,
  Info,
} from "lucide-react";

// Team types
import type {
  TeamWithMembers,
  TeamStats,
  TeamMembership,
  ClassroomTeam,
} from "@/types/teams";

// Team functions
import {
  getClassroomTeams,
  getClassroomTeamStats,
  getStudentsWithoutTeams,
  joinTeam,
  leaveTeam,
} from "@/lib/supabase/teams";

// Team components
import { CreateTeamModal } from "./CreateTeamModal";
import { TeamDetailsModal } from "./TeamDetailsModal";
import { TeamSettingsModal } from "./TeamSettingsModal";

interface ClassroomTeamsManagerProps {
  classroomId: string;
  userRole: string; // "student" | "ta" | "instructor"
  canManage: boolean;
}

export function ClassroomTeamsManager({
  classroomId,
  userRole,
  canManage,
}: ClassroomTeamsManagerProps) {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [unassignedStudents, setUnassignedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(
    null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Debug mode - can be controlled via environment or props
  const isDebugMode = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!classroomId) {
      console.error("❌ ClassroomTeamsManager: No classroomId provided");
      setError("Invalid classroom ID");
      setLoading(false);
      return;
    }

    // Wait for auth to load
    if (authLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      setError("Please log in to view teams");
      setLoading(false);
      return;
    }

    if (isDebugMode) {
      console.log("🏗️ ClassroomTeamsManager initializing:", {
        classroomId,
        userRole,
        canManage,
        user: user?.id,
        isAuthenticated,
      });
    }

    loadTeamsData();
  }, [classroomId, isAuthenticated, user, authLoading]);

  const loadTeamsData = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors

      console.log("🔄 loadTeamsData called for classroom:", classroomId);

      if (isDebugMode) {
        console.log("🔄 Loading teams data for classroom:", classroomId);
      }

      // Call team functions directly
      const [teamsData, statsData, unassignedData] = await Promise.allSettled([
        getClassroomTeams(classroomId),
        getClassroomTeamStats(classroomId),
        getStudentsWithoutTeams(classroomId),
      ]);
      console.log(
        "📊 Teams, stats, and unassigned students loaded:",
        teamsData,
        statsData,
        unassignedData
      );

      // Handle teams data
      if (teamsData.status === "fulfilled") {
        const teams = teamsData.value || [];
        console.log(teams, "teams loaded");
        setTeams(teams);

        // If a team details modal is open for a specific team, refresh the selectedTeam
        // so modals show the latest data instead of a stale reference.
        setSelectedTeam((prev) => {
          if (!prev) {
            console.log("📋 No selectedTeam to refresh");
            return prev;
          }
          const refreshed = teams.find((t: any) => t.id === prev.id) || null;
          if (!refreshed) {
            console.log(
              "❌ selectedTeam not found in refreshed data, clearing:",
              prev.id
            );
            return null; // team might have been deleted
          }
          console.log("🔄 Refreshing selectedTeam:", {
            oldTeam: prev.name,
            newTeam: refreshed.name,
            membersCount: refreshed.team_memberships?.length,
          });
          return refreshed;
        });

        if (isDebugMode) {
          console.log("✅ Teams loaded successfully:", {
            teamsCount: teams.length,
            isEmpty: teams.length === 0,
          });
        }

        // Success feedback for empty state
        if (teams.length === 0 && isDebugMode) {
          console.log(
            "📋 No teams found - showing empty state (this is normal for new classrooms)"
          );
        }
      } else {
        console.error("❌ Failed to load teams:", teamsData.reason);
        setTeams([]);

        // Handle specific error types
        if (teamsData.reason?.message?.includes("AUTH_ERROR")) {
          setError("Please log in to view teams");
          toast({
            title: "Authentication Required",
            description: "Please log in to view teams.",
            variant: "destructive",
          });
        } else if (teamsData.reason?.message?.includes("NOT_IN_CLASSROOM")) {
          setError("Access denied");
          toast({
            title: "Access Denied",
            description:
              "You don't have permission to view teams in this classroom.",
            variant: "destructive",
          });
        } else {
          setError("Failed to load teams");
          toast({
            title: "Error",
            description: "Failed to load teams. Please try again.",
            variant: "destructive",
          });
        }
      }

      // Handle stats data
      if (statsData.status === "fulfilled") {
        const stats = statsData.value || {
          total_teams: 0,
          active_teams: 0,
          average_team_size: 0,
          teams_at_capacity: 0,
          students_in_teams: 0,
          students_without_teams: 0,
          team_size_distribution: {},
        };
        setStats(stats);

        if (isDebugMode) {
          console.log("✅ Stats loaded successfully:", stats);
        }
      } else {
        console.error("❌ Failed to load stats:", statsData.reason);
        setStats({
          total_teams: 0,
          active_teams: 0,
          average_team_size: 0,
          teams_at_capacity: 0,
          students_in_teams: 0,
          students_without_teams: 0,
          team_size_distribution: {},
        });
      }

      // Handle unassigned students data
      if (unassignedData.status === "fulfilled") {
        const students = unassignedData.value || [];
        setUnassignedStudents(students);

        if (isDebugMode) {
          console.log("✅ Unassigned students loaded:", {
            count: students.length,
            isEmpty: students.length === 0,
          });

          if (students.length === 0) {
            console.log(
              "👥 All students are in teams or no students in classroom"
            );
          }
        }
      } else {
        console.error(
          "❌ Failed to load unassigned students:",
          unassignedData.reason
        );
        setUnassignedStudents([]);
      }
    } catch (error) {
      console.error("❌ Network error loading teams data:", error);

      // Set safe defaults
      setTeams([]);
      setStats({
        total_teams: 0,
        active_teams: 0,
        average_team_size: 0,
        teams_at_capacity: 0,
        students_in_teams: 0,
        students_without_teams: 0,
        team_size_distribution: {},
      });
      setUnassignedStudents([]);
      setError("Connection failed");

      toast({
        title: "Connection Error",
        description:
          "Unable to connect. Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    try {
      await joinTeam({ team_id: teamId });
      toast({
        title: "Success",
        description: "You've joined the team!",
      });
      loadTeamsData();
    } catch (error: any) {
      console.error("❌ Failed to join team:", error);

      // Provide specific error messages based on common scenarios
      let errorMessage = error.message || "Failed to join team";
      if (error.code === "TEAM_FULL") {
        errorMessage = "This team is full. Try joining a different team.";
      } else if (error.code === "ALREADY_IN_TEAM") {
        errorMessage =
          "You're already in a team. Leave your current team first.";
      } else if (error.code === "TEAM_NOT_FOUND") {
        errorMessage = "Team not found. It may have been deleted.";
      } else if (error.code === "AUTH_ERROR") {
        errorMessage = "Please log in to join teams.";
      }

      toast({
        title: "Unable to Join Team",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    try {
      await leaveTeam(teamId);
      toast({
        title: "Success",
        description: "You've left the team",
      });
      loadTeamsData();
    } catch (error: any) {
      console.error("❌ Failed to leave team:", error);

      // Provide specific error messages
      let errorMessage = error.message || "Failed to leave team";
      if (error.code === "LEAVE_TEAM" && error.action === "LEAVE_TEAM") {
        errorMessage = "Team leaders must transfer leadership before leaving.";
      } else if (error.code === "NOT_MEMBER") {
        errorMessage = "Team not found or you're not a member.";
      } else if (error.code === "AUTH_ERROR") {
        errorMessage = "Please log in to perform this action.";
      }

      toast({
        title: "Unable to Leave Team",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getUserTeam = () => {
    return teams.find((team) => team.current_user_membership);
  };

  const getTeamColor = (team: TeamWithMembers) => {
    return team.team_metadata?.color || "#6366f1";
  };

  const canJoinTeam = (team: TeamWithMembers) => {
    if (getUserTeam()) return false; // Already in a team
    if (team.max_members && team.member_count >= team.max_members) return false;
    return true;
  };

  const isTeamLeader = (team: TeamWithMembers) => {
    return team.current_user_membership?.is_leader || false;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading || authLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-32 animate-pulse bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-48 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  // Show error state if there's a critical error
  if (error) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center border-red-200">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-red-700">
            Unable to Load Teams
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadTeamsData} variant="outline" className="mr-2">
            Try Again
          </Button>
          {isDebugMode && (
            <Button
              onClick={() => {
                console.log("🐛 Debug info:", {
                  classroomId,
                  userRole,
                  canManage,
                  error,
                  teams: teams.length,
                  stats,
                });
              }}
              variant="ghost"
              size="sm"
            >
              Debug Info
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_teams}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active_teams} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Students in Teams
              </CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.students_in_teams}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.students_without_teams} unassigned
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Team Size
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.average_team_size}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.teams_at_capacity} at capacity
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Status</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {getUserTeam() ? (
                <div>
                  <div className="text-2xl font-bold">In Team</div>
                  <p className="text-xs text-muted-foreground">
                    {getUserTeam()?.name}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-bold">Available</div>
                  <p className="text-xs text-muted-foreground">Ready to join</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold">Teams</h3>
          <p className="text-muted-foreground">
            {userRole === "student"
              ? "Find and join a team to collaborate with classmates"
              : "Manage student teams and collaboration"}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {userRole === "student" && !getUserTeam() && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="teams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teams">All Teams ({teams.length})</TabsTrigger>
          {canManage && (
            <TabsTrigger value="unassigned">
              Unassigned Students ({unassignedStudents.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          {teams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  currentUser={getUserTeam()}
                  userRole={userRole}
                  canManage={canManage}
                  onJoin={() => handleJoinTeam(team.id)}
                  onLeave={() => handleLeaveTeam(team.id)}
                  onViewDetails={() => {
                    setSelectedTeam(team);
                    setShowDetailsModal(true);
                  }}
                  onSettings={() => {
                    setSelectedTeam(team);
                    setShowSettingsModal(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to create a team and start collaborating!
              </p>
              {userRole === "student" && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              )}
            </Card>
          )}
        </TabsContent>

        {canManage && (
          <TabsContent value="unassigned" className="space-y-4">
            {unassignedStudents.length > 0 ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <UserX className="h-5 w-5" />
                      <span>Students Without Teams</span>
                    </CardTitle>
                    <CardDescription>
                      These students haven't joined any team yet
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {unassignedStudents.map((student: any) => (
                        <div
                          key={student.user_id}
                          className="flex items-center space-x-3 p-3 border rounded-lg"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={student.avatar_url} />
                            <AvatarFallback>
                              {student.full_name?.[0] || student.username[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {student.full_name || student.username}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              @{student.username}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  All students are in teams
                </h3>
                <p className="text-muted-foreground">
                  Every student in this classroom has joined a team!
                </p>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Modals */}
      <CreateTeamModal
        classroomId={classroomId}
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onTeamCreated={loadTeamsData}
      />

      {selectedTeam && (
        <>
          <TeamDetailsModal
            team={selectedTeam}
            classroomId={classroomId}
            userRole={userRole}
            open={showDetailsModal}
            onOpenChange={setShowDetailsModal}
            onTeamUpdated={loadTeamsData}
          />

          {(isTeamLeader(selectedTeam) || canManage) && (
            <TeamSettingsModal
              team={selectedTeam}
              classroomId={classroomId}
              open={showSettingsModal}
              onOpenChange={setShowSettingsModal}
              onTeamUpdated={loadTeamsData}
            />
          )}
        </>
      )}
    </div>
  );
}

interface TeamCardProps {
  team: TeamWithMembers;
  currentUser: TeamWithMembers | undefined;
  userRole: string;
  canManage: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onViewDetails: () => void;
  onSettings: () => void;
}

function TeamCard({
  team,
  currentUser,
  userRole,
  canManage,
  onJoin,
  onLeave,
  onViewDetails,
  onSettings,
}: TeamCardProps) {
  const isUserInTeam = team.current_user_membership;
  const isUserLeader = team.current_user_membership?.is_leader;
  const teamColor = team.team_metadata?.color || "#6366f1";
  const hasSpace = !team.max_members || team.member_count < team.max_members;
  const canJoin = !currentUser && hasSpace && userRole === "student";

  // console.log(team, "team");

  return (
    <Card className="relative overflow-hidden">
      {/* Team color stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: teamColor }}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{team.name}</CardTitle>
            {team.description && (
              <CardDescription className="line-clamp-2">
                {team.description}
              </CardDescription>
            )}
          </div>

          {isUserLeader && (
            <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Team Members */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Members</span>
            <span className="font-medium">
              {team.member_count}
              {team.max_members && `/${team.max_members}`}
            </span>
          </div>

          <div className="flex -space-x-2">
            {team.team_memberships.slice(0, 4).map((membership) => (
              <Avatar
                key={membership.id}
                className="h-8 w-8 border-2 border-background"
              >
                <AvatarImage
                  src={membership.profiles?.avatar_url || undefined}
                />
                <AvatarFallback className="text-xs">
                  {membership.profiles?.full_name?.[0] ||
                    membership.profiles?.username[0]}
                </AvatarFallback>
              </Avatar>
            ))}

            {team.member_count > 4 && (
              <div className="h-8 w-8 bg-muted border-2 border-background rounded-full flex items-center justify-center text-xs font-medium">
                +{team.member_count - 4}
              </div>
            )}
          </div>

          {team.leader && (
            <p className="text-xs text-muted-foreground">
              Led by{" "}
              {team.leader.profiles?.full_name ||
                team.leader.profiles?.username}
            </p>
          )}
        </div>

        {/* Team Skills/Metadata */}
        {team.team_metadata?.skills && team.team_metadata.skills.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Skills</p>
            <div className="flex flex-wrap gap-1">
              {team.team_metadata.skills.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {team.team_metadata.skills.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{team.team_metadata.skills.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="flex-1 mr-2"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>

          {isUserInTeam ? (
            <div className="flex space-x-1">
              {isUserLeader && (
                <Button variant="outline" size="sm" onClick={onSettings}>
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              {!isUserLeader && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLeave}
                  className="text-red-600 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : canJoin ? (
            <Button size="sm" onClick={onJoin}>
              <UserPlus className="h-4 w-4 mr-1" />
              Join
            </Button>
          ) : !hasSpace ? (
            <Badge variant="secondary">Full</Badge>
          ) : currentUser ? (
            <Badge variant="outline">In Team</Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
