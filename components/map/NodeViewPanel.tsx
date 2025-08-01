"use client";

import { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Clock, Play, Upload, Lock } from "lucide-react";
import {
  MapNode,
  NodeContent,
  QuizQuestion,
  StudentNodeProgress,
  AssessmentSubmission,
  SubmissionGrade,
} from "@/types/map";
import {
  getStudentProgress,
  startNodeProgress,
  submitNodeProgress,
} from "@/lib/supabase/progresses";
import { createClient } from "@/lib/supabase/client";
import { NoNodeSelectedView } from "./NoNodeSelectedView";
import { NodeHeaderView } from "./NodeHeaderView";
import { LearningContentView } from "./LearningContentView";
import { AssessmentSection } from "./AssessmentSection";
import {
  createAssessmentSubmission,
  getAssessmentSubmissions,
} from "@/lib/supabase/assessment";
import { getSubmissionGrade } from "@/lib/supabase/grading";

interface NodeViewPanelProps {
  selectedNode: Node<MapNode> | null;
  onProgressUpdate?: () => void;
  isNodeUnlocked?: boolean;
}

interface SubmissionWithGrade {
  submission: AssessmentSubmission;
  grade: SubmissionGrade | null;
}

export function NodeViewPanel({
  selectedNode,
  onProgressUpdate,
  isNodeUnlocked = true,
}: NodeViewPanelProps) {
  const [progress, setProgress] = useState<StudentNodeProgress | null>(null);
  const [submissionsWithGrades, setSubmissionsWithGrades] = useState<
    SubmissionWithGrade[]
  >([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentAnswer, setAssessmentAnswer] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  const nodeData = selectedNode?.data;
  const assessment = nodeData?.node_assessments?.[0];
  const hasStarted = progress?.status !== "not_started" && progress?.status;
  // Determine assessment submission states
  const latestSubmissionWithGrade = submissionsWithGrades[0];
  const isGraded = latestSubmissionWithGrade?.grade !== null;
  const isPassed =
    isGraded && latestSubmissionWithGrade?.grade?.grade === "pass";
  const isFailed =
    isGraded && latestSubmissionWithGrade?.grade?.grade === "fail";
  const isSubmittedAndPending = progress?.status === "submitted" && !isGraded;
  const canResubmit = isFailed;
  const showAssessmentForm =
    canResubmit || (hasStarted && !isSubmittedAndPending && !isPassed) || false;

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (selectedNode && currentUser) {
      loadProgress();
    }
  }, [selectedNode, currentUser]);

  const loadProgress = async () => {
    if (!selectedNode || !currentUser) return;
    try {
      const progressData = await getStudentProgress(
        currentUser.id,
        selectedNode.id
      );
      setProgress(progressData);
      if (progressData && selectedNode.data.node_assessments?.[0]) {
        const fetchedSubmissions = await getAssessmentSubmissions(
          progressData.id,
          selectedNode.data.node_assessments[0].id
        );
        const submissionsWithGradesData = await Promise.all(
          fetchedSubmissions.map(async (submission) => {
            const gradeData = await getSubmissionGrade(submission.id);
            return { submission, grade: gradeData };
          })
        );
        setSubmissionsWithGrades(submissionsWithGradesData);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
      toast({ title: "Error loading progress", variant: "destructive" });
    }
  };

  const handleStartNode = async () => {
    if (!selectedNode || !currentUser) return;
    setIsStarting(true);
    try {
      const newProgress = await startNodeProgress(
        currentUser.id,
        selectedNode.id
      );
      setProgress(newProgress);
      onProgressUpdate?.();
      toast({ title: "Node started! Time tracking has begun." });
    } catch (error) {
      console.error("Error starting node:", error);
      toast({ title: "Error starting node", variant: "destructive" });
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmitAssessment = async (
    fileUrls?: string[],
    fileNames?: string[]
  ) => {
    if (!selectedNode || !currentUser || !progress) return;

    const assessment = selectedNode.data.node_assessments?.[0];
    if (!assessment) return;

    setIsSubmitting(true);
    try {
      const submissionData: Partial<AssessmentSubmission> = {
        progress_id: progress.id,
        assessment_id: assessment.id,
      };

      if (assessment.assessment_type === "text_answer") {
        submissionData.text_answer = assessmentAnswer;
      } else if (assessment.assessment_type === "quiz") {
        submissionData.quiz_answers = quizAnswers;
        console.log("🤖 Submitting quiz for auto-grading...");
        console.log("📝 Quiz answers being submitted:", quizAnswers);
      } else if (assessment.assessment_type === "file_upload") {
        if (!fileUrls || fileUrls.length === 0) {
          toast({
            title: "Please upload at least one file",
            variant: "destructive",
          });
          return;
        }
        submissionData.file_urls = fileUrls;
      }

      console.log("📤 Creating assessment submission:", submissionData);
      await createAssessmentSubmission(submissionData);

      setAssessmentAnswer("");
      setQuizAnswers({});

      // Refresh progress and submissions
      await loadProgress();
      onProgressUpdate?.();

      // Different success messages based on assessment type
      if (assessment.assessment_type === "quiz") {
        toast({
          title: "Quiz completed!",
          description:
            "Your answers have been graded automatically. Check your results above.",
        });
      } else {
        toast({
          title: "Assessment submitted successfully!",
          description: "Your submission is pending review by an instructor.",
        });
      }
    } catch (error) {
      console.error("❌ Error submitting assessment:", error);
      console.error("❌ Error type:", typeof error);
      console.error("❌ Error details:", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      });

      let errorMessage = "Error submitting assessment";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedNode) {
    return <NoNodeSelectedView />;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header Section */}
      <NodeHeaderView
        nodeData={nodeData}
        progress={progress}
        currentUser={currentUser}
        hasStarted={!!hasStarted}
        isStarting={isStarting}
        onStartNode={handleStartNode}
      />

      {/* Content Section */}
      <div className="flex-1 overflow-y-auto">
        {hasStarted ? (
          <div className="p-4 space-y-6">
            {/* Learning Content */}
            <LearningContentView nodeContent={nodeData?.node_content || []} />

            {/* Assessment Section */}
            {assessment && (
              <AssessmentSection
                nodeId={selectedNode.id}
                assessment={assessment}
                canResubmit={canResubmit}
                showAssessmentForm={showAssessmentForm}
                assessmentAnswer={assessmentAnswer}
                setAssessmentAnswer={setAssessmentAnswer}
                quizAnswers={quizAnswers}
                setQuizAnswers={setQuizAnswers}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmitAssessment}
                submissionsWithGrades={submissionsWithGrades}
              />
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div
              className={`w-20 h-20 mx-auto ${
                isNodeUnlocked
                  ? "bg-gradient-to-br from-blue-100 to-blue-200"
                  : "bg-gradient-to-br from-gray-100 to-gray-200"
              } rounded-full flex items-center justify-center mb-6`}
            >
              {isNodeUnlocked ? (
                <Play className="h-10 w-10 text-blue-600" />
              ) : (
                <Lock className="h-10 w-10 text-gray-500" />
              )}
            </div>

            {isNodeUnlocked ? (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Ready to Begin?
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
                  Click "Start Learning Journey" below to unlock the content and
                  begin your adventure through this node.
                </p>
                {currentUser && (
                  <Button
                    onClick={handleStartNode}
                    disabled={isStarting}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
                    size="lg"
                  >
                    {isStarting ? (
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Start Learning Journey
                  </Button>
                )}
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  Node Locked
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
                  Complete the previous nodes to unlock this content. Your
                  journey must follow the designated path.
                </p>
                <Button
                  disabled
                  className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
                  size="lg"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Locked - Complete Prerequisites
                </Button>
              </>
            )}

            {!currentUser && (
              <p className="text-sm text-muted-foreground mt-4">
                Please log in to start your learning journey.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
