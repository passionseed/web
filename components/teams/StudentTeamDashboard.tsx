"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  UserPlus,
  BookOpen,
  Search,
  Compass,
} from "lucide-react";
import { TeamWithMembers } from "@/types/teams";
import { TeamOverviewCard } from "./TeamOverviewCard";
import { TeamMapsPanel } from "./TeamMapsPanel";
import { TeamMembersPanel } from "./TeamMembersPanel";
import { CreateTeamModal } from "./CreateTeamModal";
import { JoinTeamModal } from "./JoinTeamModal";
import { AllTeamsGrid } from "./AllTeamsGrid";

interface UserClassroom {
  id: string;
  name: string;
  description: string | null;
  role: string;
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
  allTeams: TeamWithMembers[];
  teamMaps: TeamMap[];
}

export function StudentTeamDashboard({
  userId,
  userClassrooms,
  userTeams,
  allTeams,
  teamMaps,
}: StudentTeamDashboardProps) {
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [joinTeamOpen, setJoinTeamOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleTeamCreated = () => {
    setCreateTeamOpen(false);
    toast({
      title: "Team created successfully",
      description: "Your new team has been created!",
    });
    router.refresh();
  };

  const handleTeamJoined = () => {
    setJoinTeamOpen(false);
    toast({
      title: "Joined team successfully",
      description: "Welcome to your new team!",
    });
    router.refresh();
  };

  const handleTeamUpdated = () => {
    router.refresh();
  };

  // Find available teams (teams user is NOT in)
  const userTeamIds = userTeams.map((t) => t.id);
  // Optimization: Use Set for O(1) lookups instead of Array.includes which is O(N)
  const userTeamIdsSet = new Set(userTeamIds);
  const availableTeams = allTeams.filter((t) => !userTeamIdsSet.has(t.id));

  // Get teams with open spots
  const teamsWithOpenSpots = availableTeams.filter(
    (team) => !team.max_members || team.member_count < team.max_members
  );

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      {userTeams.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Teams</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userTeams.length}</div>
              <p className="text-xs text-muted-foreground">
                Active team {userTeams.length === 1 ? "membership" : "memberships"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Maps</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMaps.length}</div>
              <p className="text-xs text-muted-foreground">
                Collaborative learning maps
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Teams</CardTitle>
              <Compass className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamsWithOpenSpots.length}</div>
              <p className="text-xs text-muted-foreground">
                Teams you can join
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {userTeams.length > 0 ? (
        <Tabs defaultValue="my-teams" className="space-y-6">
          <TabsList>
            <TabsTrigger value="my-teams">
              <Users className="h-4 w-4 mr-2" />
              My Teams
            </TabsTrigger>
            <TabsTrigger value="browse">
              <Search className="h-4 w-4 mr-2" />
              Browse Teams
              {teamsWithOpenSpots.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {teamsWithOpenSpots.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-teams" className="space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => setCreateTeamOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
              <Button variant="outline" onClick={() => setJoinTeamOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Join Team
              </Button>
            </div>

            {/* User Teams */}
            <div className="space-y-8">
              {userTeams.map((team) => {
                const isLeader = team.current_user_membership?.is_leader;
                const teamMapsForTeam = teamMaps.filter(
                  (map) => map.team_id === team.id
                );

                return (
                  <div key={team.id} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Main Team Info */}
                      <div className="lg:col-span-2 space-y-6">
                        <TeamOverviewCard
                          team={team}
                          onTeamUpdated={handleTeamUpdated}
                        />

                        {teamMapsForTeam.length > 0 && (
                          <TeamMapsPanel
                            teamMaps={teamMapsForTeam}
                            onMapsUpdated={handleTeamUpdated}
                          />
                        )}
                      </div>

                      {/* Team Members Sidebar */}
                      <div className="space-y-6">
                        <TeamMembersPanel
                          team={team}
                          onTeamUpdated={handleTeamUpdated}
                        />
                      </div>
                    </div>

                    {/* Divider between teams */}
                    {userTeams.length > 1 &&
                      userTeams.indexOf(team) < userTeams.length - 1 && (
                        <div className="border-t my-8" />
                      )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="browse" className="space-y-4">
            {availableTeams.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Available Teams</h3>
                    <p className="text-sm text-muted-foreground">
                      Discover and join teams across your classrooms
                    </p>
                  </div>
                  <Button onClick={() => setJoinTeamOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join Team
                  </Button>
                </div>
                <AllTeamsGrid
                  teams={availableTeams}
                  classroomId={userClassrooms[0]?.id || ""}
                  userRole="student"
                  onTeamUpdated={handleTeamUpdated}
                />
              </>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Teams Available</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                    You're already in all available teams, or all teams are at capacity.
                  </p>
                  <Button onClick={() => setCreateTeamOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Team
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
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
                You're not part of any team yet. Create a new team or join an
                existing one to start collaborating on learning maps.
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
                Teams allow you to collaborate on learning maps, share progress,
                and work together on assessments.
              </p>

              {/* Show available teams */}
              {teamsWithOpenSpots.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm font-medium mb-4">
                    {teamsWithOpenSpots.length} team
                    {teamsWithOpenSpots.length === 1 ? "" : "s"} available to join
                  </p>
                  <AllTeamsGrid
                    teams={teamsWithOpenSpots.slice(0, 6)}
                    classroomId={userClassrooms[0]?.id || ""}
                    userRole="student"
                    onTeamUpdated={handleTeamUpdated}
                  />
                </div>
              )}
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
