"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Plus,
  UserPlus,
  BookOpen,
  Crown,
  Calendar,
  AlertCircle,
  Settings,
  GitFork,
} from "lucide-react";
import { TeamWithMembers } from "@/types/teams";
import { TeamOverviewCard } from "./TeamOverviewCard";
import { TeamMapsPanel } from "./TeamMapsPanel";
import { TeamMembersPanel } from "./TeamMembersPanel";
import { CreateTeamModal } from "./CreateTeamModal";
import { JoinTeamModal } from "./JoinTeamModal";

interface UserClassroom {
  id: string;
  name: string;
  description: string | null;
}

interface TeamMap {
  team_map_id: string;
  map_id: string;
  original_map_id: string;
  team_id: string;
  team_name: string;
  team_description: string | null;
  map_title: string;
  map_description: string | null;
  original_map_title: string;
  created_by: string;
  created_at: string;
  forked_at: string;
  node_count: number;
  avg_difficulty: number;
  total_assessments: number;
  metadata: any;
}

interface StudentTeamDashboardProps {
  userId: string;
  userClassrooms: UserClassroom[];
  userTeams: TeamWithMembers[];
  teamMaps: TeamMap[];
}

export function StudentTeamDashboard({ 
  userId, 
  userClassrooms, 
  userTeams, 
  teamMaps 
}: StudentTeamDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [joinTeamOpen, setJoinTeamOpen] = useState(false);
  const { toast } = useToast();

  const handleTeamCreated = () => {
    setCreateTeamOpen(false);
    toast({
      title: "Team created successfully",
      description: "Your new team has been created!",
    });
  };

  const handleTeamJoined = () => {
    setJoinTeamOpen(false);
    toast({
      title: "Joined team successfully",
      description: "Welcome to your new team!",
    });
  };

  const handleTeamUpdated = () => {
    // This would typically trigger a page refresh or data refetch
    // For now, we'll just show a toast
    toast({
      title: "Team updated",
      description: "Team information has been updated",
    });
  };


  const currentTeam = userTeams[0]; // Assume one team per user for now
  const isLeader = currentTeam?.current_user_membership?.is_leader;
  const teamMapsForCurrentTeam = teamMaps.filter(
    map => map.team_id === currentTeam?.id
  );

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        {!currentTeam && (
          <>
            <Button
              onClick={() => setCreateTeamOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
            <Button
              variant="outline"
              onClick={() => setJoinTeamOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Join Team
            </Button>
          </>
        )}
        
        {currentTeam && isLeader && (
          <Button
            variant="outline"
            onClick={() => setCreateTeamOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Team Settings
          </Button>
        )}
      </div>

      {/* Team Overview */}
      {currentTeam ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Team Info */}
          <div className="lg:col-span-2 space-y-6">
            <TeamOverviewCard
              team={currentTeam}
              onTeamUpdated={handleTeamUpdated}
            />
            
            {teamMapsForCurrentTeam.length > 0 && (
              <TeamMapsPanel
                teamMaps={teamMapsForCurrentTeam}
                onMapsUpdated={() => {
                  // TODO: Implement team maps refresh logic
                  console.log("Team maps updated - refresh needed");
                }}
              />
            )}
          </div>

          {/* Team Members Sidebar */}
          <div className="space-y-6">
            <TeamMembersPanel
              team={currentTeam}
              onTeamUpdated={handleTeamUpdated}
            />
          </div>
        </div>
      ) : (
        /* No Team State */
        <div className="text-center py-16">
          <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent max-w-2xl mx-auto">
            <CardHeader className="pb-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">No Team Yet</CardTitle>
              <p className="text-muted-foreground text-base mt-2">
                You're not part of any team yet. Create a new team or join an existing one to start collaborating on learning maps.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => setCreateTeamOpen(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Team
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setJoinTeamOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Join Existing Team
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Teams allow you to collaborate on learning maps, share progress, and work together on assessments.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modals */}
      <CreateTeamModal
        open={createTeamOpen}
        onOpenChange={setCreateTeamOpen}
        userClassrooms={userClassrooms}
        onTeamCreated={handleTeamCreated}
      />

      <JoinTeamModal
        open={joinTeamOpen}
        onOpenChange={setJoinTeamOpen}
        userClassrooms={userClassrooms}
        onTeamJoined={handleTeamJoined}
      />
    </div>
  );
}
