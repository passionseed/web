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
import {
  Users,
  Crown,
  Calendar,
  Settings,
  LogOut,
  MoreVertical,
  User,
  Target,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { TeamWithMembers } from "@/types/teams";
import { useToast } from "@/hooks/use-toast";
import { leaveTeam } from "@/lib/supabase/teams";
import { TeamDetailsModal } from "@/components/classroom/TeamDetailsModal";

interface TeamOverviewCardProps {
  team: TeamWithMembers;
  onTeamUpdated: () => void;
}

export function TeamOverviewCard({ team, onTeamUpdated }: TeamOverviewCardProps) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isLeader = team.current_user_membership?.is_leader;
  const userMembership = team.current_user_membership;
  const teamColor = team.team_metadata?.color || "#6366f1";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleLeaveTeam = async () => {
    if (!confirm("Are you sure you want to leave this team?")) {
      return;
    }

    setLoading(true);
    try {
      await leaveTeam(team.id);
      toast({
        title: "Left team successfully",
        description: "You have left the team",
      });
      onTeamUpdated();
    } catch (error: any) {
      console.error("Error leaving team:", error);
      
      let errorMessage = "Failed to leave team";
      if (error.code === "LEAVE_TEAM") {
        errorMessage = "Team leaders must transfer leadership before leaving";
      }
      
      toast({
        title: "Unable to leave team",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-l-4" style={{ borderLeftColor: teamColor }}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                {team.team_metadata?.avatar_url ? (
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={team.team_metadata.avatar_url} alt={team.name} />
                    <AvatarFallback>{team.name[0]}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: teamColor }}
                  >
                    {team.name[0]}
                  </div>
                )}
                {isLeader && (
                  <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500" />
                )}
              </div>
              
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {team.name}
                  <Badge variant={team.is_active ? "default" : "secondary"}>
                    {team.is_active ? "Active" : "Inactive"}
                  </Badge>
                </CardTitle>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Created {formatDate(team.created_at)}
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowDetailsModal(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  View Team Details
                </DropdownMenuItem>
                
                {isLeader && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Team Settings
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLeaveTeam}
                  disabled={loading}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {isLeader ? "Transfer Leadership & Leave" : "Leave Team"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          {team.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {team.description}
            </p>
          )}

          {/* Team Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-border">
            <div className="text-center">
              <div className="text-lg font-semibold">{team.member_count}</div>
              <div className="text-xs text-muted-foreground">
                {team.max_members ? `of ${team.max_members}` : ""}
              </div>
              <div className="text-xs text-muted-foreground">Members</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold">
                {team.team_memberships.filter(m => m.is_leader).length}
              </div>
              <div className="text-xs text-muted-foreground">Leaders</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold">
                {userMembership?.role || "Member"}
              </div>
              <div className="text-xs text-muted-foreground">Your Role</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold">
                {formatDate(userMembership?.joined_at || team.created_at)}
              </div>
              <div className="text-xs text-muted-foreground">Joined</div>
            </div>
          </div>

          {/* Team Metadata */}
          {(team.team_metadata?.skills || team.team_metadata?.goals) && (
            <div className="space-y-3">
              {/* Skills */}
              {team.team_metadata.skills && team.team_metadata.skills.length > 0 && (
                <div>
                  <div className="flex items-center text-sm font-medium mb-2">
                    <Target className="h-4 w-4 mr-2" />
                    Skills & Interests
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {team.team_metadata.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Goals */}
              {team.team_metadata.goals && (
                <div>
                  <div className="flex items-center text-sm font-medium mb-2">
                    <Target className="h-4 w-4 mr-2" />
                    Team Goals
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {team.team_metadata.goals}
                  </p>
                </div>
              )}

              {/* Communication Platform */}
              {team.team_metadata.communication_platform && (
                <div>
                  <div className="flex items-center text-sm font-medium mb-2">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Communication
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {team.team_metadata.communication_platform}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={() => setShowDetailsModal(true)}
              variant="outline"
              className="flex-1"
            >
              <Users className="h-4 w-4 mr-2" />
              View Details
            </Button>
            
            {isLeader && (
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Details Modal */}
      <TeamDetailsModal
        team={team}
        classroomId={team.classroom_id}
        userRole="student"
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        onTeamUpdated={onTeamUpdated}
      />
    </>
  );
}