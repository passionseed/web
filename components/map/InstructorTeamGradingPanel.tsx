"use client";

import { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Users, 
  MessageSquare, 
  Calendar,
  HelpCircle,
  User,
  Crown,
  FileText,
  Send,
  MessageCircle
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { MapNode } from "@/types/map";
import {
  getTeamProgressForInstructor,
  updateTeamNodeStatus,
  getTeamMembers,
  clearHelpRequest,
} from "@/lib/supabase/team-progress";
import { FileSubmissionViewer } from "./FileSubmissionViewer";

interface InstructorTeamGradingPanelProps {
  selectedNode: Node<Record<string, unknown> & MapNode> | null;
  mapId: string;
  teamId: string;
  onGradingComplete?: () => void;
}

interface TeamMember {
  user_id: string;
  is_leader: boolean;
  profiles: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface TeamSubmission {
  id: string;
  submitted_at: string;
  grade_status: string;
  text_answer?: string;
  file_urls?: string[];
  quiz_answers?: Record<string, string>;
  metadata?: any;
  submitter: {
    username: string;
    full_name: string | null;
  };
  grade?: {
    grade: string;
    points: number | null;
    feedback: string | null;
  };
}

export function InstructorTeamGradingPanel({
  selectedNode,
  mapId,
  teamId,
  onGradingComplete,
}: InstructorTeamGradingPanelProps) {
  const [teamProgress, setTeamProgress] = useState<Record<string, any>>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamSubmissions, setTeamSubmissions] = useState<TeamSubmission[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [points, setPoints] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const { toast } = useToast();

  const nodeData = selectedNode?.data;
  const assessment = nodeData?.node_assessments?.[0];
  const currentProgress = teamProgress[selectedNode?.id || ""];

  useEffect(() => {
    if (selectedNode && teamId) {
      loadTeamGradingData();
    }
  }, [selectedNode?.id, teamId]);

  const loadTeamGradingData = async () => {
    if (!selectedNode || !teamId) return;

    setIsLoading(true);
    try {
      // Load team progress with instructor details
      const progress = await getTeamProgressForInstructor(mapId, teamId);
      setTeamProgress(progress);

      // Load team members using the new team progress library
      const members = await getTeamMembers(teamId);
      setTeamMembers(members as any); // Convert to expected format

      // Load team submissions for this node's assessment
      if (assessment) {
        await loadTeamSubmissions();
      }

    } catch (error) {
      console.error("Error loading team grading data:", error);
      toast({
        title: "Error loading data",
        description: "Could not load team grading information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamSubmissions = async () => {
    if (!assessment || !teamId) return;

    try {
      const supabase = createClient();
      
      // First get team member user IDs
      const { data: teamMemberIds } = await supabase
        .from("team_memberships")
        .select("user_id")
        .eq("team_id", teamId)
        .is("left_at", null);

      if (!teamMemberIds || teamMemberIds.length === 0) {
        setTeamSubmissions([]);
        return;
      }

      const userIds = teamMemberIds.map(tm => tm.user_id);

      // Get progress IDs for team members on this node
      const { data: progressIds } = await supabase
        .from("student_node_progress")
        .select("id")
        .eq("node_id", selectedNode!.id)
        .in("user_id", userIds);

      if (!progressIds || progressIds.length === 0) {
        setTeamSubmissions([]);
        return;
      }

      const progressIdsList = progressIds.map(p => p.id);

      // Get all submissions from team members for this assessment
      const { data: submissions } = await supabase
        .from("assessment_submissions")
        .select(`
          id,
          submitted_at,
          grade_status,
          text_answer,
          file_urls,
          quiz_answers,
          metadata,
          student_node_progress!inner(
            user_id,
            profiles:user_id(username, full_name)
          ),
          submission_grades(
            grade,
            points,
            feedback
          )
        `)
        .eq("assessment_id", assessment.id)
        .in("progress_id", progressIdsList)
        .order("submitted_at", { ascending: false });

      const processedSubmissions = submissions?.map((sub: any) => ({
        id: sub.id,
        submitted_at: sub.submitted_at,
        grade_status: sub.grade_status,
        text_answer: sub.text_answer,
        file_urls: sub.file_urls,
        quiz_answers: sub.quiz_answers,
        metadata: sub.metadata,
        submitter: sub.student_node_progress.profiles,
        grade: sub.submission_grades?.[0] || null,
      })) || [];

      setTeamSubmissions(processedSubmissions);
    } catch (error) {
      console.error("Error loading team submissions:", error);
    }
  };

  const handleGradeTeam = async () => {
    if (!selectedGrade || !selectedNode) return;

    setIsGrading(true);
    try {
      // Find the best submission (most recent passed or latest submitted)
      const bestSubmission = teamSubmissions.find(sub => 
        sub.grade?.grade === "pass"
      ) || teamSubmissions[0];

      // Update team node status
      await updateTeamNodeStatus(
        teamId, 
        selectedNode.id, 
        selectedGrade as any,
        bestSubmission?.submitter ? 
          teamMembers.find(m => m.profiles?.username === bestSubmission.submitter.username)?.user_id 
          : undefined
      );

      // If we have individual submissions to grade
      if (teamSubmissions.length > 0 && selectedGrade) {
        const supabase = createClient();
        
        // Grade the best/selected submission
        const submissionToGrade = bestSubmission || teamSubmissions[0];
        
        const gradeData = {
          submission_id: submissionToGrade.id,
          grade: selectedGrade === "passed" || selectedGrade === "passed_late" || selectedGrade === "passed_zero_grade" ? "pass" : "fail",
          points: points ? parseFloat(points) : null,
          feedback: feedback.trim() || null,
          graded_by: (await supabase.auth.getUser()).data.user?.id,
        };

        const { error: gradeError } = await supabase
          .from("submission_grades")
          .upsert(gradeData, { onConflict: "submission_id" });

        if (gradeError) {
          console.error("Error grading submission:", gradeError);
        }
      }

      await loadTeamGradingData();
      onGradingComplete?.();
      
      // Clear form
      setSelectedGrade("");
      setFeedback("");
      setPoints("");

      toast({
        title: "Team graded successfully",
        description: `Team status updated to ${selectedGrade}`,
      });

    } catch (error) {
      console.error("Error grading team:", error);
      toast({
        title: "Grading failed",
        description: "Could not update team grade",
        variant: "destructive",
      });
    } finally {
      setIsGrading(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !selectedNode || !teamId) return;

    setIsAddingComment(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Add comment to team progress
      const commentData = {
        team_id: teamId,
        node_id: selectedNode.id,
        instructor_id: user.id,
        comment: comment.trim(),
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("team_progress_comments")
        .insert(commentData);

      if (error) {
        // If table doesn't exist, we'll create the comment as a help request response
        console.warn("Team progress comments table not found, adding as progress note");
        
        // Update team progress with instructor comment
        const { error: updateError } = await supabase
          .from("team_node_progress")
          .upsert({
            team_id: teamId,
            node_id: selectedNode.id,
            instructor_comment: comment.trim(),
            instructor_comment_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "team_id,node_id" });

        if (updateError) {
          throw updateError;
        }
      }

      // Clear comment and reload data
      setComment("");
      await loadTeamGradingData();
      onGradingComplete?.();

      toast({
        title: "Comment added",
        description: "Your comment has been added to the team's progress.",
      });

    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Comment failed",
        description: "Could not add comment to team progress",
        variant: "destructive",
      });
    } finally {
      setIsAddingComment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      not_started: { label: "Not Started", variant: "secondary", icon: Clock },
      assigned: { label: "Assigned", variant: "outline", icon: Users },
      in_progress: { label: "In Progress", variant: "default", icon: Clock },
      submitted: { label: "Submitted", variant: "default", icon: MessageSquare },
      passed: { label: "Passed", variant: "success", icon: CheckCircle },
      passed_late: { label: "Passed (Late)", variant: "warning", icon: CheckCircle },
      passed_zero_grade: { label: "Passed (Zero Grade)", variant: "warning", icon: CheckCircle },
      failed: { label: "Failed", variant: "destructive", icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatQuizAnswer = (answer: string, questionIndex: number) => {
    const questions = assessment?.quiz_questions || [];
    const question = questions[questionIndex];
    
    if (!question) return answer;
    
    // Handle different quiz option formats
    let options: string[] = [];
    if (Array.isArray(question.options)) {
      if (typeof question.options[0] === 'string') {
        options = question.options as unknown as string[];
      } else if (question.options[0] && typeof question.options[0] === 'object' && 'text' in question.options[0]) {
        options = (question.options as unknown as Array<{text: string}>).map(opt => opt.text);
      }
    }
    
    const optionIndex = parseInt(answer);
    return options[optionIndex] || answer;
  };

  if (!selectedNode) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Select a node to view team grading information</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Clock className="h-8 w-8 mx-auto animate-spin mb-4" />
        <p>Loading team grading data...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Team Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Progress Overview
              {currentProgress?.help_requested && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  Help Requested
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Node: {nodeData?.title}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              {getStatusBadge(currentProgress?.status || "not_started")}
              {currentProgress?.completed_at && (
                <span className="text-sm text-muted-foreground">
                  Completed: {new Date(currentProgress.completed_at).toLocaleString()}
                </span>
              )}
            </div>

            {currentProgress?.assigned_to && (
              <div className="text-sm text-muted-foreground mb-2">
                Assigned to: {teamMembers.find(m => m.user_id === currentProgress.assigned_to)?.profiles?.username || "Unknown"}
              </div>
            )}

            {currentProgress?.help_request_message && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="font-medium text-yellow-800 text-sm">Help Request:</p>
                <p className="text-yellow-700 text-sm">{currentProgress.help_request_message}</p>
              </div>
            )}

            {currentProgress?.instructor_comment && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="font-medium text-blue-800 text-sm">Instructor Comment:</p>
                <p className="text-blue-700 text-sm">{currentProgress.instructor_comment}</p>
                {currentProgress?.instructor_comment_at && (
                  <p className="text-xs text-blue-600 mt-1">
                    {new Date(currentProgress.instructor_comment_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{member.profiles?.username || member.profiles?.full_name || "Unknown"}</span>
                    {member.is_leader && (
                      <Crown className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  
                  {/* Individual member progress for this node */}
                  {currentProgress?.member_progress && (
                    <div>
                      {(() => {
                        const memberProgress = currentProgress.member_progress.find(
                          (mp: any) => mp.profiles?.username === member.profiles?.username
                        );
                        return memberProgress ? (
                          <Badge variant="outline" className="text-xs">
                            {memberProgress.status}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Not Started
                          </Badge>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructor Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Add Comment for Team
            </CardTitle>
            <CardDescription>
              Leave a comment or feedback for the team about their progress on this node
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Comment</label>
                <Textarea
                  placeholder="Add a comment for the team about their progress..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                />
              </div>
              
              <Button 
                onClick={handleAddComment}
                disabled={!comment.trim() || isAddingComment}
                variant="outline"
                className="w-full"
              >
                {isAddingComment ? (
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Add Comment
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submissions */}
        {teamSubmissions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Team Submissions ({teamSubmissions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="submissions" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="submissions">Submissions</TabsTrigger>
                  <TabsTrigger value="grading">Grade Team</TabsTrigger>
                </TabsList>
                
                <TabsContent value="submissions" className="space-y-4 mt-4">
                  {teamSubmissions.map((submission, index) => (
                    <div key={submission.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">
                            {submission.submitter.username || submission.submitter.full_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={submission.grade?.grade === "pass" ? "default" : "outline"}>
                            {submission.grade?.grade === "pass" ? "Passed" : 
                             submission.grade?.grade === "fail" ? "Failed" : 
                             "Ungraded"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(submission.submitted_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Submission Content */}
                      {submission.text_answer && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-sm font-medium mb-1">Text Answer:</p>
                          <p className="text-sm">{submission.text_answer}</p>
                        </div>
                      )}

                      {submission.quiz_answers && (
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-sm font-medium mb-2">Quiz Answers:</p>
                          <div className="space-y-1">
                            {Object.entries(submission.quiz_answers).map(([questionId, answer], qIndex) => (
                              <div key={questionId} className="text-sm">
                                <span className="font-medium">Q{qIndex + 1}:</span> {formatQuizAnswer(answer, qIndex)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {submission.file_urls && submission.file_urls.length > 0 && (
                        <div className="bg-green-50 p-3 rounded">
                          <FileSubmissionViewer fileUrls={submission.file_urls} />
                        </div>
                      )}

                      {submission.metadata?.checklist_completion && (
                        <div className="bg-purple-50 p-3 rounded">
                          <p className="text-sm font-medium mb-2">Checklist:</p>
                          <div className="space-y-1">
                            {Object.entries(submission.metadata.checklist_completion).map(([item, completed]: [string, any]) => (
                              <div key={item} className="text-sm flex items-center gap-2">
                                <CheckCircle className={`h-4 w-4 ${completed ? 'text-green-600' : 'text-gray-400'}`} />
                                {item}: {completed ? 'Completed' : 'Incomplete'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Current Grade */}
                      {submission.grade && (
                        <div className="border-t pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Current Grade:</span>
                            <Badge variant={submission.grade.grade === "pass" ? "default" : "destructive"}>
                              {submission.grade.grade === "pass" ? "Pass" : "Fail"}
                              {submission.grade.points !== null && ` (${submission.grade.points} pts)`}
                            </Badge>
                          </div>
                          {submission.grade.feedback && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <strong>Feedback:</strong> {submission.grade.feedback}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="grading" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-900">Quick Comment</span>
                      </div>
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Add a quick comment while grading..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                        {comment.trim() && (
                          <Button 
                            onClick={handleAddComment}
                            disabled={isAddingComment}
                            variant="outline"
                            size="sm"
                          >
                            {isAddingComment ? (
                              <Clock className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3 mr-1" />
                            )}
                            Add Comment
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Team Grade</label>
                      <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="passed">Passed</SelectItem>
                          <SelectItem value="passed_late">Passed (Late)</SelectItem>
                          <SelectItem value="passed_zero_grade">Passed (Zero Grade)</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Points (Optional)</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter points"
                        value={points}
                        onChange={(e) => setPoints(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Grade Feedback</label>
                      <Textarea
                        placeholder="Add specific feedback related to the grade..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This feedback will be attached to the grade and visible to students.
                      </p>
                    </div>

                    <Button 
                      onClick={handleGradeTeam}
                      disabled={!selectedGrade || isGrading}
                      className="w-full"
                    >
                      {isGrading ? (
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Submit Team Grade
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* No submissions state */}
        {teamSubmissions.length === 0 && assessment && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No submissions from team members yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}