"use client";

import { useState, useEffect, useMemo } from "react";
import { Node } from "@xyflow/react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  Play,
  Upload,
  Lock,
  Users,
  UserCheck,
  MessageSquare,
  HelpCircle,
  Crown,
  User,
  CheckSquare,
  CheckCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TextNode } from "@/components/map/MapEditor/components/TextNode";
import { MapNode, AssessmentSubmission, SubmissionGrade } from "@/types/map";
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
import { CommentNode } from "./CommentNode";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUserTeamForMap } from "@/lib/supabase/maps";
import {
  getTeamProgress,
  startTeamNodeProgress,
  assignTeamMemberToNode,
  requestHelpForTeamNode,
  getTeamMembers,
} from "@/lib/supabase/team-progress";
import { getProfilesByIds, type MinimalProfile } from "@/lib/supabase/profiles";

interface TeamNodeViewPanelProps {
  selectedNode: Node<Record<string, unknown> & MapNode> | null;
  mapId: string;
  teamId: string;
  onProgressUpdate?: () => void;
  isNodeUnlocked?: boolean;
  userRole?: "instructor" | "TA" | "student" | "admin";
  isInstructorOrTA?: boolean;
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

interface TeamSubmissionWithGrade {
  submission: AssessmentSubmission;
  grade: SubmissionGrade | null;
  submitterId?: string;
  submitter: {
    username: string;
    full_name: string | null;
  };
}

export function TeamNodeViewPanel({
  selectedNode,
  mapId,
  teamId,
  onProgressUpdate,
  isNodeUnlocked = true,
  userRole = "student",
  isInstructorOrTA = false,
}: TeamNodeViewPanelProps) {
  const [teamProgress, setTeamProgress] = useState<Record<string, any>>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [submissionsWithGrades, setSubmissionsWithGrades] = useState<
    TeamSubmissionWithGrade[]
  >([]);
  const [profilesById, setProfilesById] = useState<
    Record<string, MinimalProfile>
  >({});
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentAnswer, setAssessmentAnswer] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!!selectedNode);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [helpMessage, setHelpMessage] = useState<string>("");
  const { toast } = useToast();

  const nodeData = selectedNode?.data;
  const [editableNodeData, setEditableNodeData] = useState<MapNode | null>(
    nodeData || null
  );
  const assessment = nodeData?.node_assessments?.[0];

  // Get current node progress
  const currentProgress = teamProgress[selectedNode?.id || ""];
  const isTeamLeader =
    teamMembers.find((m) => m.user_id === currentUser?.id)?.is_leader || false;

  // Determine team progress states
  const hasStarted =
    currentProgress && currentProgress.status !== "not_started";
  const isNotStarted =
    !currentProgress || currentProgress.status === "not_started";
  const isGraded =
    currentProgress?.status === "passed" ||
    currentProgress?.status === "failed";
  const isPassed = currentProgress?.status === "passed";
  const isFailed = currentProgress?.status === "failed";
  const isSubmittedAndPending =
    currentProgress?.status === "submitted" && !isGraded;
  const isInProgress =
    currentProgress?.status === "in_progress" ||
    currentProgress?.status === "assigned";
  const canResubmit = isFailed;

  // Show assessment form for team members
  const showAssessmentForm =
    (canResubmit ||
      (hasStarted && !isSubmittedAndPending && !isPassed) ||
      isInProgress) &&
    !isInstructorOrTA;

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
    setEditableNodeData(nodeData || null);
    setTeamProgress({});
    setSubmissionsWithGrades([]);
    setAssessmentAnswer("");
    setQuizAnswers({});

    if (selectedNode && currentUser && teamId) {
      setIsLoading(true);
      loadTeamData();
    } else {
      setIsLoading(false);
    }
  }, [selectedNode?.id, currentUser, teamId]);

  const loadTeamData = async () => {
    if (!selectedNode || !currentUser || !teamId) return;

    setIsLoading(true);
    try {
      // Load team progress for this map
      const progress = await getTeamProgress(mapId, teamId);
      setTeamProgress(progress);

      // Hydrate submitter profiles for progress (no nested select)
      const submittedByIds = Array.from(
        new Set(
          Object.values(progress)
            .map((p: any) => p?.submitted_by)
            .filter(Boolean) as string[]
        )
      );
      if (submittedByIds.length > 0) {
        try {
          const profMap = await getProfilesByIds(submittedByIds);
          setProfilesById(profMap);
        } catch (e) {
          console.warn("Failed to hydrate submitter profiles:", e);
        }
      } else {
        setProfilesById({});
      }

      // Load team members using the team-progress library (already returns nested profiles)
      const members = await getTeamMembers(teamId);
      setTeamMembers(members as any);

      // Load team submissions for this node
      const currentNodeProgress = progress[selectedNode.id];
      if (currentNodeProgress && assessment) {
        await loadTeamSubmissions();
      }
    } catch (error) {
      console.error("Error loading team data:", error);
      toast({
        title: "Error loading team data",
        description: "Some team information may not be available",
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

      // Get submissions from team members for this assessment
      // Resolve team member user IDs first (avoid passing builders into .in())
      const { data: teamMemberships } = await supabase
        .from("team_memberships")
        .select("user_id")
        .eq("team_id", teamId)
        .is("left_at", null);

      const userIds = teamMemberships?.map((tm: any) => tm.user_id) || [];
      if (userIds.length === 0) {
        setSubmissionsWithGrades([]);
        return;
      }

      // Get progress IDs for these users on the selected node
      const { data: progresses } = await supabase
        .from("student_node_progress")
        .select("id")
        .eq("node_id", selectedNode!.id)
        .in("user_id", userIds);

      const progressIds = progresses?.map((p: any) => p.id) || [];
      if (progressIds.length === 0) {
        setSubmissionsWithGrades([]);
        return;
      }

      // Finally query submissions for those progress IDs
      const { data: teamSubmissions } = await supabase
        .from("assessment_submissions")
        .select(
          `
          *,
          student_node_progress!inner(
            user_id,
            profiles:user_id(username, full_name)
          )
        `
        )
        .eq("assessment_id", assessment.id)
        .in("progress_id", progressIds);

      if (teamSubmissions) {
        const submissionsWithGradesData = await Promise.all(
          teamSubmissions.map(async (submission: any) => {
            let gradeData = null;
            try {
              gradeData = await getSubmissionGrade(submission.id);
            } catch (error) {
              console.warn(
                `Could not fetch grade for submission ${submission.id}:`,
                error
              );
            }

            return {
              submission,
              grade: gradeData,
              submitterId: submission?.student_node_progress?.user_id,
              submitter: submission?.student_node_progress?.profiles,
            } as TeamSubmissionWithGrade;
          })
        );

        setSubmissionsWithGrades(submissionsWithGradesData);
      }
    } catch (error) {
      console.error("Error loading team submissions:", error);
    }
  };

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

      setEditableNodeData((prev) => (prev ? { ...prev, ...data } : prev));

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

  const handleStartTeamNode = async () => {
    if (!selectedNode || !currentUser || !teamId) {
      toast({
        title: "Cannot start node",
        description: "Missing required information",
        variant: "destructive",
      });
      return;
    }

    if (hasStarted) {
      toast({
        title: "Node already started",
        description: "This node is already in progress by your team",
        variant: "destructive",
      });
      return;
    }

    setIsStarting(true);
    try {
      // Start team node progress for current user
      await startTeamNodeProgress(
        currentUser.id,
        selectedNode.id,
        mapId,
        teamId
      );

      // Reload team data to update progress
      await loadTeamData();
      onProgressUpdate?.();

      toast({
        title: "Node started for team!",
        description: "Your team can now work on this node together.",
      });
    } catch (error) {
      console.error("Error starting team node:", error);
      toast({
        title: "Error starting node",
        description:
          error instanceof Error ? error.message : "Failed to start node",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleAssignMember = async () => {
    if (!assignedTo || !selectedNode) return;

    try {
      await assignTeamMemberToNode(teamId, selectedNode.id, assignedTo);
      await loadTeamData();
      onProgressUpdate?.();
      setAssignedTo("");

      const assignedMember = teamMembers.find((m) => m.user_id === assignedTo);
      toast({
        title: "Member assigned",
        description: `${assignedMember?.profiles.username} has been assigned to this node.`,
      });
    } catch (error) {
      console.error("Error assigning team member:", error);
      toast({
        title: "Assignment failed",
        description: "Could not assign team member to this node",
        variant: "destructive",
      });
    }
  };

  const handleRequestHelp = async () => {
    if (!helpMessage.trim() || !selectedNode) return;

    try {
      await requestHelpForTeamNode(teamId, selectedNode.id, helpMessage);
      await loadTeamData();
      onProgressUpdate?.();
      setHelpMessage("");

      toast({
        title: "Help requested",
        description: "Your request has been sent to the instructor.",
      });
    } catch (error) {
      console.error("Error requesting help:", error);
      toast({
        title: "Request failed",
        description: "Could not send help request",
        variant: "destructive",
      });
    }
  };

  const handleSubmitAssessment = async (
    fileUrls?: string[],
    fileNames?: string[],
    checklistData?: Record<string, boolean>
  ) => {
    if (!selectedNode || !currentUser || !assessment) {
      toast({
        title: "Cannot submit assessment",
        description: "Missing required information",
        variant: "destructive",
      });
      return;
    }

    // First, ensure the user has started this node individually
    setIsSubmitting(true);
    try {
      // Get or create individual progress
      let userProgress = await getStudentProgress(
        currentUser.id,
        selectedNode.id,
        mapId
      );

      if (!userProgress) {
        userProgress = await startNodeProgress(
          currentUser.id,
          selectedNode.id,
          mapId
        );
      }

      if (!userProgress) {
        throw new Error("Could not create progress record");
      }

      // Create submission data
      const submissionData: Partial<AssessmentSubmission> = {
        progress_id: userProgress.id,
        assessment_id: assessment.id,
      };

      // Handle different assessment types (same logic as individual NodeViewPanel)
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
        const questions = assessment.quiz_questions || [];
        const answeredQuestions = Object.keys(quizAnswers).length;

        if (answeredQuestions < questions.length) {
          toast({
            title: "Incomplete quiz",
            description: `Please answer all ${questions.length} questions before submitting.`,
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
        submissionData.file_urls = fileUrls.filter(
          (url) => url && url.trim().length > 0
        );
      } else if (assessment.assessment_type === "checklist") {
        if (!checklistData) {
          toast({
            title: "Checklist data missing",
            description: "Please complete all checklist items.",
            variant: "destructive",
          });
          return;
        }
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
        (submissionData as any).metadata = {
          checklist_completion: checklistData,
        };
      }

      await createAssessmentSubmission(submissionData);

      // Clear form data
      setAssessmentAnswer("");
      setQuizAnswers({});

      // Refresh team data
      await loadTeamData();
      onProgressUpdate?.();

      toast({
        title: "Submitted for team!",
        description: "Your submission has been recorded for your team.",
      });
    } catch (error) {
      console.error("Error submitting team assessment:", error);
      toast({
        title: "Submission failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit assessment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
      console.log("✅ Marking team node as complete...");
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

      // Reload team data to update progress
      await loadTeamData();
      onProgressUpdate?.();

      toast({
        title: "Node completed!",
        description: "Great job! Your team can now continue to the next node.",
      });

      console.log("✅ Team node marked as complete:", updatedProgress);
    } catch (error) {
      console.error("❌ Error marking team node as complete:", error);

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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      not_started: { label: "Not Started", variant: "secondary", icon: Clock },
      assigned: { label: "Assigned", variant: "outline", icon: UserCheck },
      in_progress: { label: "In Progress", variant: "default", icon: Clock },
      submitted: {
        label: "Submitted",
        variant: "default",
        icon: MessageSquare,
      },
      passed: { label: "Passed", variant: "success", icon: Users },
      failed: { label: "Failed", variant: "destructive", icon: Users },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.not_started;
    const IconComponent = config.icon;

    return (
      <Badge
        variant={config.variant as any}
        className="flex items-center gap-1"
      >
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (!selectedNode) {
    return <NoNodeSelectedView />;
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
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
        <div className="flex-1 p-4 space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle text and comment nodes (same as individual)
  if (nodeData?.node_type === "text" || nodeData?.node_type === "comment") {
    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        <div className="flex-shrink-0 border-b">
          <NodeHeaderView
            nodeData={nodeData}
            progress={null}
            currentUser={currentUser}
            hasStarted={false}
            isStarting={false}
            onStartNode={() => {}}
          />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="p-4 space-y-6 min-h-full">
            {nodeData?.node_type === "text" ? (
              <TextNode
                data={editableNodeData || nodeData}
                selected
                allowDoubleClick={false}
                showHint={false}
                showEditButton={false}
                onDataChange={(d) => {
                  setEditableNodeData((prev) =>
                    prev ? { ...prev, ...d } : (nodeData as MapNode)
                  );
                  persistTextNodeEdit(d as Partial<MapNode>);
                }}
              />
            ) : (
              <CommentNode
                data={editableNodeData || nodeData}
                selected
                userRole={userRole}
                allowEdit={isInstructorOrTA}
                allowDoubleClick={false}
                showHint={false}
                showEditButton={true}
                onDataChange={(d) => {
                  setEditableNodeData((prev) =>
                    prev ? { ...prev, ...d } : (nodeData as MapNode)
                  );
                  persistTextNodeEdit(d as Partial<MapNode>);
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header Section */}
      <div className="flex-shrink-0 border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-sm">Team Node</span>
          </div>
          {getStatusBadge(currentProgress?.status || "not_started")}
        </div>

        {/* Node Header */}
        <NodeHeaderView
          nodeData={nodeData}
          progress={null}
          currentUser={currentUser}
          hasStarted={hasStarted}
          isStarting={isStarting}
          onStartNode={handleStartTeamNode}
        />

        {/* Team Status and Assignment Info */}
        {hasStarted && (
          <div className="mt-4 p-3 bg-muted border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Team Progress
              </span>
              {currentProgress?.help_requested && (
                <Badge
                  variant="destructive"
                  className="flex items-center gap-1"
                >
                  <HelpCircle className="h-3 w-3" />
                  Help Requested
                </Badge>
              )}
            </div>

            {/* Assigned to */}
            {(() => {
              const assignedMember = teamMembers.find(
                (m) => m.user_id === currentProgress?.assigned_to
              );
              if (!assignedMember) return null;

              const initials = (assignedMember.profiles?.full_name || assignedMember.profiles?.username || "")
                .split(" ")
                .map(s => s[0])
                .join("")
                .slice(0,2)
                .toUpperCase();

              return (
                <div className="flex items-center gap-3 mt-2 mb-2">
                  {assignedMember.profiles?.avatar_url ? (
                    <img
                      src={assignedMember.profiles.avatar_url}
                      alt={assignedMember.profiles?.username || assignedMember.profiles?.full_name || "avatar"}
                      className="h-8 w-8 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700 border">
                      {initials || "?"}
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{assignedMember.profiles?.username || assignedMember.profiles?.full_name || "Unknown"}</span>
                      <Badge variant="secondary" className="text-xs">Assigned</Badge>
                    </div>
                    {assignedMember.profiles?.full_name && (
                      <div className="text-xs text-muted-foreground">{assignedMember.profiles.full_name}</div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Submitted by (from team progress) */}
            {currentProgress?.submitted_by && (
              <div className="mt-2 flex items-center gap-2">
                {(() => {
                  const prof =
                    profilesById[currentProgress.submitted_by] || null;
                  const initials = (
                    prof?.username?.[0] ||
                    prof?.full_name?.[0] ||
                    "?"
                  ).toUpperCase();
                  return (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={prof?.avatar_url || ""} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="text-xs text-muted-foreground">
                        Submitted by{" "}
                        <span className="text-foreground font-medium">
                          {prof?.full_name || "Unknown user"}
                        </span>{" "}
                        {prof?.username && (
                          <span className="text-muted-foreground">
                            @{prof.username}
                          </span>
                        )}
                        {currentProgress?.completed_at && (
                          <span className="ml-2">
                            • {formatRelativeTime(currentProgress.completed_at)}
                          </span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {submissionsWithGrades.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {submissionsWithGrades.length} team submission
                {submissionsWithGrades.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {hasStarted ? (
          <div className="p-4 space-y-6 min-h-full">
            {/* Learning Content */}
            <LearningContentView nodeContent={nodeData?.node_content || []} />

            {/* Team Management Section (for leaders) */}
            {isTeamLeader && (
              <div className="space-y-4 p-4 border border-amber-200 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900">
                    Team Leader Actions
                  </span>
                </div>

                {/* Assign Member */}
                <div className="flex gap-2">
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Assign team member to this node" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {member.profiles?.username ||
                              member.profiles?.full_name ||
                              "Unknown"}
                            {member.is_leader && (
                              <Crown className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAssignMember}
                    disabled={!assignedTo || isLoading}
                    size="sm"
                    variant="outline"
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Assign
                  </Button>
                </div>
              </div>
            )}

            {/* Help Request Section */}
            <div className="space-y-4 p-4 border border-border bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Request Help from Instructor
                </span>
              </div>

              {currentProgress?.help_request_message ? (
                <div className="p-3 bg-muted border border-border rounded text-sm">
                  <p className="font-medium text-foreground">
                    Current Help Request:
                  </p>
                  <p className="text-muted-foreground">
                    {currentProgress.help_request_message}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Describe what help your team needs..."
                    value={helpMessage}
                    onChange={(e) => setHelpMessage(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleRequestHelp}
                    disabled={!helpMessage.trim() || isLoading}
                    variant="outline"
                    size="sm"
                  >
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Request Help
                  </Button>
                </div>
              )}
            </div>

            {/* Team Activity: Submissions with submitter profile details */}
            {submissionsWithGrades.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Team Submissions
                </h3>
                {submissionsWithGrades.map((item, index) => {
                  const prof =
                    (item.submitterId && profilesById[item.submitterId]) ||
                    null;
                  const initials = (
                    prof?.username?.[0] ||
                    prof?.full_name?.[0] ||
                    item.submitter?.username?.[0] ||
                    "?"
                  ).toUpperCase();
                  return (
                    <div
                      key={index}
                      className="p-4 border border-border rounded-lg bg-muted"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={prof?.avatar_url || ""} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="text-sm">
                            <div className="text-foreground font-medium">
                              {prof?.full_name ||
                                item.submitter.full_name ||
                                "Unknown user"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              @
                              {prof?.username ||
                                item.submitter.username ||
                                "unknown"}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(item.submission.submitted_at)}
                        </span>
                      </div>

                      {item.grade ? (
                        <Badge
                          variant={
                            item.grade.grade === "pass"
                              ? "default"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {item.grade.grade === "pass" ? "Passed" : "Failed"}
                          {item.grade.points_awarded != null &&
                            ` (${item.grade.points_awarded} pts)`}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Pending Review
                        </Badge>
                      )}

                      {/* Artifacts (files) */}
                      {Array.isArray(item.submission.file_urls) &&
                        item.submission.file_urls.length > 0 && (
                          <div className="mt-2 text-xs">
                            <span className="text-muted-foreground">
                              Files:
                            </span>{" "}
                            {item.submission.file_urls.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline text-foreground mr-2"
                              >
                                File {i + 1}
                              </a>
                            ))}
                          </div>
                        )}

                      {/* Text answer preview */}
                      {item.submission.text_answer && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground mr-1">
                            Answer:
                          </span>
                          {item.submission.text_answer.length > 160
                            ? `${item.submission.text_answer.substring(0, 160)}…`
                            : item.submission.text_answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mark as Complete Button for team nodes without assessments */}
            {!assessment && !isPassed && !isInstructorOrTA && (
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
                      Your team has reviewed the content. Mark this node as complete to unlock the next step in your team's learning journey.
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

            {/* Completion Badge for already completed team nodes without assessments */}
            {!assessment && isPassed && !isInstructorOrTA && (
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center justify-center space-x-3">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">
                      Team Node Completed!
                    </h3>
                    <p className="text-sm text-blue-700">
                      Great job! Your team can now proceed to the next node.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Assessment Section */}
            {assessment && showAssessmentForm && (
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
                submissionsWithGrades={submissionsWithGrades as any}
                progressStatus={currentProgress?.status}
              />
            )}
          </div>
        ) : (
          <div className="p-8 text-center flex flex-col justify-center min-h-full">
            <div
              className={`w-20 h-20 mx-auto ${
                isNodeUnlocked ? "bg-muted" : "bg-muted"
              } rounded-full flex items-center justify-center mb-6`}
            >
              {isNodeUnlocked ? (
                <Users className="h-10 w-10 text-foreground" />
              ) : (
                <Lock className="h-10 w-10 text-muted-foreground" />
              )}
            </div>

            {isNodeUnlocked ? (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Ready for Team Collaboration?
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
                  Start this node for your team to begin collaborating and
                  submitting assessments together.
                </p>
                {currentUser && (
                  <Button
                    onClick={handleStartTeamNode}
                    disabled={isStarting}
                    className="w-full"
                    size="lg"
                  >
                    {isStarting ? (
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4 mr-2" />
                    )}
                    Start Team Node
                  </Button>
                )}
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Node Locked
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
                  Your team must complete the previous nodes to unlock this
                  content.
                </p>
                <Button disabled className="w-full" size="lg">
                  <Lock className="h-4 w-4 mr-2" />
                  Locked - Complete Prerequisites
                </Button>
              </>
            )}

            {!currentUser && (
              <p className="text-sm text-muted-foreground mt-4">
                Please log in to collaborate with your team.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Utilities */
function formatRelativeTime(dateIso: string | null | undefined): string {
  if (!dateIso) return "";
  const date = new Date(dateIso);
  const diff = (Date.now() - date.getTime()) / 1000; // seconds
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (diff < 60) return rtf.format(-Math.round(diff), "second");
  const mins = diff / 60;
  if (mins < 60) return rtf.format(-Math.round(mins), "minute");
  const hours = mins / 60;
  if (hours < 24) return rtf.format(-Math.round(hours), "hour");
  const days = hours / 24;
  return rtf.format(-Math.round(days), "day");
}
