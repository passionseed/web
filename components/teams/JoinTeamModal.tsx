"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Crown,
  UserPlus,
  Search,
  Calendar,
  Target,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TeamWithMembers } from "@/types/teams";
import { getClassroomTeams, joinTeam } from "@/lib/supabase/teams";

interface JoinTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userClassrooms: { id: string; name: string; description: string | null }[];
  onTeamJoined: () => void;
}

export function JoinTeamModal({
  open,
  onOpenChange,
  userClassrooms,
  onTeamJoined,
}: JoinTeamModalProps) {
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningTeamId, setJoiningTeamId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (selectedClassroom) {
      loadTeams();
    } else {
      setTeams([]);
    }
  }, [selectedClassroom]);

  const loadTeams = async () => {
    if (!selectedClassroom) return;
    
    setLoading(true);
    try {
      const classroomTeams = await getClassroomTeams(selectedClassroom);
      // Filter out teams the user is already in and inactive teams
      const availableTeams = classroomTeams.filter(
        team => !team.current_user_membership && team.is_active
      );
      setTeams(availableTeams);
    } catch (error) {
      console.error("Error loading teams:", error);
      toast({
        title: "Failed to load teams",
        description: "Could not load teams for this classroom",
        variant: "destructive",
      });
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.team_metadata?.skills?.some(skill => 
      skill.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleJoinTeam = async (teamId: string, teamName: string) => {
    setJoiningTeamId(teamId);
    try {
      await joinTeam({ team_id: teamId });
      
      toast({
        title: "Joined team successfully!",
        description: `Welcome to ${teamName}!`,
      });
      
      onTeamJoined();
    } catch (error: any) {
      console.error("Error joining team:", error);
      
      let errorMessage = "Failed to join team";
      if (error.code === "TEAM_FULL") {
        errorMessage = "This team is full";
      } else if (error.code === "ALREADY_IN_TEAM") {
        errorMessage = "You are already in a team in this classroom";
      } else if (error.code === "TEAM_NOT_FOUND") {
        errorMessage = "Team not found or inactive";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Unable to join team",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setJoiningTeamId("");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getAvailableSpots = (team: TeamWithMembers) => {
    if (!team.max_members) return "Unlimited";
    return team.max_members - team.member_count;
  };

  const hasSpace = (team: TeamWithMembers) => {
    return !team.max_members || team.member_count < team.max_members;
  };

  const resetForm = () => {
    setSelectedClassroom("");
    setSearchQuery("");
    setTeams([]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !joiningTeamId) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Join a Team</DialogTitle>
          <DialogDescription>
            Browse and join existing teams in your classrooms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Classroom Selection */}
          <div>
            <Label htmlFor="classroom">Select Classroom</Label>
            <Select
              value={selectedClassroom}
              onValueChange={setSelectedClassroom}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a classroom to browse teams..." />
              </SelectTrigger>
              <SelectContent>
                {userClassrooms.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          {selectedClassroom && (
            <div>
              <Label htmlFor="search">Search Teams</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, description, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          {/* Teams List */}
          {selectedClassroom && (
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-start space-x-4">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-1/3" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredTeams.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">
                    {teams.length === 0 ? "No Teams Available" : "No Teams Found"}
                  </h3>
                  <p className="text-muted-foreground">
                    {teams.length === 0 
                      ? "There are no joinable teams in this classroom yet."
                      : "Try adjusting your search query."
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Found {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''}
                  </div>
                  
                  {filteredTeams.map((team) => {
                    const teamColor = team.team_metadata?.color || "#6366f1";
                    const spots = getAvailableSpots(team);
                    const canJoin = hasSpace(team);
                    
                    return (
                      <Card key={team.id} className="border-l-4" style={{ borderLeftColor: teamColor }}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                                style={{ backgroundColor: teamColor }}
                              >
                                {team.name[0]}
                              </div>
                              <div>
                                <CardTitle className="text-lg">{team.name}</CardTitle>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                                  <div className="flex items-center">
                                    <Users className="h-4 w-4 mr-1" />
                                    {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                                    {team.max_members && ` / ${team.max_members}`}
                                  </div>
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    Created {formatDate(team.created_at)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <Badge 
                                variant={canJoin ? "secondary" : "destructive"}
                                className="mb-2"
                              >
                                {canJoin ? `${spots} spot${spots !== 1 ? 's' : ''} left` : "Full"}
                              </Badge>
                              <Button
                                onClick={() => handleJoinTeam(team.id, team.name)}
                                disabled={!canJoin || joiningTeamId === team.id}
                                size="sm"
                              >
                                {joiningTeamId === team.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <UserPlus className="h-4 w-4 mr-2" />
                                )}
                                {canJoin ? "Join Team" : "Team Full"}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {/* Description */}
                          {team.description && (
                            <p className="text-sm text-muted-foreground">
                              {team.description}
                            </p>
                          )}

                          {/* Team Leader */}
                          {team.leader && (
                            <div className="flex items-center space-x-2">
                              <Crown className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm">
                                Led by {team.leader.profiles?.full_name || team.leader.profiles?.username}
                              </span>
                            </div>
                          )}

                          {/* Skills */}
                          {team.team_metadata?.skills && team.team_metadata.skills.length > 0 && (
                            <div>
                              <div className="flex items-center text-sm font-medium mb-2">
                                <Target className="h-4 w-4 mr-2" />
                                Skills & Interests
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {team.team_metadata.skills.slice(0, 5).map((skill, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {team.team_metadata.skills.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{team.team_metadata.skills.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Goals */}
                          {team.team_metadata?.goals && (
                            <div>
                              <div className="flex items-center text-sm font-medium mb-1">
                                <Target className="h-4 w-4 mr-2" />
                                Team Goals
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {team.team_metadata.goals}
                              </p>
                            </div>
                          )}

                          {/* Communication Platform */}
                          {team.team_metadata?.communication_platform && (
                            <div>
                              <div className="flex items-center text-sm font-medium mb-1">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Communication
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {team.team_metadata.communication_platform}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={joiningTeamId !== ""}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}