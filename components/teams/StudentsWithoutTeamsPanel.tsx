"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { TeamWithMembers } from "@/types/teams";
import { getStudentsWithoutTeams } from "@/lib/supabase/teams";
import { useToast } from "@/hooks/use-toast";

interface StudentWithoutTeam {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface StudentsWithoutTeamsPanelProps {
  classroomId: string;
  teams: TeamWithMembers[];
  onStudentAssigned: () => void;
}

export function StudentsWithoutTeamsPanel({
  classroomId,
  teams,
  onStudentAssigned,
}: StudentsWithoutTeamsPanelProps) {
  const [students, setStudents] = useState<StudentWithoutTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [selectedTeams, setSelectedTeams] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadStudents();
  }, [classroomId]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await getStudentsWithoutTeams(classroomId);
      setStudents(data);
    } catch (error) {
      console.error("Error loading students:", error);
      toast({
        title: "Error",
        description: "Failed to load students without teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteToTeam = async (userId: string) => {
    const teamId = selectedTeams[userId];
    if (!teamId) {
      toast({
        title: "No team selected",
        description: "Please select a team first",
        variant: "destructive",
      });
      return;
    }

    try {
      setAssigning((prev) => ({ ...prev, [userId]: true }));

      const response = await fetch("/api/teams/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          user_ids: [userId],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to invite student");
      }

      toast({
        title: "Success",
        description: "Student has been invited to the team",
      });

      // Refresh students list
      await loadStudents();
      onStudentAssigned();
    } catch (error: any) {
      console.error("Error inviting student:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to invite student to team",
        variant: "destructive",
      });
    } finally {
      setAssigning((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const availableTeams = teams.filter(
    (team) => !team.max_members || team.member_count < team.max_members
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (students.length === 0) {
    return (
      <Card className="border-dashed border-green-200 bg-green-50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="p-3 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            All Students Assigned
          </h3>
          <p className="text-sm text-green-700 text-center max-w-sm">
            Great! All students in this classroom have been assigned to teams.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <div>
              <CardTitle>Students Without Teams</CardTitle>
              <CardDescription className="text-orange-700">
                {students.length} {students.length === 1 ? "student" : "students"}{" "}
                need to be assigned to teams
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {availableTeams.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Available Teams</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                All teams are at capacity. Create new teams or increase the
                capacity of existing teams to assign these students.
              </p>
              <Button>Create New Team</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {students.map((student) => (
            <Card key={student.user_id}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Student Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar>
                      <AvatarImage src={student.avatar_url || ""} />
                      <AvatarFallback>
                        {student.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {student.full_name || student.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{student.username}
                      </p>
                    </div>
                  </div>

                  {/* Team Selection and Invite */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedTeams[student.user_id] || ""}
                      onValueChange={(value) =>
                        setSelectedTeams((prev) => ({
                          ...prev,
                          [student.user_id]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{team.name}</span>
                              <Badge
                                variant="outline"
                                className="ml-2 text-xs"
                              >
                                {team.member_count}
                                {team.max_members ? `/${team.max_members}` : ""}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleInviteToTeam(student.user_id)}
                      disabled={
                        !selectedTeams[student.user_id] ||
                        assigning[student.user_id]
                      }
                    >
                      {assigning[student.user_id] ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Inviting...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
