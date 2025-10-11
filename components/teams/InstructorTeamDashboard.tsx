"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  UsersRound,
  UserX,
  BarChart3,
  Plus,
  Search,
  Filter,
} from "lucide-react";
import { TeamWithMembers, TeamStats } from "@/types/teams";
import { AllTeamsGrid } from "./AllTeamsGrid";
import { TeamStatsCard } from "./TeamStatsCard";
import { StudentsWithoutTeamsPanel } from "./StudentsWithoutTeamsPanel";
import { CreateTeamModal } from "./CreateTeamModal";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface UserClassroom {
  id: string;
  name: string;
  description: string | null;
  role: string;
}

interface ClassroomData {
  classroom: UserClassroom;
  teams: TeamWithMembers[];
  teamMaps: any[];
  stats: TeamStats;
}

interface InstructorTeamDashboardProps {
  userId: string;
  userRole: string;
  classrooms: UserClassroom[];
  classroomData: ClassroomData[];
}

export function InstructorTeamDashboard({
  userId,
  userRole,
  classrooms,
  classroomData,
}: InstructorTeamDashboardProps) {
  const [selectedClassroom, setSelectedClassroom] = useState<string>(
    classrooms[0]?.id || ""
  );
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const currentData =
    classroomData.find((d) => d.classroom.id === selectedClassroom) ||
    classroomData[0];
  const currentClassroom = currentData?.classroom;
  const teams = currentData?.teams || [];
  const stats = currentData?.stats || {
    total_teams: 0,
    active_teams: 0,
    average_team_size: 0,
    teams_at_capacity: 0,
    students_in_teams: 0,
    students_without_teams: 0,
    team_size_distribution: {},
  };

  // Calculate aggregate stats
  const aggregateStats = classroomData.reduce(
    (acc, data) => {
      return {
        totalTeams: acc.totalTeams + data.stats.total_teams,
        totalStudentsInTeams:
          acc.totalStudentsInTeams + data.stats.students_in_teams,
        totalStudentsWithoutTeams:
          acc.totalStudentsWithoutTeams + data.stats.students_without_teams,
        avgTeamSize:
          acc.avgTeamSize +
          data.stats.average_team_size / classroomData.length,
      };
    },
    {
      totalTeams: 0,
      totalStudentsInTeams: 0,
      totalStudentsWithoutTeams: 0,
      avgTeamSize: 0,
    }
  );

  const handleTeamCreated = () => {
    setCreateTeamOpen(false);
    toast({
      title: "Team created successfully",
      description: "The new team has been created",
    });
    router.refresh();
  };

  const handleTeamUpdated = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage teams, monitor collaboration, and track student participation
          </p>
        </div>
        <Button onClick={() => setCreateTeamOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats.totalTeams}</div>
            <p className="text-xs text-muted-foreground">
              Across {classrooms.length} classroom{classrooms.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Students in Teams
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregateStats.totalStudentsInTeams}
            </div>
            <p className="text-xs text-muted-foreground">
              Active team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Without Teams
            </CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregateStats.totalStudentsWithoutTeams}
            </div>
            <p className="text-xs text-muted-foreground">
              Need team placement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Team Size</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregateStats.avgTeamSize.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Members per team</p>
          </CardContent>
        </Card>
      </div>

      {/* Classroom Selector */}
      {classrooms.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {classrooms.map((classroom) => (
            <Button
              key={classroom.id}
              variant={
                selectedClassroom === classroom.id ? "default" : "outline"
              }
              size="sm"
              onClick={() => setSelectedClassroom(classroom.id)}
            >
              {classroom.name}
            </Button>
          ))}
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="teams" className="space-y-6">
        <TabsList>
          <TabsTrigger value="teams">
            <UsersRound className="h-4 w-4 mr-2" />
            All Teams
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="unassigned">
            <UserX className="h-4 w-4 mr-2" />
            Unassigned Students
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          <AllTeamsGrid
            teams={teams}
            classroomId={currentClassroom?.id || ""}
            userRole={userRole}
            onTeamUpdated={handleTeamUpdated}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <TeamStatsCard stats={stats} classroomName={currentClassroom?.name || ""} />
        </TabsContent>

        <TabsContent value="unassigned" className="space-y-4">
          <StudentsWithoutTeamsPanel
            classroomId={currentClassroom?.id || ""}
            teams={teams}
            onStudentAssigned={handleTeamUpdated}
          />
        </TabsContent>
      </Tabs>

      {/* Create Team Modal */}
      <CreateTeamModal
        open={createTeamOpen}
        onOpenChange={setCreateTeamOpen}
        userClassrooms={classrooms}
        onTeamCreated={handleTeamCreated}
      />
    </div>
  );
}
