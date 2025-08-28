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
import { Eye } from "lucide-react";

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


  const handleIndividualGrade = async (submissionId: string, progressId: string, submission: any) => {
    const gradeData = individualGrades[submissionId];
    if (!gradeData) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Only pass points if the assessment is gradeable
      const pointsToAward = submission.is_graded ? gradeData.points : null;

      await gradeSubmission(
        submissionId,
        gradeData.grade,
        gradeData.comments,
        null,
        user.id,
        progressId,
        pointsToAward
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
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <span>{submission.node_title} • {submission.assessment_type}</span>
                            {submission.is_graded && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                Gradeable
                              </Badge>
                            )}
                            {(submission as any).map_title && (
                              <span className="text-xs text-gray-500">
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
                          <div className="p-3 bg-gray-50 rounded text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                            {submission.text_answer}
                          </div>
                        </div>
                      )}

                      {submission.file_urls && submission.file_urls.length > 0 && (
                        <div className="mb-4">
                          <Label>File Submissions</Label>
                          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                            <p className="text-sm font-medium mb-2">Files ({submission.file_urls.length}):</p>
                            <div className="space-y-1">
                              {submission.file_urls.map((url: string, fileIndex: number) => (
                                <a
                                  key={fileIndex}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline flex items-center gap-1 dark:text-blue-400"
                                >
                                  <Eye className="h-3 w-3" />
                                  File {fileIndex + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className={`grid grid-cols-1 ${submission.is_graded ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-4`}>
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

                        {submission.is_graded && (
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
                        )}

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
                        onClick={() => handleIndividualGrade(submission.submission_id, submission.progress_id, submission)}
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

                      {submission.text_answer && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500 mb-1">Answer:</div>
                          <div className="p-2 bg-gray-50 rounded text-xs text-gray-900 dark:bg-gray-800 dark:text-gray-100 max-h-20 overflow-y-auto">
                            {submission.text_answer}
                          </div>
                        </div>
                      )}

                      {submission.file_urls && submission.file_urls.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500 mb-1">Files ({submission.file_urls.length}):</div>
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                            <div className="space-y-1">
                              {submission.file_urls.map((url: string, fileIndex: number) => (
                                <a
                                  key={fileIndex}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 dark:text-blue-400"
                                >
                                  <Eye className="h-3 w-3" />
                                  File {fileIndex + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
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