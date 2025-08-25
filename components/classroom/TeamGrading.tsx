"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/utils/supabase/client";
import { Users, User, Clock, CheckCircle } from "lucide-react";

interface TeamSubmission {
  submission_id: string;
  user_id: string;
  username: string;
  full_name: string;
  team_id: string;
  team_name: string;
  node_id: string;
  node_title: string;
  assessment_type: string;
  text_answer?: string;
  submitted_at: string;
  grade?: "pass" | "fail";
  points_awarded?: number;
  comments?: string;
  progress_id: string;
}

interface TeamGradingProps {
  classroomId: string;
  onGraded?: () => void;
}

export function TeamGrading({ classroomId, onGraded }: TeamGradingProps) {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<TeamSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [bulkGrade, setBulkGrade] = useState<"pass" | "fail">("pass");
  const [bulkPoints, setBulkPoints] = useState<number>(100);
  const [bulkComments, setBulkComments] = useState<string>("Good work!");
  const [individualGrades, setIndividualGrades] = useState<Record<string, {
    grade: "pass" | "fail";
    points: number;
    comments: string;
  }>>({});

  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    loadTeams();
  }, [classroomId]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const { data: teamsData, error } = await supabase
        .from("classroom_teams")
        .select(`
          id,
          name,
          description,
          team_memberships!inner (
            user_id,
            profiles (
              username,
              full_name
            )
          )
        `)
        .eq("classroom_id", classroomId)
        .eq("is_active", true);

      if (error) throw error;
      setTeams(teamsData || []);
    } catch (error) {
      console.error("Error loading teams:", error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTeamSubmissions = async (teamId: string) => {
    setLoading(true);
    try {
      // Get team members
      const { data: members, error: membersError } = await supabase
        .from("team_memberships")
        .select("user_id")
        .eq("team_id", teamId);

      if (membersError) throw membersError;

      const memberIds = members?.map(m => m.user_id) || [];

      if (memberIds.length === 0) {
        setSubmissions([]);
        return;
      }

      // Get submissions from team members
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("assessment_submissions")
        .select(`
          id,
          user_id,
          node_id,
          assessment_type,
          text_answer,
          submitted_at,
          student_node_progress!inner (
            id,
            user_id,
            node_id,
            map_nodes!inner (
              title,
              map_id,
              learning_maps!inner (
                classroom_id
              )
            ),
            profiles (
              username,
              full_name
            )
          ),
          submission_grades (
            grade,
            points_awarded,
            comments
          )
        `)
        .in("user_id", memberIds)
        .eq("student_node_progress.map_nodes.learning_maps.classroom_id", classroomId)
        .order("submitted_at", { ascending: false });

      if (submissionsError) throw submissionsError;

      const formattedSubmissions: TeamSubmission[] = (submissionsData || []).map(sub => ({
        submission_id: sub.id,
        user_id: sub.user_id,
        username: sub.student_node_progress.profiles?.username || "Unknown",
        full_name: sub.student_node_progress.profiles?.full_name || "",
        team_id: teamId,
        team_name: selectedTeam?.name || "",
        node_id: sub.node_id,
        node_title: sub.student_node_progress.map_nodes?.title || "Unknown Node",
        assessment_type: sub.assessment_type,
        text_answer: sub.text_answer,
        submitted_at: sub.submitted_at,
        grade: sub.submission_grades?.[0]?.grade,
        points_awarded: sub.submission_grades?.[0]?.points_awarded,
        comments: sub.submission_grades?.[0]?.comments,
        progress_id: sub.student_node_progress.id
      }));

      setSubmissions(formattedSubmissions);

      // Initialize individual grades
      const initialGrades: Record<string, any> = {};
      formattedSubmissions.forEach((sub: TeamSubmission) => {
        if (!sub.grade) {
          initialGrades[sub.submission_id] = {
            grade: "pass",
            points: 100,
            comments: ""
          };
        }
      });
      setIndividualGrades(initialGrades);

    } catch (error) {
      console.error("Error loading team submissions:", error);
      toast({
        title: "Error",
        description: "Failed to load team submissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIndividualGrade = async (submissionId: string, progressId: string) => {
    const gradeData = individualGrades[submissionId];
    if (!gradeData) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.rpc("grade_individual_submission", {
        p_submission_id: submissionId,
        p_grade: gradeData.grade,
        p_comments: gradeData.comments,
        p_grader_id: user.id,
        p_progress_id: progressId,
        p_points_awarded: gradeData.points
      });

      if (error) throw error;

      toast({
        title: "Graded",
        description: "Submission graded successfully"
      });

      onGraded?.();
      if (selectedTeam) {
        loadTeamSubmissions(selectedTeam.id);
      }
    } catch (error: any) {
      console.error("Error grading submission:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateIndividualGrade = (submissionId: string, field: string, value: any) => {
    setIndividualGrades(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: value
      }
    }));
  };

  const ungradedSubmissions = submissions.filter(s => !s.grade);
  const gradedSubmissions = submissions.filter(s => s.grade);

  if (loading && !selectedTeam) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!selectedTeam ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Team Grading</span>
            </CardTitle>
            <CardDescription>
              Select a team to grade submissions from team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((team) => (
                  <Card 
                    key={team.id} 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setSelectedTeam(team);
                      loadTeamSubmissions(team.id);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{team.name}</h4>
                          <p className="text-sm text-gray-600">
                            {team.team_memberships?.length || 0} members
                          </p>
                          {team.description && (
                            <p className="text-sm text-gray-500 mt-1 truncate">
                              {team.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="bg-blue-50">
                            View Submissions
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No teams found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create teams in the Teams tab to start grading team submissions.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedTeam(null);
                setSubmissions([]);
              }}
              className="flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Teams</span>
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Grading: {selectedTeam.name}</h2>
              <p className="text-gray-600">
                {submissions.length} total submissions, {ungradedSubmissions.length} ungraded
              </p>
            </div>
          </div>

          <Tabs defaultValue="ungraded" className="space-y-6">
            <TabsList>
              <TabsTrigger value="ungraded" className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Ungraded ({ungradedSubmissions.length})</span>
              </TabsTrigger>
              <TabsTrigger value="graded" className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Graded ({gradedSubmissions.length})</span>
              </TabsTrigger>
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Team Overview</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ungraded" className="space-y-4">
              {ungradedSubmissions.length > 0 ? (
                ungradedSubmissions.map((submission) => (
                  <Card key={submission.submission_id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">
                              {submission.full_name || submission.username}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {submission.node_title} • {submission.assessment_type}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-orange-100">
                          Ungraded
                        </Badge>
                      </div>

                      {submission.text_answer && (
                        <div className="mb-4">
                          <Label>Answer</Label>
                          <div className="p-3 bg-gray-50 rounded text-sm mt-1">
                            {submission.text_answer}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label>Grade</Label>
                          <RadioGroup 
                            value={individualGrades[submission.submission_id]?.grade || "pass"}
                            onValueChange={(v: "pass" | "fail") => 
                              updateIndividualGrade(submission.submission_id, "grade", v)
                            }
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="pass" id={`pass-${submission.submission_id}`} />
                              <Label htmlFor={`pass-${submission.submission_id}`} className="cursor-pointer">
                                Pass
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="fail" id={`fail-${submission.submission_id}`} />
                              <Label htmlFor={`fail-${submission.submission_id}`} className="cursor-pointer">
                                Fail
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div className="space-y-2">
                          <Label>Points</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={individualGrades[submission.submission_id]?.points || 100}
                            onChange={(e) => 
                              updateIndividualGrade(submission.submission_id, "points", Number(e.target.value))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Comments</Label>
                          <Input
                            value={individualGrades[submission.submission_id]?.comments || ""}
                            onChange={(e) => 
                              updateIndividualGrade(submission.submission_id, "comments", e.target.value)
                            }
                            placeholder="Feedback for student"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={() => handleIndividualGrade(submission.submission_id, submission.progress_id)}
                        className="w-full"
                      >
                        Grade This Submission
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">All caught up!</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No ungraded submissions from this team.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="graded" className="space-y-4">
              {gradedSubmissions.length > 0 ? (
                gradedSubmissions.map((submission) => (
                  <Card key={submission.submission_id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">
                              {submission.full_name || submission.username}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {submission.node_title}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge 
                            className={
                              submission.grade === "pass" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {submission.grade?.toUpperCase()}
                          </Badge>
                          <div className="text-sm text-gray-600">
                            {submission.points_awarded !== null ? `${submission.points_awarded} pts` : 'No points'}
                          </div>
                        </div>
                      </div>
                      
                      {submission.comments && (
                        <div className="mt-2 text-sm text-gray-600">
                          "{submission.comments}"
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No graded submissions</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Graded submissions from this team will appear here.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Team Performance Overview</CardTitle>
                  <CardDescription>
                    Summary of {selectedTeam.name} submission activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{selectedTeam.team_memberships?.length || 0}</div>
                      <div className="text-sm text-gray-600">Team Members</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{submissions.length}</div>
                      <div className="text-sm text-gray-600">Total Submissions</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{ungradedSubmissions.length}</div>
                      <div className="text-sm text-gray-600">Pending Grading</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {submissions.length > 0 ? Math.round((gradedSubmissions.length / submissions.length) * 100) : 0}%
                      </div>
                      <div className="text-sm text-gray-600">Graded</div>
                    </div>
                  </div>

                  {submissions.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-4">Recent Activity</h4>
                      <div className="space-y-2">
                        {submissions.slice(0, 5).map((submission) => (
                          <div key={submission.submission_id} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{submission.username}</span>
                            <span className="text-gray-600">
                              {submission.node_title} • {new Date(submission.submitted_at).toLocaleDateString()}
                            </span>
                            <Badge variant="outline" size="sm">
                              {submission.grade || "Ungraded"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}