"use client";

import { useState, useEffect, useMemo } from "react";
import { Node } from "@xyflow/react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Clock, Play, Upload, Lock, CheckSquare, CheckCircle } from "lucide-react";
import { TextNode } from "@/components/map/MapEditor/components/TextNode";
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
  updateNodeProgress,
  type StudentProgress,
} from "@/lib/supabase/progresses";
import { createClient } from "@/utils/supabase/client";
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
import { InstructorGradingPanel } from "./InstructorGradingPanel";
import { CommentNode } from "./CommentNode";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamNodeViewPanel } from "./TeamNodeViewPanel";
import { InstructorTeamGradingPanel } from "./InstructorTeamGradingPanel";
import {
  getTeamMapClassroomInfo,
  getUserClassroomRoleClient,
} from "@/lib/supabase/maps";

import {
  claimNode,
  getNodeClaimStatus,
  adminUnclaimNode,
} from "@/app/actions/team-actions";

interface NodeViewPanelProps {
  // React Flow Node requires a generic that extends Record<string, unknown>
  // MapNode doesn't include an index signature, so intersect with Record to satisfy the constraint
  selectedNode: Node<Record<string, unknown> & MapNode> | null;
  mapId: string;
  seedRoomId?: string; // Added for team functionality
  onProgressUpdate?: () => void;
  isNodeUnlocked?: boolean;
  userRole?: "instructor" | "TA" | "student" | "admin";
  isInstructorOrTA?: boolean;
}

interface SubmissionWithGrade {
  submission: AssessmentSubmission;
  grade: SubmissionGrade | null;
}

export function NodeViewPanel({
  selectedNode,
  mapId,
  seedRoomId,
  onProgressUpdate,
  isNodeUnlocked = true,
  userRole = "student",
  isInstructorOrTA = false,
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
  const [isTeamMap, setIsTeamMap] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [classroomRole, setClassroomRole] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<{
    claimed: boolean;
    isMe: boolean;
    claimant: any;
  } | null>(null);
  const { toast } = useToast();

  // Load claim status for team assignments
  useEffect(() => {
    console.log('[NodeViewPanel useEffect] Checking claim status...', {
      hasTeamGroupId: !!selectedNode?.data.team_group_id,
      hasSeedRoomId: !!seedRoomId,
      nodeId: selectedNode?.id
    });

    if (selectedNode?.data.team_group_id && seedRoomId) {
      // Reset status while loading
      console.log('[NodeViewPanel useEffect] Fetching claim status for team node...');
      setClaimStatus(null);
      getNodeClaimStatus(seedRoomId, selectedNode.id)
        .then((status) => {
          console.log('[NodeViewPanel useEffect] Received claim status:', status);
          setClaimStatus(status);
        })
        .catch((err) => {
          console.error("[NodeViewPanel useEffect] Failed to load claim status", err);
          setClaimStatus(null);
        });
    } else {
      console.log('[NodeViewPanel useEffect] Not a team node or no seedRoomId, clearing claim status');
      setClaimStatus(null);
    }
  }, [selectedNode?.id, seedRoomId]);

  const nodeData = selectedNode?.data;
  const [editableNodeData, setEditableNodeData] = useState<MapNode | null>(
    nodeData || null
  );
  const assessment = nodeData?.node_assessments?.[0];

  // Memoize nodeContent to prevent unnecessary re-renders of LearningContentView
  const memoizedNodeContent = useMemo(() => {
    return nodeData?.node_content || [];
  }, [nodeData?.node_content]);

  // Handle progress state more comprehensively
  const hasStarted = progress !== null && progress?.status !== "not_started";
  const isNotStarted = progress === null || progress?.status === "not_started";

  // Determine assessment submission states with null checks
  const latestSubmissionWithGrade = submissionsWithGrades?.[0] || null;
  const isGraded =
    latestSubmissionWithGrade?.grade !== null &&
    latestSubmissionWithGrade?.grade !== undefined;
  const isPassed =
    (isGraded && latestSubmissionWithGrade?.grade?.grade === "pass") ||
    progress?.status === "passed";
  const isFailed =
    isGraded && latestSubmissionWithGrade?.grade?.grade === "fail";
  const isSubmittedAndPending = progress?.status === "submitted" && !isGraded;
  const isInProgress = progress?.status === "in_progress";
  // Check if student can resubmit based on assessment settings and attempt count
  const canResubmit = (() => {
    if (!isFailed) return false; // Only allow resubmit if failed

    const assessment = selectedNode?.data.node_assessments?.[0];
    if (!assessment) return false;

    // If multiple attempts are disabled, no resubmission allowed
    if (!(assessment.metadata?.allow_multiple_attempts ?? true)) {
      return false;
    }

    // Check if student has exceeded max attempts
    const maxAttempts = assessment.metadata?.max_attempts || 3;
    const attemptCount = submissionsWithGrades.length;

    return attemptCount < maxAttempts;
  })();

  // Show assessment form if:
  // - Student can resubmit (failed previous attempt)
  // - Student has started but hasn't submitted yet and hasn't passed
  // - Student is in progress state
  // - BUT: For group assessments, if student is in "submitted" state due to group submission,
  //   they should NOT see the form (they should be able to proceed)
  const showAssessmentForm = (() => {
    // Basic conditions for showing form
    const basicConditions =
      canResubmit ||
      (hasStarted && !isSubmittedAndPending && !isPassed) ||
      isInProgress;

    // For group assessments with submitted status, don't show form if they have submissions
    // (this means they got auto-submissions from group member)
    if (assessment?.is_group_assessment && isSubmittedAndPending && submissionsWithGrades.length > 0) {
      return false; // Don't show form, let them proceed
    }

    return basicConditions;
  })();

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

  // Check if this is a team map
  useEffect(() => {
    const checkTeamMap = async () => {
      if (!mapId || !currentUser) return;

      try {
        // Check if this map is associated with a team
        const teamMapInfo = await getTeamMapClassroomInfo(mapId);

        if (teamMapInfo.isTeamMap && teamMapInfo.classroomId) {
          setIsTeamMap(true);
          setTeamId(teamMapInfo.teamId || null); // This will be null for instructors/TAs or if undefined

          // Get user's role in the classroom
          const role = await getUserClassroomRoleClient(
            teamMapInfo.classroomId,
            currentUser.id
          );
          setClassroomRole(role);
        } else {
          setIsTeamMap(false);
          setTeamId(null);
          setClassroomRole(null);
        }
      } catch (error) {
        console.error("Error checking team map status:", error);
        // Default to individual map behavior on error
        setIsTeamMap(false);
        setTeamId(null);
        setClassroomRole(null);
      }
    };

    checkTeamMap();
  }, [mapId, currentUser]);

  useEffect(() => {
    // sync editable copy when selection changes
    setEditableNodeData(nodeData || null);
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
  }, [selectedNode?.id, currentUser?.id]); // Use specific ID instead of whole object

  // Separate effect to clear state when no node is selected - optimize to only fire when needed
  useEffect(() => {
    if (!selectedNode) {
      setProgress(null);
      setSubmissionsWithGrades([]);
      setAssessmentAnswer("");
      setQuizAnswers({});
    }
  }, [selectedNode?.id]); // Use ID instead of whole object

  const loadProgress = async () => {
    if (!selectedNode || !currentUser || isLoading) return;

    setIsLoading(true);
    try {
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

          // Handle empty submissions array
          if (!fetchedSubmissions || fetchedSubmissions.length === 0) {
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
                  return { submission, grade: null };
                }

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
          // Don't fail the entire load if submissions can't be fetched
          setSubmissionsWithGrades([]);
        }
      } else {
        // No assessment or no progress - clear submissions
        setSubmissionsWithGrades([]);
      }
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

  // Persist text node edits
  const persistTextNodeEdit = async (updated: Partial<MapNode>) => {
    if (!editableNodeData) return;
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from("map_nodes")
        .update(updated)
        .eq("id", editableNodeData.id)
        .select()
        .single();

      if (error) {
        console.error("Failed to persist text node edit:", error);
        toast({
          title: "Could not save text",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Update local editable copy
      setEditableNodeData((prev) => (prev ? { ...prev, ...data } : prev));

      // Inform parent viewers/editors that the map node changed
      window.dispatchEvent(
        new CustomEvent("map_node_updated", {
          detail: { nodeId: editableNodeData.id },
        })
      );

      toast({
        title: "Saved",
        description: "Text node updated",
        variant: "default",
      });
    } catch (err) {
      console.error("Error saving text node:", err);
      toast({
        title: "Save failed",
        description: "Could not save text node",
        variant: "destructive",
      });
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

  const handleMarkAsComplete = async () => {
    if (!selectedNode || !currentUser) {
      console.error("Cannot mark as complete: missing selectedNode or currentUser");
      toast({
        title: "Cannot mark as complete",
        description: "Missing required information",
        variant: "destructive",
      });
      return;
    }

    // Prevent marking complete if already passed
    if (isPassed) {
      toast({
        title: "Already completed",
        description: "This node has already been marked as complete",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // For nodes without assessments, directly mark as "passed" since no grading is needed
      const updatedProgress = await updateNodeProgress(
        mapId,
        selectedNode.id,
        "passed",
        {
          submitted_at: new Date().toISOString(),
        }
      );

      if (!updatedProgress) {
        throw new Error("Failed to mark node as complete");
      }

      setProgress(updatedProgress);
      onProgressUpdate?.();

      toast({
        title: "Node completed!",
        description: "Great job! You can now continue to the next node.",
      });
    } catch (error) {
      console.error("❌ Error marking node as complete:", error);

      let errorMessage = "Failed to mark node as complete";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "Error completing node",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAssessment = async (
    fileUrls?: string[],
    fileNames?: string[],
    checklistData?: Record<string, boolean>
  ) => {
    // Check if user is not logged in
    if (!currentUser) {
      toast({
        title: "Login required",
        description: "Please log in to submit assessments and track your progress.",
        variant: "destructive",
      });
      return;
    }

    // Comprehensive validation
    if (!selectedNode || !progress) {
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
        const allQuestions = assessment.quiz_questions || [];
        const answeredQuestions = Object.keys(quizAnswers).length;

        if (answeredQuestions === 0) {
          toast({
            title: "Please answer the quiz questions",
            description: "You must answer at least one question to submit.",
            variant: "destructive",
          });
          return;
        }

        // For randomized quizzes, calculate expected number of questions
        let expectedQuestions = allQuestions.length;
        if (assessment.metadata?.randomize_questions) {
          expectedQuestions = Math.min(
            assessment.metadata?.questions_to_show || allQuestions.length,
            allQuestions.length
          );
        }

        if (answeredQuestions < expectedQuestions) {
          const isRandomized = assessment.metadata?.randomize_questions;
          const description = isRandomized
            ? `Please answer all ${expectedQuestions} questions shown to you before submitting.`
            : `Please answer all ${expectedQuestions} questions before submitting.`;

          toast({
            title: "Incomplete quiz",
            description,
            variant: "destructive",
          });
          return;
        }

        submissionData.quiz_answers = quizAnswers;
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
      } else if (assessment.assessment_type === "checklist") {
        // Validate checklist data
        if (!checklistData) {
          toast({
            title: "Checklist data missing",
            description: "Please complete all checklist items.",
            variant: "destructive",
          });
          return;
        }

        // Ensure all checklist items are completed
        const allChecked = Object.values(checklistData).every(
          (checked) => checked
        );
        if (!allChecked) {
          toast({
            title: "Incomplete checklist",
            description: "Please check all items before submitting.",
            variant: "destructive",
          });
          return;
        }

        // Store checklist completion data in metadata
        // Ensure submissionData has a metadata field by asserting the type
        (
          submissionData as Partial<
            AssessmentSubmission & { metadata?: Record<string, any> }
          >
        ).metadata = {
          checklist_completion: checklistData,
        };
      } else {
        toast({
          title: "Unknown assessment type",
          description: "This assessment type is not supported.",
          variant: "destructive",
        });
        return;
      }

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
      } else if (assessment.assessment_type === "checklist") {
        toast({
          title: "Checklist completed successfully!",
          description:
            "You have successfully completed all checklist items. Great job!",
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

  // Team Assignment Logic Gates
  const handleClaim = async () => {
    console.log('[CLIENT handleClaim] Starting claim process...', { seedRoomId, selectedNodeId: selectedNode?.id });

    if (!seedRoomId || !selectedNode) {
      console.log('[CLIENT handleClaim] Missing required data:', { seedRoomId, hasSelectedNode: !!selectedNode });
      return;
    }

    try {
      console.log('[CLIENT handleClaim] Calling claimNode server action...');
      await claimNode(seedRoomId, selectedNode.id);

      console.log('[CLIENT handleClaim] Fetching updated claim status...');
      const status = await getNodeClaimStatus(seedRoomId, selectedNode.id);
      setClaimStatus(status);

      console.log('[CLIENT handleClaim] Success!', status);
      toast({ title: "Role Claimed!", description: "You are now assigned to this part." });
    } catch (err: any) {
      console.error('[CLIENT handleClaim] Error:', err);
      toast({
        title: "Claim Failed",
        description: err.message || "Could not claim node.",
        variant: "destructive"
      });
    }
  };

  const handleUnassign = async () => {
    if (!seedRoomId || !selectedNode || !claimStatus?.claimant) return;
    try {
      await adminUnclaimNode(seedRoomId, selectedNode.id, claimStatus.claimant.user_id); // Assuming we have user_id in claimant object from action
      // Refetch
      const status = await getNodeClaimStatus(seedRoomId, selectedNode.id);
      setClaimStatus(status);
      toast({ title: "Unassigned", description: "Role is now free." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };



  // Debug: Log team node status
  useEffect(() => {
    if (selectedNode) {
      console.log('[NodeViewPanel] Selected node debug:', {
        nodeId: selectedNode.id,
        nodeTitle: selectedNode.data.node_title,
        hasTeamGroupId: !!selectedNode.data.team_group_id,
        teamGroupId: selectedNode.data.team_group_id,
        teamRoleName: selectedNode.data.team_role_name,
        hasSeedRoomId: !!seedRoomId,
        seedRoomId: seedRoomId,
        claimStatus: claimStatus
      });
    }
  }, [selectedNode, seedRoomId, claimStatus]);

  if (selectedNode.data.team_group_id && seedRoomId) {
    // 1. Loading state for claim check? 
    // If we assume claimStatus is null means loading OR not claimed, we might flash.
    // Ideally we track loadingClaimStatus. For now assuming null = unclaimed or loading.
    // But we need to know if we fetched it. check effect dependency.

    // If Unclaimed
    if (claimStatus && !claimStatus.claimed) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 animate-in fade-in">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <CheckSquare className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold">Team Assignment</h2>
          <p className="text-muted-foreground max-w-sm">
            This task is part of a team effort. To work on it, you must claim this role.
          </p>

          {selectedNode.data.team_role_image_url && (
            <div className="w-full max-w-sm mb-2 aspect-video relative rounded-lg overflow-hidden bg-muted border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedNode.data.team_role_image_url}
                alt="Role"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg border w-full max-w-sm">
            <p className="font-semibold text-sm mb-1">Role: {selectedNode.data.team_role_name || "Team Member"}</p>
            <p className="text-xs text-muted-foreground">Once claimed, only you can submit work for this part.</p>
          </div>
          <Button onClick={handleClaim} size="lg" className="w-full max-w-sm">
            Claim This Role
          </Button>
        </div>
      );
    }

    // If Claimed by Other
    if (claimStatus && claimStatus.claimed && !claimStatus.isMe) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 animate-in fade-in">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-red-500">Locked</h2>
          <p className="text-muted-foreground">
            This part is assigned to another team member.
          </p>

          {claimStatus.claimant && (
            <div className="flex items-center gap-3 bg-card border p-3 rounded-xl shadow-sm mt-4">
              <img
                src={claimStatus.claimant.avatar_url || "https://github.com/shadcn.png"}
                alt="Avatar"
                className="w-10 h-10 rounded-full bg-muted"
              />
              <div className="text-left">
                <p className="font-bold text-sm">{claimStatus.claimant.full_name || claimStatus.claimant.username || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">Assigned Team Member</p>
              </div>
            </div>
          )}

          {/* Admin/Host Override */}
          {(userRole === 'instructor' || userRole === 'admin') && (
            <div className="mt-8 pt-8 border-t w-full max-w-sm">
              <p className="text-xs text-muted-foreground mb-2">Instructor Actions</p>
              <Button variant="destructive" variant="outline" onClick={handleUnassign} className="w-full">
                Unassign User (Force)
              </Button>
            </div>
          )}
        </div>
      );
    }
  }

  // Render team-specific components for team maps
  if (isTeamMap) {
    const isInstructorOrTAForTeam =
      classroomRole === "instructor" || classroomRole === "ta";

    if (
      isInstructorOrTAForTeam &&
      selectedNode &&
      nodeData?.node_type !== "text" &&
      nodeData?.node_type !== "comment"
    ) {
      // Show team grading interface for instructors/TAs
      // For instructors/TAs, we can pass any valid teamId from the classroom
      // or use a placeholder if needed by the component
      const effectiveTeamId = teamId || "placeholder"; // Placeholder for now

      return (
        <div className="h-full flex flex-col bg-background overflow-hidden">
          <Tabs defaultValue="student-view" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 mb-0">
              <TabsTrigger value="student-view">Team View</TabsTrigger>
              <TabsTrigger value="grading">Grade Team</TabsTrigger>
            </TabsList>

            <TabsContent
              value="student-view"
              className="flex-1 overflow-hidden mt-0"
            >
              <TeamNodeViewPanel
                selectedNode={selectedNode}
                mapId={mapId}
                teamId={effectiveTeamId}
                onProgressUpdate={onProgressUpdate}
                isNodeUnlocked={isNodeUnlocked}
                userRole={classroomRole as any}
                isInstructorOrTA={isInstructorOrTAForTeam}
              />
            </TabsContent>

            <TabsContent
              value="grading"
              className="flex-1 overflow-hidden mt-0"
            >
              <InstructorTeamGradingPanel
                selectedNode={selectedNode}
                mapId={mapId}
                teamId={effectiveTeamId}
                onGradingComplete={onProgressUpdate}
              />
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    // Show team view for students/team members (only if teamId is available)
    if (teamId) {
      return (
        <TeamNodeViewPanel
          selectedNode={selectedNode}
          mapId={mapId}
          teamId={teamId}
          onProgressUpdate={onProgressUpdate}
          isNodeUnlocked={isNodeUnlocked}
          userRole={(classroomRole as any) || "student"}
          isInstructorOrTA={isInstructorOrTAForTeam}
        />
      );
    }
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

  // For instructors/TAs viewing nodes, show grading interface for learning nodes
  if (
    isInstructorOrTA &&
    selectedNode &&
    nodeData?.node_type !== "text" &&
    nodeData?.node_type !== "comment"
  ) {
    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        <Tabs defaultValue="student-view" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 mb-0">
            <TabsTrigger value="student-view">Student View</TabsTrigger>
            <TabsTrigger value="grading">
              Grading ({selectedNode?.id ? "?" : "0"})
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="student-view"
            className="flex-1 overflow-hidden mt-0"
          >
            <div className="h-full flex flex-col bg-background overflow-hidden">
              {/* Header Section - Fixed */}
              <div className="flex-shrink-0 border-b">
                <NodeHeaderView
                  nodeData={nodeData}
                  progress={progress as any}
                  currentUser={currentUser}
                  hasStarted={!!hasStarted}
                  isStarting={isStarting}
                  onStartNode={handleStartNode}
                />
              </div>

              {/* Content Section - Scrollable */}
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="p-4 space-y-6 min-h-full">
                  {/* Learning Content */}
                  <LearningContentView
                    nodeContent={memoizedNodeContent}
                  />

                  {/* Assessment Section */}
                  {assessment && (
                    <AssessmentSection
                      nodeId={selectedNode.id}
                      mapId={mapId}
                      assessment={assessment}
                      canResubmit={canResubmit}
                      showAssessmentForm={false} // Instructors don't submit
                      assessmentAnswer={assessmentAnswer}
                      setAssessmentAnswer={setAssessmentAnswer}
                      quizAnswers={quizAnswers}
                      setQuizAnswers={setQuizAnswers}
                      isSubmitting={isSubmitting}
                      onSubmit={handleSubmitAssessment}
                      submissionsWithGrades={submissionsWithGrades}
                      progressStatus={progress?.status}
                    />
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="grading" className="flex-1 overflow-hidden mt-0">
            <InstructorGradingPanel
              mapId={mapId}
              selectedNode={selectedNode}
              userId={currentUser?.id || ""}
              onGradingComplete={onProgressUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Regular student view (or text/comment nodes for instructors)
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
        {hasStarted ||
          nodeData?.node_type === "text" ||
          nodeData?.node_type === "comment" ? (
          <div className="p-4 space-y-6 min-h-full">
            {nodeData?.node_type === "text" ? (
              <div className="p-4">
                <TextNode
                  data={editableNodeData || nodeData}
                  selected
                  // Do not allow double-click to edit in the viewer/panel — editing is performed via the inline control
                  allowDoubleClick={false}
                  showHint={false}
                  showEditButton={false}
                  onDataChange={(d) => {
                    // Optimistic update
                    setEditableNodeData((prev) =>
                      prev ? { ...prev, ...d } : (nodeData as MapNode)
                    );
                    // Persist to DB
                    persistTextNodeEdit(d as Partial<MapNode>);
                  }}
                />
              </div>
            ) : nodeData?.node_type === "comment" ? (
              <div className="p-4">
                <CommentNode
                  data={editableNodeData || nodeData}
                  selected
                  userRole={userRole}
                  allowEdit={isInstructorOrTA}
                  allowDoubleClick={false}
                  showHint={false}
                  showEditButton={true}
                  onDataChange={(d) => {
                    // Optimistic update
                    setEditableNodeData((prev) =>
                      prev ? { ...prev, ...d } : (nodeData as MapNode)
                    );
                    // Persist to DB
                    persistTextNodeEdit(d as Partial<MapNode>);
                  }}
                />
              </div>
            ) : (
              <>
                {/* Learning Content */}
                <LearningContentView
                  nodeContent={memoizedNodeContent}
                />

                {/* Mark as Complete Button for nodes without assessments */}
                {!assessment && !isPassed && (
                  <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckSquare className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-green-900 mb-2">
                          Ready to Continue?
                        </h3>
                        <p className="text-sm text-green-700 max-w-md">
                          You've reviewed the content. Mark this node as complete to unlock the next step in your learning journey.
                        </p>
                      </div>
                      <Button
                        onClick={handleMarkAsComplete}
                        disabled={isSubmitting}
                        className="w-full max-w-md bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md"
                        size="lg"
                      >
                        {isSubmitting ? (
                          <Clock className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <CheckSquare className="h-5 w-5 mr-2" />
                        )}
                        {isSubmitting ? "Marking Complete..." : "Mark as Complete"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Completion Badge for already completed nodes without assessments */}
                {!assessment && isPassed && (
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-center justify-center space-x-3">
                      <CheckCircle className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900">
                          Node Completed!
                        </h3>
                        <p className="text-sm text-blue-700">
                          Great job! You can now proceed to the next node.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assessment Section */}
                {assessment && (
                  <AssessmentSection
                    nodeId={selectedNode.id}
                    mapId={mapId}
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
                    progressStatus={progress?.status}
                  />
                )}
              </>
            )}
          </div>
        ) : (
          <div className="p-8 text-center flex flex-col justify-center min-h-full">
            <div
              className={`w-20 h-20 mx-auto ${isNodeUnlocked
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
