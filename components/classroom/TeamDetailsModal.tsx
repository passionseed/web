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
} from "lucide-react";
import { TeamWithMembers } from "@/types/teams";
import { useToast } from "@/hooks/use-toast";

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
      const response = await fetch(
        `/api/classrooms/${classroomId}/teams/${team.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join" }),
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "You've joined the team!",
        });
        onTeamUpdated();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to join team",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error joining team:", error);
      toast({
        title: "Error",
        description: "Failed to join team",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/classrooms/${classroomId}/teams/${team.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave" }),
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "You've left the team",
        });
        onTeamUpdated();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to leave team",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error leaving team:", error);
      toast({
        title: "Error",
        description: "Failed to leave team",
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
      const response = await fetch(
        `/api/classrooms/${classroomId}/teams/${team.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "remove_member", user_id: userId }),
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: `${userName} has been removed from the team`,
        });
        onTeamUpdated();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to remove member",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteMember = async (userId: string, userName: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/classrooms/${classroomId}/teams/${team.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_member_role",
            user_id: userId,
            role: "co-leader",
            is_leader: false,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: `${userName} has been promoted to co-leader`,
        });
        onTeamUpdated();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to promote member",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error promoting member:", error);
      toast({
        title: "Error",
        description: "Failed to promote member",
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
