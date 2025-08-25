"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Crown,
  User,
  MoreVertical,
  ArrowUpRight,
  UserMinus,
  UserPlus,
  Calendar,
} from "lucide-react";
import { TeamWithMembers } from "@/types/teams";
import { useToast } from "@/hooks/use-toast";
import {
  removeMemberFromTeam,
  updateMemberRole,
  transferTeamLeadership,
} from "@/lib/supabase/teams";

interface TeamMembersPanelProps {
  team: TeamWithMembers;
  onTeamUpdated: () => void;
}

export function TeamMembersPanel({ team, onTeamUpdated }: TeamMembersPanelProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isCurrentUserLeader = team.current_user_membership?.is_leader;
  const currentUserId = team.current_user_membership?.user_id;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handlePromoteMember = async (userId: string, userName: string) => {
    if (!confirm(`Promote ${userName} to co-leader?`)) return;

    setLoading(true);
    try {
      await updateMemberRole(team.id, userId, {
        role: "co-leader",
        is_leader: false,
      });
      
      toast({
        title: "Member promoted",
        description: `${userName} is now a co-leader`,
      });
      onTeamUpdated();
    } catch (error: any) {
      console.error("Error promoting member:", error);
      toast({
        title: "Failed to promote member",
        description: error.message || "Could not promote member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransferLeadership = async (userId: string, userName: string) => {
    if (!confirm(`Transfer team leadership to ${userName}? You will become a regular member.`)) {
      return;
    }

    setLoading(true);
    try {
      await transferTeamLeadership(team.id, userId);
      
      toast({
        title: "Leadership transferred",
        description: `${userName} is now the team leader`,
      });
      onTeamUpdated();
    } catch (error: any) {
      console.error("Error transferring leadership:", error);
      toast({
        title: "Failed to transfer leadership",
        description: error.message || "Could not transfer leadership",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Remove ${userName} from the team?`)) return;

    setLoading(true);
    try {
      await removeMemberFromTeam(team.id, userId);
      
      toast({
        title: "Member removed",
        description: `${userName} has been removed from the team`,
      });
      onTeamUpdated();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Failed to remove member",
        description: error.message || "Could not remove member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Users className="h-5 w-5 mr-2" />
          Team Members ({team.member_count})
        </CardTitle>
        {team.max_members && (
          <p className="text-sm text-muted-foreground">
            {team.max_members - team.member_count} spots available
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {team.team_memberships.map((membership) => {
            const isCurrentUser = membership.user_id === currentUserId;
            const profile = membership.profiles;
            
            return (
              <div
                key={membership.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {profile?.full_name?.[0] || profile?.username?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {membership.is_leader && (
                      <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-sm truncate">
                        {profile?.full_name || profile?.username}
                        {isCurrentUser && (
                          <span className="text-muted-foreground"> (You)</span>
                        )}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {membership.role}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center text-xs text-muted-foreground space-x-2">
                      <span>@{profile?.username}</span>
                      <span>•</span>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(membership.joined_at)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Member Actions for Leaders */}
                {isCurrentUserLeader && !isCurrentUser && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loading}
                        className="h-8 w-8 p-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Transfer Leadership */}
                      {!membership.is_leader && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleTransferLeadership(
                              membership.user_id,
                              profile?.full_name || profile?.username || "Unknown"
                            )
                          }
                        >
                          <Crown className="h-4 w-4 mr-2" />
                          Make Leader
                        </DropdownMenuItem>
                      )}

                      {/* Promote to Co-Leader */}
                      {!membership.is_leader && membership.role === "member" && (
                        <DropdownMenuItem
                          onClick={() =>
                            handlePromoteMember(
                              membership.user_id,
                              profile?.full_name || profile?.username || "Unknown"
                            )
                          }
                        >
                          <ArrowUpRight className="h-4 w-4 mr-2" />
                          Promote to Co-Leader
                        </DropdownMenuItem>
                      )}

                      {/* Remove Member */}
                      {!membership.is_leader && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleRemoveMember(
                                membership.user_id,
                                profile?.full_name || profile?.username || "Unknown"
                              )
                            }
                            className="text-red-600 focus:text-red-600"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Remove from Team
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>

        {/* Invite Members Button (for leaders) */}
        {isCurrentUserLeader && (!team.max_members || team.member_count < team.max_members) && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button variant="outline" className="w-full" disabled>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Members
              <Badge variant="secondary" className="ml-2 text-xs">
                Coming Soon
              </Badge>
            </Button>
          </div>
        )}

        {/* Team Full */}
        {team.max_members && team.member_count >= team.max_members && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-center text-sm text-muted-foreground">
              Team is at full capacity ({team.max_members} members)
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}