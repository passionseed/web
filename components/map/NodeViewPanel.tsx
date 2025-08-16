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
  AssessmentSubmission,
  SubmissionGrade,
} from "@/types/map";
import {
  getStudentProgress,
  startNodeProgress,
  submitNodeProgress,
  type StudentProgress,
} from "@/lib/supabase/progresses";
import { createClient } from "@/lib/supabase/client";
import { NoNodeSelectedView } from "./NoNodeSelectedView";
import { NodeHeaderView } from "./NodeHeaderView";
import { LearningContentView } from "./LearningContentView";
import { AssessmentSection } from "./AssessmentSection";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createAssessmentSubmission,
  getAssessmentSubmissions,
} from "@/lib/supabase/assessment";
import { getSubmissionGrade } from "@/lib/supabase/grading";

interface NodeViewPanelProps {
  selectedNode: Node<MapNode> | null;
  mapId: string;
  onProgressUpdate?: () => void;
  isNodeUnlocked?: boolean;
}

interface SubmissionWithGrade {
  submission: AssessmentSubmission;
  grade: SubmissionGrade | null;
}

export function NodeViewPanel({
  selectedNode,
  mapId,
  onProgressUpdate,
  isNodeUnlocked = true,
}: NodeViewPanelProps) {
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [submissionsWithGrades, setSubmissionsWithGrades] = useState<
    SubmissionWithGrade[]
  >([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentAnswer, setAssessmentAnswer] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!!selectedNode); // Start loading if we have a selectedNode
  const { toast } = useToast();

  const nodeData = selectedNode?.data;
  const assessment = nodeData?.node_assessments?.[0];

  // Handle progress state more comprehensively
  const hasStarted = progress !== null && progress?.status !== "not_started";
  const isNotStarted = progress === null || progress?.status === "not_started";

  // Determine assessment submission states with null checks
  const latestSubmissionWithGrade = submissionsWithGrades?.[0] || null;
  const isGraded =
    latestSubmissionWithGrade?.grade !== null &&
    latestSubmissionWithGrade?.grade !== undefined;
  const isPassed =
    isGraded && latestSubmissionWithGrade?.grade?.grade === "pass";
  const isFailed =
    isGraded && latestSubmissionWithGrade?.grade?.grade === "fail";
  const isSubmittedAndPending = progress?.status === "submitted" && !isGraded;
  const isInProgress = progress?.status === "in_progress";
  const canResubmit = isFailed;

  // Show assessment form if:
  // - Student can resubmit (failed previous attempt)
  // - Student has started but hasn't submitted yet and hasn't passed
  // - Student is in progress state
  const showAssessmentForm =
    canResubmit ||
    (hasStarted && !isSubmittedAndPending && !isPassed) ||
    isInProgress;

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
    // Immediately clear state when selectedNode changes to prevent stale data
    setProgress(null);
    setSubmissionsWithGrades([]);
    setAssessmentAnswer("");
    setQuizAnswers({});

    // Load new data if we have both selectedNode and currentUser
    if (selectedNode && currentUser) {
      // Set loading state immediately when starting to load new node
      setIsLoading(true);
      loadProgress();
    } else {
      // Clear loading state if no selectedNode or currentUser
      setIsLoading(false);
    }
  }, [selectedNode?.id, currentUser]);

  // Separate effect to clear state when no node is selected
  useEffect(() => {
    if (!selectedNode) {
      setProgress(null);
      setSubmissionsWithGrades([]);
      setAssessmentAnswer("");
      setQuizAnswers({});
    }
  }, [selectedNode]);

  const loadProgress = async () => {
    if (!selectedNode || !currentUser || isLoading) return;

    setIsLoading(true);
    try {
      console.log("📊 Loading progress for node:", selectedNode.id);

      // Validate required data before proceeding
      if (!selectedNode.id || !currentUser.id) {
        console.error("Missing required IDs:", {
          nodeId: selectedNode.id,
          userId: currentUser.id,
        });
        toast({
          title: "Error loading progress",
          description: "Missing required information",
          variant: "destructive",
        });
        return;
      }

      const progressData = await getStudentProgress(
        currentUser.id,
        selectedNode.id,
        mapId
      );

      // Handle different progress states
      if (!progressData) {
        console.log(
          "📝 No progress found - student hasn't started this node yet (or access denied)"
        );
        setProgress(null);
        setSubmissionsWithGrades([]);
        return;
      }

      setProgress(progressData);

      // Only try to load submissions if there's an assessment AND the student has started
      if (progressData && selectedNode.data.node_assessments?.[0]) {
        try {
          const fetchedSubmissions = await getAssessmentSubmissions(
            progressData.id,
            selectedNode.data.node_assessments[0].id
          );

          console.log("📋 Fetched submissions:", fetchedSubmissions);

          // Handle empty submissions array
          if (!fetchedSubmissions || fetchedSubmissions.length === 0) {
            console.log("📝 No submissions found for this progress");
            setSubmissionsWithGrades([]);
            return;
          }

          // Process submissions with graceful grade fetching
          const submissionsWithGradesData = await Promise.all(
            fetchedSubmissions.map(async (submission) => {
              // Always return the submission, even if grade fetching fails
              let gradeData = null;

              try {
                if (!submission.id) {
                  console.warn("Submission missing ID:", submission);
                  return { submission, grade: null };
                }

                console.log("🔍 Fetching grade for submission:", submission.id);
                gradeData = await getSubmissionGrade(submission.id);
              } catch (error) {
                // Silently handle 406 errors - students may not have permission to read grades
                console.warn(
                  `Could not fetch grade for submission ${submission.id}:`,
                  error
                );
                gradeData = null;
              }

              return { submission, grade: gradeData };
            })
          );

          setSubmissionsWithGrades(submissionsWithGradesData);
        } catch (submissionError) {
          console.warn("Error loading submissions:", submissionError);
          // Don't fail the entire load if submissions can't be fetched
          setSubmissionsWithGrades([]);
        }
      } else {
        // No assessment or no progress - clear submissions
        setSubmissionsWithGrades([]);
      }

      console.log("✅ Progress and submissions loaded successfully");
    } catch (error) {
      console.error("❌ Error loading progress:", error);

      // Don't show error toasts for permission/access issues since they're expected
      // in cases where students don't have direct access to progress data
      let shouldShowToast = true;
      let errorMessage = "Some data may not be available";

      if (error instanceof Error) {
        if (
          error.message.includes("permission") ||
          error.message.includes("policy") ||
          error.message.includes("406") ||
          error.message.includes("Not Acceptable") ||
          error.message.includes("Access denied")
        ) {
          console.warn(
            "Access denied - this is expected for students accessing their own progress"
          );
          shouldShowToast = false;
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage = "Network error - please check your connection";
        } else {
          errorMessage = error.message;
        }
      }

      if (shouldShowToast) {
        toast({
          title: "Error loading progress",
          description: errorMessage,
          variant: "destructive",
        });
      }

      // Set safe defaults on error
      setProgress(null);
      setSubmissionsWithGrades([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNode = async () => {
    if (!selectedNode || !currentUser) {
      console.error("Cannot start node: missing selectedNode or currentUser");
      toast({
        title: "Cannot start node",
        description: "Missing required information",
        variant: "destructive",
      });
      return;
    }

    // Prevent starting if already started
    if (hasStarted) {
      console.warn("Node already started, ignoring start request");
      toast({
        title: "Node already started",
        description: "This node is already in progress",
        variant: "destructive",
      });
      return;
    }

    setIsStarting(true);
    try {
      console.log("🚀 Starting node progress...");
      const newProgress = await startNodeProgress(
        currentUser.id,
        selectedNode.id,
        mapId
      );

      if (!newProgress) {
        throw new Error("Failed to create progress record");
      }

      setProgress(newProgress);
      onProgressUpdate?.();

      toast({
        title: "Node started successfully!",
        description:
          "Time tracking has begun. Good luck on your learning journey!",
      });

      console.log("✅ Node started successfully:", newProgress);
    } catch (error) {
      console.error("❌ Error starting node:", error);

      let errorMessage = "Failed to start node";
      if (error instanceof Error) {
        if (
          error.message.includes("duplicate") ||
          error.message.includes("already exists")
        ) {
          errorMessage = "Node has already been started";
        } else if (
          error.message.includes("permission") ||
          error.message.includes("policy")
        ) {
          errorMessage = "You don't have permission to start this node";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error starting node",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmitAssessment = async (
    fileUrls?: string[],
    fileNames?: string[]
  ) => {
    // Comprehensive validation
    if (!selectedNode || !currentUser || !progress) {
      console.error("Cannot submit assessment: missing required data", {
        hasSelectedNode: !!selectedNode,
        hasCurrentUser: !!currentUser,
        hasProgress: !!progress,
      });
      toast({
        title: "Cannot submit assessment",
        description:
          "Missing required information. Please try refreshing the page.",
        variant: "destructive",
      });
      return;
    }

    const assessment = selectedNode.data.node_assessments?.[0];
    if (!assessment) {
      console.error("No assessment found for this node");
      toast({
        title: "No assessment available",
        description: "This node doesn't have an assessment to submit.",
        variant: "destructive",
      });
      return;
    }

    // Check if student has already passed
    if (isPassed) {
      toast({
        title: "Assessment already passed",
        description: "You have already successfully completed this assessment.",
        variant: "destructive",
      });
      return;
    }

    // Check if student has submitted and is awaiting grade (unless they can resubmit)
    if (isSubmittedAndPending && !canResubmit) {
      toast({
        title: "Assessment already submitted",
        description:
          "Your submission is pending review. Please wait for grading.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionData: Partial<AssessmentSubmission> = {
        progress_id: progress.id,
        assessment_id: assessment.id,
      };

      // Validate and handle different assessment types
      if (assessment.assessment_type === "text_answer") {
        if (!assessmentAnswer || assessmentAnswer.trim().length === 0) {
          toast({
            title: "Please provide an answer",
            description: "Text answer cannot be empty.",
            variant: "destructive",
          });
          return;
        }
        submissionData.text_answer = assessmentAnswer.trim();
      } else if (assessment.assessment_type === "quiz") {
        // Validate quiz answers
        const questions = assessment.quiz_questions || [];
        const answeredQuestions = Object.keys(quizAnswers).length;

        if (answeredQuestions === 0) {
          toast({
            title: "Please answer the quiz questions",
            description: "You must answer at least one question to submit.",
            variant: "destructive",
          });
          return;
        }

        if (answeredQuestions < questions.length) {
          toast({
            title: "Incomplete quiz",
            description: `Please answer all ${questions.length} questions before submitting.`,
            variant: "destructive",
          });
          return;
        }

        submissionData.quiz_answers = quizAnswers;
        console.log("🤖 Submitting quiz for auto-grading...");
        console.log("📝 Quiz answers being submitted:", quizAnswers);
      } else if (assessment.assessment_type === "file_upload") {
        if (!fileUrls || fileUrls.length === 0) {
          toast({
            title: "Please upload at least one file",
            description: "File upload is required for this assessment.",
            variant: "destructive",
          });
          return;
        }

        // Validate file URLs
        const validUrls = fileUrls.filter(
          (url) => url && url.trim().length > 0
        );
        if (validUrls.length === 0) {
          toast({
            title: "Invalid file uploads",
            description: "Please ensure all files are properly uploaded.",
            variant: "destructive",
          });
          return;
        }

        submissionData.file_urls = validUrls;
      } else {
        toast({
          title: "Unknown assessment type",
          description: "This assessment type is not supported.",
          variant: "destructive",
        });
        return;
      }

      console.log("📤 Creating assessment submission:", submissionData);
      await createAssessmentSubmission(submissionData);

      // Clear form data after successful submission
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

      let errorMessage = "Failed to submit assessment";
      if (error instanceof Error) {
        console.error("❌ Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });

        if (
          error.message.includes("duplicate") ||
          error.message.includes("already submitted")
        ) {
          errorMessage = "Assessment has already been submitted";
        } else if (
          error.message.includes("permission") ||
          error.message.includes("policy")
        ) {
          errorMessage = "You don't have permission to submit this assessment";
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "Network error - please check your connection and try again";
        } else {
          errorMessage = error.message;
        }
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

  // Show loading skeleton while data is being fetched
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex-shrink-0 border-b p-4">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-6 w-full" />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 p-4 space-y-6">
          {/* Learning Content Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>

          {/* Assessment Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header Section - Fixed */}
      <div className="flex-shrink-0 border-b">
        <NodeHeaderView
          nodeData={nodeData}
          progress={progress as any} // Type conversion - StudentProgress compatible with StudentNodeProgress
          currentUser={currentUser}
          hasStarted={!!hasStarted}
          isStarting={isStarting}
          onStartNode={handleStartNode}
        />
      </div>

      {/* Content Section - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {hasStarted ? (
          <div className="p-4 space-y-6 min-h-full">
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
          <div className="p-8 text-center flex flex-col justify-center min-h-full">
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
