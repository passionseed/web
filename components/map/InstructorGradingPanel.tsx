"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  GraduationCap,
  Users,
  User,
  RefreshCw,
  Eye,
  MessageSquare,
  Users2,
} from "lucide-react";
import { MapNode, SubmissionGrade } from "@/types/map";
import {
  getSubmissionsForMap,
  SubmissionWithDetails,
  gradeSubmission,
} from "@/lib/supabase/grading";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface InstructorGradingPanelProps {
  mapId: string;
  selectedNode?: any;
  userId: string;
  onGradingComplete?: () => void;
}

export function InstructorGradingPanel({
  mapId,
  selectedNode,
  userId,
  onGradingComplete,
}: InstructorGradingPanelProps) {
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionWithDetails | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const { toast } = useToast();

  // Filter submissions by selected node and team filter
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesNode =
      !selectedNode || sub.node_assessments?.map_nodes?.id === selectedNode.id;
    const isTeamSubmission = sub.metadata?.team_id !== undefined;

    const matchesTeam =
      teamFilter === "all" ||
      (teamFilter === "team" && isTeamSubmission) ||
      (teamFilter === "individual" && !isTeamSubmission);

    return matchesNode && matchesTeam;
  });

  // Group submissions by status
  const pendingSubmissions = filteredSubmissions.filter(
    (sub) => sub.submission_grades.length === 0
  );
  const gradedSubmissions = filteredSubmissions.filter(
    (sub) => sub.submission_grades.length > 0
  );

  useEffect(() => {
    loadSubmissions();

    // Set up periodic refresh for real-time updates (every 30 seconds)
    const interval = setInterval(() => {
      loadSubmissions();
    }, 30000);

    return () => clearInterval(interval);
  }, [mapId]);

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const data = await getSubmissionsForMap(mapId);
      setSubmissions(data);
    } catch (error) {
      console.error("Error loading submissions:", error);
      toast({
        title: "Error loading submissions",
        description: "Could not load student submissions for this map.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradeSubmission = async (
    submission: SubmissionWithDetails,
    grade: "pass" | "fail",
    comments: string,
    rating?: number,
    pointsAwarded?: number
  ) => {
    try {
      await gradeSubmission(
        submission.id,
        grade,
        comments,
        rating,
        userId,
        submission.student_node_progress.id,
        pointsAwarded
      );

      toast({
        title: "Submission graded successfully",
        description: `Marked as ${grade.toUpperCase()} for ${submission.student_node_progress.profiles.username}`,
      });

      // Refresh submissions
      await loadSubmissions();
      onGradingComplete?.();
    } catch (error) {
      console.error("Error grading submission:", error);
      toast({
        title: "Error grading submission",
        description: "Could not save the grade. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (submission: SubmissionWithDetails) => {
    if (submission.submission_grades.length === 0) {
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-300">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    }
    const grade = submission.submission_grades[0];
    if (grade.grade === "pass") {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Passed
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  };

  const SubmissionCard = ({
    submission,
  }: {
    submission: SubmissionWithDetails;
  }) => {
    const grade = submission.submission_grades[0];

    // Check if this is a team submission (placeholder - would check metadata or team associations)
    const isTeamSubmission = submission.metadata?.team_id !== undefined;
    const teamName = submission.metadata?.team_name || "Team Submission";

    return (
      <Card className="mb-4 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={""} />
                <AvatarFallback>
                  {submission.student_node_progress.profiles.username
                    .charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {submission.student_node_progress.profiles.username}
                  {isTeamSubmission && (
                    <Users className="h-4 w-4 text-blue-500" />
                  )}
                </CardTitle>
                <CardDescription className="text-sm">
                  {submission.node_assessments?.map_nodes?.title ||
                    "Unknown Node"}{" "}
                  • {new Date(submission.submitted_at).toLocaleDateString()}
                  {isTeamSubmission && (
                    <div className="flex items-center gap-1 mt-1 text-blue-600">
                      <Users2 className="h-3 w-3" />
                      <span className="text-xs">{teamName}</span>
                    </div>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(submission)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Assessment Type */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {submission.node_assessments.assessment_type.replace("_", " ")}
              </Badge>
            </div>

            {/* Submission Content Preview */}
            <div className="text-sm text-gray-600">
              {submission.text_answer && (
                <div>
                  <strong>Answer:</strong>{" "}
                  {submission.text_answer.length > 100
                    ? `${submission.text_answer.substring(0, 100)}...`
                    : submission.text_answer}
                </div>
              )}
              {submission.file_urls && submission.file_urls.length > 0 && (
                <div>
                  <strong>Files:</strong> {submission.file_urls.length} file(s)
                  uploaded
                </div>
              )}
              {submission.quiz_answers && (
                <div>
                  <strong>Quiz:</strong>{" "}
                  {Object.keys(submission.quiz_answers).length} questions
                  answered
                </div>
              )}
            </div>

            {/* Previous Grade (if exists) */}
            {grade && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <strong>Previous Grade:</strong> {grade.grade.toUpperCase()}
                    {grade.rating && <span> ({grade.rating}/5 stars)</span>}
                    {grade.points_awarded && (
                      <span> - {grade.points_awarded} points</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(grade.graded_at).toLocaleDateString()}
                  </div>
                </div>
                {grade.comments && (
                  <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    <MessageSquare className="h-4 w-4 inline mr-1" />
                    {grade.comments}
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedSubmission(submission)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>
              <Button
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() =>
                  handleGradeSubmission(submission, "pass", "Good work!")
                }
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Pass
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  handleGradeSubmission(submission, "fail", "Needs improvement")
                }
              >
                <XCircle className="h-4 w-4 mr-1" />
                Fail
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading submissions...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">
              {selectedNode
                ? `Grading: ${selectedNode.data.title}`
                : "Map Grading"}
            </h3>
          </div>
          <Button size="sm" variant="outline" onClick={loadSubmissions}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-orange-500" />
            <span>{pendingSubmissions.length} Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>
              {
                gradedSubmissions.filter(
                  (s) => s.submission_grades[0]?.grade === "pass"
                ).length
              }{" "}
              Passed
            </span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-500" />
            <span>
              {
                gradedSubmissions.filter(
                  (s) => s.submission_grades[0]?.grade === "fail"
                ).length
              }{" "}
              Failed
            </span>
          </div>
        </div>

        {/* Team Filter */}
        <div className="flex gap-2 mt-3">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-32">
              <Users className="h-4 w-4 mr-1" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="team">Team Only</SelectItem>
              <SelectItem value="individual">Individual Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="pending" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
            <TabsTrigger value="pending">
              Pending ({pendingSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="graded">
              Graded ({gradedSubmissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="pending"
            className="flex-1 overflow-y-auto p-4 mt-0"
          >
            {pendingSubmissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>All submissions have been graded!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSubmissions.map((submission) => (
                  <SubmissionCard key={submission.id} submission={submission} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="graded"
            className="flex-1 overflow-y-auto p-4 mt-0"
          >
            {gradedSubmissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
                <p>No graded submissions yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {gradedSubmissions.map((submission) => (
                  <SubmissionCard key={submission.id} submission={submission} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
