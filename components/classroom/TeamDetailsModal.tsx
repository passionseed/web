"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Crown,
  Users,
  Calendar,
  MessageSquare,
  Target,
  UserPlus,
  UserMinus,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  ImageIcon,
} from "lucide-react";
import { TeamWithMembers, JoinTeamRequest } from "@/types/teams";
import { useToast } from "@/hooks/use-toast";
import {
  joinTeam,
  leaveTeam,
  removeMemberFromTeam,
  updateMemberRole,
  transferTeamLeadership,
} from "@/lib/supabase/teams";

interface TeamDetailsModalProps {
  team: TeamWithMembers;
  classroomId: string;
  userRole: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamUpdated: () => void;
}

export function TeamDetailsModal({
  team,
  classroomId,
  userRole,
  open,
  onOpenChange,
  onTeamUpdated,
}: TeamDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isUserInTeam = team.current_user_membership;
  const isUserLeader = team.current_user_membership?.is_leader;
  const canManageTeam =
    isUserLeader || userRole === "instructor" || userRole === "ta";

  const handleJoinTeam = async () => {
    try {
      setLoading(true);
      await joinTeam({ team_id: team.id });
      toast({
        title: "Success",
        description: "You've joined the team!",
      });
      onTeamUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error joining team:", error);
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
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    try {
      setLoading(true);
      await leaveTeam(team.id);
      toast({
        title: "Success",
        description: "You've left the team",
      });
      onTeamUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error leaving team:", error);
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
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (
      !confirm(`Are you sure you want to remove ${userName} from the team?`)
    ) {
      return;
    }

    try {
      setLoading(true);
      await removeMemberFromTeam(team.id, userId);
      toast({
        title: "Success",
        description: `${userName} has been removed from the team`,
      });
      onTeamUpdated();
    } catch (error: any) {
      console.error("Error removing member:", error);
      let errorMessage = error.message || "Failed to remove member";
      if (error.code === "NOT_MEMBER") {
        errorMessage = "User is not a member of this team.";
      } else if (error.code === "AUTH_ERROR") {
        errorMessage = "Please log in to perform this action.";
      } else if (error.code === "REMOVE_MEMBER") {
        errorMessage = "Only team leaders can remove members.";
      }
      toast({
        title: "Unable to Remove Member",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteMember = async (userId: string, userName: string) => {
    try {
      setLoading(true);
      console.log("🚀 Promoting member:", { teamId: team.id, userId, userName });
      console.log("👤 Current user:", team.current_user_membership);
      console.log(
        "🎯 Target user:",
        team.team_memberships.find((m) => m.user_id === userId)
      );

      // Use API route instead of direct client call to avoid RLS issues
      const response = await fetch(`/api/classrooms/${classroomId}/teams/${team.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_member_role',
          user_id: userId,
          role: 'co-leader',
          is_leader: false,
        }),
      });

      console.log("📡 API response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ API error response:", errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ API success response:", result);

      toast({
        title: "Success",
        description: `${userName} has been promoted to co-leader`,
      });
      onTeamUpdated();
    } catch (error: any) {
      console.error("❌ Error promoting member:", error);
      let errorMessage = error.message || "Failed to promote member";
      if (error.code === "AUTH_ERROR") {
        errorMessage = "Please log in to perform this action.";
      } else if (error.code === "UPDATE_FAILED") {
        errorMessage = "Failed to update member role.";
      } else if (error.code === "INVALID_ACTION") {
        errorMessage = "Cannot update your own role.";
      } else if (error.code === "UPDATE_MEMBER_ROLE") {
        errorMessage = "Only team leaders can update member roles.";
      } else if (error.code === "PERMISSION_CHECK_FAILED") {
        errorMessage = "Permission check failed.";
      } else if (error.code === "NOT_MEMBER") {
        errorMessage = "User is not a member of this team.";
      }
      toast({
        title: "Unable to Promote Member",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransferLeadership = async (userId: string, userName: string) => {
    try {
      setLoading(true);
      await transferTeamLeadership(team.id, userId);
      toast({
        title: "Success",
        description: `Leadership has been transferred to ${userName}`,
      });
      onTeamUpdated();
    } catch (error: any) {
      console.error("Error transferring leadership:", error);
      let errorMessage = error.message || "Failed to transfer leadership";
      if (error.code === "AUTH_ERROR") {
        errorMessage = "Please log in to perform this action.";
      } else if (error.code === "TRANSFER_LEADERSHIP") {
        errorMessage = "Only the current leader can transfer leadership.";
      } else if (error.code === "NOT_MEMBER") {
        errorMessage = "New leader must be a current member of the team.";
      } else if (error.code === "TRANSFER_FAILED") {
        errorMessage = "Failed to transfer leadership.";
      }
      toast({
        title: "Unable to Transfer Leadership",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const teamColor = team.team_metadata?.color || "#6366f1";
  const hasSpace = !team.max_members || team.member_count < team.max_members;
  const canJoin = !isUserInTeam && hasSpace && userRole === "student";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: teamColor }}
            />
            <div>
              <DialogTitle className="text-xl">{team.name}</DialogTitle>
              <DialogDescription className="mt-1">
                Created {formatDate(team.created_at)} • {team.member_count}{" "}
                members
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Description */}
            {team.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">About This Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{team.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Team Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team Avatar */}
              {team.team_metadata?.avatar_url && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <ImageIcon className="h-5 w-5" />
                      <span>Team Avatar</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center">
                      <img 
                        src={team.team_metadata.avatar_url} 
                        alt="Team Avatar" 
                        className="w-32 h-32 object-cover rounded-lg border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {team.team_metadata?.skills &&
                team.team_metadata.skills.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Target className="h-5 w-5" />
                        <span>Skills & Interests</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {team.team_metadata.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Goals */}
              {team.team_metadata?.goals && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>Team Goals</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {team.team_metadata.goals}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Communication */}
              {team.team_metadata?.communication_platform && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <MessageSquare className="h-5 w-5" />
                      <span>Communication</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {team.team_metadata.communication_platform}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Preferred Meeting Times */}
              {team.team_metadata?.preferred_meeting_times &&
                team.team_metadata.preferred_meeting_times.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Calendar className="h-5 w-5" />
                        <span>Preferred Meeting Times</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {team.team_metadata.preferred_meeting_times.map(
                          (time, index) => (
                            <Badge key={index} variant="secondary">
                              {time}
                            </Badge>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Team Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Team Stats</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Members:</span>
                    <span className="font-medium">
                      {team.member_count}
                      {team.max_members && `/${team.max_members}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">
                      {formatDate(team.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={team.is_active ? "default" : "secondary"}>
                      {team.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Team Members ({team.member_count})
                </CardTitle>
                <CardDescription>
                  {hasSpace
                    ? `${team.max_members ? team.max_members - team.member_count : "Unlimited"} spots available`
                    : "Team is at full capacity"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {team.team_memberships.map((membership) => (
                    <div
                      key={membership.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={membership.profiles?.avatar_url || undefined}
                          />
                          <AvatarFallback>
                            {membership.profiles.full_name?.[0] ||
                              membership.profiles.username[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">
                              {membership.profiles?.full_name ||
                                membership.profiles?.username}
                            </p>
                            {membership.is_leader && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>@{membership.profiles?.username}</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              {membership.role}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Joined {formatDate(membership.joined_at)}
                          </p>
                        </div>
                      </div>

                      {/* Member Actions */}
                      {canManageTeam &&
                        membership.profiles?.id !==
                          team.current_user_membership?.user_id && (
                          <div className="flex items-center space-x-2">
                            {isUserLeader && !membership.is_leader && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleTransferLeadership(
                                    membership.user_id,
                                    membership.profiles?.full_name ||
                                      membership.profiles?.username
                                  )
                                }
                                disabled={loading}
                                className="text-yellow-600 hover:text-yellow-700"
                              >
                                <Crown className="h-4 w-4" />
                              </Button>
                            )}

                            {!membership.is_leader &&
                              membership.role === "member" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handlePromoteMember(
                                      membership.user_id,
                                      membership.profiles?.full_name ||
                                        membership.profiles?.username
                                    )
                                  }
                                  disabled={loading}
                                >
                                  <ArrowUpRight className="h-4 w-4" />
                                </Button>
                              )}

                            {!membership.is_leader && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleRemoveMember(
                                    membership.user_id,
                                    membership.profiles?.full_name ||
                                      membership.profiles?.username
                                  )
                                }
                                disabled={loading}
                                className="text-red-600 hover:text-red-700"
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>
                  Team activity and collaboration history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <p>Activity tracking coming soon</p>
                  <p className="text-sm">
                    This will show team collaborations, project updates, and
                    member activities
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            {canManageTeam && (
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Team Settings
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isUserInTeam ? (
              <Button
                variant="outline"
                onClick={handleLeaveTeam}
                disabled={loading || isUserLeader}
                className="text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isUserLeader ? "Transfer Leadership First" : "Leave Team"}
              </Button>
            ) : canJoin ? (
              <Button onClick={handleJoinTeam} disabled={loading}>
                <UserPlus className="h-4 w-4 mr-2" />
                {loading ? "Joining..." : "Join Team"}
              </Button>
            ) : !hasSpace ? (
              <Badge variant="secondary">Team Full</Badge>
            ) : userRole !== "student" ? (
              <Badge variant="outline">Instructor View</Badge>
            ) : (
              <Badge variant="outline">Already in Team</Badge>
            )}

            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
