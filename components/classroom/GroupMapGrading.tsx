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
import { 
  getGroupAllSubmissions,
  gradeSubmission 
} from "@/lib/supabase/group-grading";
import { createClient } from "@/utils/supabase/client";

interface GroupMapGradingProps {
  groupId: string;
  mapId: string;
  groupName: string;
  onGraded?: () => void;
}

export function GroupMapGrading({ groupId, mapId, groupName, onGraded }: GroupMapGradingProps) {
  console.log("🔍 GroupMapGrading props:", { groupId, mapId, groupName });
  
  const [submissions, setSubmissions] = useState<any[]>([]);
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
    loadSubmissions();
  }, [groupId, mapId]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      // Use getGroupAllSubmissions since we're grading all submissions for a group
      const data = await getGroupAllSubmissions(groupId, mapId);
      setSubmissions(data);
      
      // Initialize individual grades
      const initialGrades: Record<string, any> = {};
      data.forEach((sub: any) => {
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
      console.error("Error loading submissions:", error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkGrade = async () => {
    setGrading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Grade all ungraded submissions individually
      const ungradedSubs = submissions.filter(s => !s.grade);
      let gradedCount = 0;

      for (const submission of ungradedSubs) {
        try {
          await gradeSubmission(
            submission.submission_id,
            bulkGrade,
            bulkComments,
            null,
            user.id,
            submission.progress_id,
            bulkPoints
          );
          gradedCount++;
        } catch (error) {
          console.error(`Failed to grade submission ${submission.submission_id}:`, error);
        }
      }

      toast({
        title: "Success",
        description: `Graded ${gradedCount} submissions`
      });

      onGraded?.();
      loadSubmissions();
    } catch (error: any) {
      console.error("Error bulk grading:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setGrading(false);
    }
  };

  const handleIndividualGrade = async (submissionId: string, progressId: string) => {
    const gradeData = individualGrades[submissionId];
    if (!gradeData) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await gradeSubmission(
        submissionId,
        gradeData.grade,
        gradeData.comments,
        null,
        user.id,
        progressId,
        gradeData.points
      );

      toast({
        title: "Graded",
        description: "Submission graded successfully"
      });

      onGraded?.();
      loadSubmissions();
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

  if (loading) {
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
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Grade Group Submissions</h2>
        <p className="text-gray-600">
          Grading submissions from {groupName} members across all learning maps
        </p>
      </div>

      {/* Bulk Grading Section */}
      {ungradedSubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Grading</CardTitle>
            <CardDescription>
              Grade all {ungradedSubmissions.length} ungraded submissions at once
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Grade</Label>
                <RadioGroup 
                  value={bulkGrade} 
                  onValueChange={(v: "pass" | "fail") => setBulkGrade(v)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pass" id="pass" />
                    <Label htmlFor="pass" className="cursor-pointer">Pass</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fail" id="fail" />
                    <Label htmlFor="fail" className="cursor-pointer">Fail</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={bulkPoints}
                  onChange={(e) => setBulkPoints(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Comments</Label>
                <Input
                  value={bulkComments}
                  onChange={(e) => setBulkComments(e.target.value)}
                  placeholder="Group feedback"
                />
              </div>
            </div>

            <Button 
              onClick={handleBulkGrade} 
              disabled={grading}
              className="w-full"
            >
              {grading ? "Grading..." : `Grade All ${ungradedSubmissions.length} Submissions`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Individual Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>
            Submissions ({submissions.length} total, {ungradedSubmissions.length} ungraded)
          </CardTitle>
          <CardDescription>
            Review and grade individual submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Ungraded Submissions */}
            {ungradedSubmissions.length > 0 && (
              <div>
                <h4 className="font-medium mb-4 text-orange-600">Ungraded Submissions</h4>
                <div className="space-y-4">
                  {ungradedSubmissions.map((submission) => (
                    <div key={submission.submission_id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="font-medium">
                            {submission.full_name || submission.username}
                          </div>
                          <div className="text-sm text-gray-600">
                            {submission.node_title} • {submission.assessment_type}
                            {(submission as any).map_title && (
                              <span className="text-xs text-gray-500 ml-2">
                                from {(submission as any).map_title}
                              </span>
                            )}
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
                          <div className="p-3 bg-gray-50 rounded text-sm">
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Graded Submissions */}
            {gradedSubmissions.length > 0 && (
              <div>
                <h4 className="font-medium mb-4 text-green-600">Graded Submissions</h4>
                <div className="space-y-3">
                  {gradedSubmissions.map((submission) => (
                    <div key={submission.submission_id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {submission.full_name || submission.username}
                          </div>
                          <div className="text-sm text-gray-600">
                            {submission.node_title}
                            {(submission as any).map_title && (
                              <span className="text-xs text-gray-500 ml-2">
                                from {(submission as any).map_title}
                              </span>
                            )}
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {submissions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">No submissions found for this group and map</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}