// app/components/NodeViewPanel/AssessmentSection.tsx
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckSquare,
  Upload,
  AlertCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  UserCheck,
  Circle,
  X,
} from "lucide-react";
import {
  NodeAssessment,
  QuizQuestion,
  AssessmentGroupWithMembers,
} from "@/types/map";
import { SubmissionItem } from "./SubmissionItem"; // Assuming component is created
import {
  getUserAssessmentGroup,
  getGroupMembersSubmissionStatus,
} from "@/lib/supabase/assessment-groups";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";

// Utility function to create a deterministic random number generator
function createSeededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return function () {
    hash = Math.imul(hash ^ (hash >>> 15), hash | 1);
    hash ^= hash + Math.imul(hash ^ (hash >>> 7), hash | 61);
    return ((hash ^ (hash >>> 14)) >>> 0) / 4294967296;
  };
}

// Function to shuffle array with deterministic randomization
function shuffleArray<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];
  const random = createSeededRandom(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

interface AssessmentSectionProps {
  assessment: NodeAssessment;
  canResubmit: boolean;
  showAssessmentForm: boolean;
  assessmentAnswer: string;
  setAssessmentAnswer: (value: string) => void;
  quizAnswers: Record<string, string>;
  setQuizAnswers: (value: React.SetStateAction<Record<string, string>>) => void;
  isSubmitting: boolean;
  onSubmit: (
    fileUrl?: string[],
    fileName?: string[],
    checklistData?: Record<string, boolean>
  ) => void;
  submissionsWithGrades: { submission: any; grade: any }[]; // Adjust type as needed
  nodeId: string;
  progressStatus?:
    | "not_started"
    | "in_progress"
    | "submitted"
    | "passed"
    | "failed";
}

const renderQuizQuestion = (
  question: QuizQuestion,
  index: number,
  quizAnswers: Record<string, string>,
  setQuizAnswers: (value: React.SetStateAction<Record<string, string>>) => void
) => (
  <Card key={question.id} className="bg-muted/30">
    <CardContent className="p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
          {index + 1}
        </div>
        <p className="font-medium text-foreground flex-1">
          {question.question_text}
        </p>
      </div>
      <div className="space-y-2 ml-9">
        {question.options && question.options.length > 0 ? (
          // Multiple choice or true/false questions with options
          question.options.map((option) => (
            <label
              key={option.option}
              className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-background cursor-pointer transition-colors"
            >
              <input
                type="radio"
                name={question.id}
                value={option.option}
                checked={quizAnswers[question.id] === option.option}
                onChange={(e) =>
                  setQuizAnswers((prev) => ({
                    ...prev,
                    [question.id]: e.target.value,
                  }))
                }
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm">{option.text}</span>
            </label>
          ))
        ) : (
          // Single answer questions without options - render text input
          <div className="p-3 rounded-lg border bg-background">
            <Input
              type="text"
              placeholder="Type your answer here..."
              value={quizAnswers[question.id] || ""}
              onChange={(e) =>
                setQuizAnswers((prev) => ({
                  ...prev,
                  [question.id]: e.target.value,
                }))
              }
              className="w-full"
            />
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export function AssessmentSection({
  assessment,
  canResubmit,
  showAssessmentForm,
  assessmentAnswer,
  setAssessmentAnswer,
  quizAnswers,
  setQuizAnswers,
  isSubmitting,
  onSubmit,
  submissionsWithGrades,
  nodeId,
  progressStatus,
}: AssessmentSectionProps) {
  const [isFileRequired, setIsFileRequired] = useState(false);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>(
    {}
  );
  const [isUploading, setIsUploading] = useState(false);
  const [userGroup, setUserGroup] = useState<AssessmentGroupWithMembers | null>(
    null
  );
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [groupMembersStatus, setGroupMembersStatus] = useState<
    Array<{
      user_id: string;
      full_name: string | null;
      username: string | null;
      has_submitted: boolean;
      submitted_at: string | null;
    }>
  >([]);
  const [groupHasSubmission, setGroupHasSubmission] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  // Generate randomized questions for this user (consistent across page refreshes)
  const displayQuestions = useMemo(() => {
    if (!assessment.quiz_questions || assessment.quiz_questions.length === 0) {
      return [];
    }

    // If randomization is not enabled, return all questions in order
    if (!assessment.metadata?.randomize_questions) {
      return assessment.quiz_questions;
    }

    // Create a deterministic seed using user ID + assessment ID
    const seed = `${user?.id || "anonymous"}-${assessment.id}`;

    // Shuffle all questions deterministically
    const shuffledQuestions = shuffleArray(assessment.quiz_questions, seed);

    // Get the number of questions to show
    const questionsToShow =
      assessment.metadata?.questions_to_show ||
      assessment.quiz_questions.length;
    const actualQuestionsToShow = Math.min(
      questionsToShow,
      shuffledQuestions.length
    );

    // Return the specified number of shuffled questions
    return shuffledQuestions.slice(0, actualQuestionsToShow);
  }, [assessment.quiz_questions, assessment.metadata, assessment.id, user?.id]);

  // Initialize checklist items from assessment metadata
  useEffect(() => {
    if (
      assessment.assessment_type === "checklist" &&
      assessment.metadata?.checklist_items
    ) {
      const initialChecklist: Record<string, boolean> = {};
      assessment.metadata.checklist_items.forEach((item: any) => {
        initialChecklist[item.id] = false;
      });
      setChecklistItems(initialChecklist);
    }
  }, [assessment]);

  // Load user's group if this is a group assessment
  useEffect(() => {
    const loadUserGroup = async () => {
      if (!assessment.is_group_assessment || !user) {
        setUserGroup(null);
        setGroupMembersStatus([]);
        return;
      }

      setLoadingGroup(true);
      try {
        console.log("👥 Loading user's group for assessment:", assessment.id);
        const group = await getUserAssessmentGroup(assessment.id, user.id);
        setUserGroup(group);
        console.log("✅ User group loaded:", group);

        // Load submission status for group members
        if (group) {
          console.log("📊 Loading submission status for group members...");
          const membersStatus = await getGroupMembersSubmissionStatus(
            assessment.id,
            group.id
          );
          setGroupMembersStatus(membersStatus);

          // Check if any group member has submitted (for single submission mode)
          const hasSubmission = membersStatus.some(
            (member) => member.has_submitted
          );
          setGroupHasSubmission(hasSubmission);

          console.log(
            "✅ Group members submission status loaded:",
            membersStatus
          );
          console.log("🔍 Group has submission:", hasSubmission);
        }
      } catch (error) {
        console.error("❌ Failed to load user group:", error);
        toast({
          title: "Failed to load group information",
          description: "Could not fetch your group members.",
          variant: "destructive",
        });
      } finally {
        setLoadingGroup(false);
      }
    };

    loadUserGroup();
  }, [assessment.id, assessment.is_group_assessment, user, toast]);

  // Check if file is required for submission
  const validateSubmission = () => {
    if (assessment.assessment_type === "file_upload" && fileUrls.length === 0) {
      setIsFileRequired(true);
      return false;
    }

    // For checklist, ensure all items are checked
    if (assessment.assessment_type === "checklist") {
      const allChecked = Object.values(checklistItems).every(
        (checked) => checked
      );
      if (!allChecked) {
        return false;
      }
    }

    setIsFileRequired(false);
    return true;
  };

  const handleChecklistToggle = (itemId: string) => {
    setChecklistItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleFileUpload = (url: string, name: string) => {
    setFileUrls((prev) => [...prev, url]);
    setFileNames((prev) => [...prev, name]);
    setIsFileRequired(false);
    setFileSizeError(null); // Clear any previous file size error
  };

  const handleFileSizeError = (error: string) => {
    setFileSizeError(error);
    // Also clear the file required error since we're showing a different error
    setIsFileRequired(false);
  };

  const handleSubmit = () => {
    // Check if attempt limit is reached for multiple attempt assessments
    const hasReachedAttemptLimit =
      !canResubmit &&
      progressStatus === "failed" &&
      (assessment.metadata?.allow_multiple_attempts ?? true) &&
      submissionsWithGrades.length >= (assessment.metadata?.max_attempts || 3);

    if (hasReachedAttemptLimit) {
      console.warn("⚠️ Submission blocked: Maximum attempts reached");
      toast({
        title: "Maximum Attempts Reached",
        description: `You have used all ${assessment.metadata?.max_attempts || 3} attempts for this assessment.`,
        variant: "destructive",
      });
      return;
    }

    // Check if single attempt assessment already has a submission
    const isSingleAttemptWithSubmission =
      !(assessment.metadata?.allow_multiple_attempts ?? true) &&
      submissionsWithGrades.length > 0;

    if (isSingleAttemptWithSubmission) {
      console.warn(
        "⚠️ Submission blocked: Single attempt assessment already submitted"
      );
      toast({
        title: "Submission Not Allowed",
        description:
          "This assessment allows only one submission attempt and you have already submitted.",
        variant: "destructive",
      });
      return;
    }

    if (validateSubmission()) {
      if (assessment.assessment_type === "checklist") {
        onSubmit(undefined, undefined, checklistItems);
      } else {
        onSubmit(fileUrls, fileNames);
      }
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Assessment
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="capitalize">
              {assessment.assessment_type.replace(/_/g, " ")}
            </Badge>
            {assessment.assessment_type === "quiz" && (
              <Badge variant="secondary">
                {displayQuestions.length} Question
                {displayQuestions.length !== 1 ? "s" : ""}
                {assessment.metadata?.randomize_questions &&
                  displayQuestions.length !==
                    (assessment.quiz_questions?.length || 0) && (
                    <span className="text-xs ml-1">
                      (of {assessment.quiz_questions?.length || 0})
                    </span>
                  )}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Group Members Section */}
        {assessment.is_group_assessment && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-800 mb-2">
                  Group Assessment
                </p>
                <p className="text-sm text-blue-700 mb-3">
                  This assessment will be completed as a group. Any submission
                  will be shared with all group members.
                </p>

                {loadingGroup ? (
                  <div className="text-sm text-blue-600">
                    Loading group members...
                  </div>
                ) : userGroup ? (
                  <div>
                    <p className="text-sm font-medium text-blue-800 mb-2">
                      Your Group: {userGroup.group_name}
                    </p>
                    <div className="space-y-1">
                      {groupMembersStatus.length > 0
                        ? groupMembersStatus.map((member) => {
                            const isCurrentUser = member.user_id === user?.id;
                            return (
                              <div
                                key={member.user_id}
                                className="flex items-center gap-2 text-sm"
                              >
                                {member.has_submitted ? (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Circle className="h-3 w-3 text-gray-400" />
                                )}
                                <span
                                  className={
                                    member.has_submitted
                                      ? "text-green-700"
                                      : "text-blue-700"
                                  }
                                >
                                  {member.full_name ||
                                    member.username ||
                                    "Unknown User"}
                                  {isCurrentUser && (
                                    <span className="text-blue-500 ml-1">
                                      (You)
                                    </span>
                                  )}
                                  {member.has_submitted && (
                                    <span className="text-green-600 ml-2 text-xs">
                                      ✓ Submitted
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })
                        : // Fallback to original display if submission status not loaded
                          userGroup.members.map((member) => (
                            <div
                              key={member.user_id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <UserCheck className="h-3 w-3 text-blue-600" />
                              <span className="text-blue-700">
                                {member.full_name ||
                                  member.username ||
                                  "Unknown User"}
                                {member.user_id === user?.id && (
                                  <span className="text-blue-500 ml-1">
                                    (You)
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    You are not assigned to a group yet. Contact your
                    instructor.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {canResubmit && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">
                  Resubmission Required
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Your previous submission needs improvement. Please review the
                  feedback and try again.
                </p>
                {(assessment.metadata?.allow_multiple_attempts ?? true) && (
                  <p className="text-xs text-yellow-600 mt-2">
                    Attempt {submissionsWithGrades.length + 1} of{" "}
                    {assessment.metadata?.max_attempts || 3}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Attempt Limit Reached */}
        {!canResubmit &&
          progressStatus === "failed" &&
          (assessment.metadata?.allow_multiple_attempts ?? true) &&
          submissionsWithGrades.length >=
            (assessment.metadata?.max_attempts || 3) && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <X className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">
                    Maximum Attempts Reached
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    You have used all {assessment.metadata?.max_attempts || 3}{" "}
                    attempts for this assessment. Contact your instructor if you
                    need additional attempts.
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Single Attempt Only - No Resubmission */}
        {!canResubmit &&
          progressStatus === "failed" &&
          !(assessment.metadata?.allow_multiple_attempts ?? true) && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <X className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">
                    Single Attempt Assessment
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    This assessment allows only one submission attempt. Contact
                    your instructor if you have concerns about your result.
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Single Submission Mode - Already Submitted Warning */}
        {assessment.is_group_assessment &&
          assessment.group_submission_mode === "single_submission" &&
          groupHasSubmission && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">
                    Group Assessment Already Submitted
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    A member of your group has already submitted this
                    assessment. Since this is set to single submission mode, no
                    additional submissions are needed.
                  </p>
                  {groupMembersStatus.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-green-600 font-medium">
                        Submitted by:
                      </p>
                      {groupMembersStatus
                        .filter((member) => member.has_submitted)
                        .map((member) => (
                          <p
                            key={member.user_id}
                            className="text-xs text-green-600"
                          >
                            •{" "}
                            {member.full_name ||
                              member.username ||
                              "Unknown User"}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Group Assessment - Regular Mode with Group Submission */}
        {assessment.is_group_assessment &&
          assessment.group_submission_mode !== "single_submission" &&
          groupHasSubmission &&
          !showAssessmentForm && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">
                    Group Assessment Completed
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    A member of your group has submitted this assessment on
                    behalf of the group. You can now proceed to the next stage.
                  </p>
                  {groupMembersStatus.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-blue-600 font-medium">
                        Submitted by:
                      </p>
                      {groupMembersStatus
                        .filter((member) => member.has_submitted)
                        .map((member) => (
                          <p
                            key={member.user_id}
                            className="text-xs text-blue-600"
                          >
                            •{" "}
                            {member.full_name ||
                              member.username ||
                              "Unknown User"}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {showAssessmentForm &&
          !(
            assessment.is_group_assessment &&
            assessment.group_submission_mode === "single_submission" &&
            groupHasSubmission
          ) && (
            <div className="space-y-4">
              {/* Assessment Prompt - Always show at the top */}
              {(assessment.metadata?.question ||
                assessment.metadata?.prompt ||
                assessment.assessment_type === "quiz") && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 mb-2">
                        {assessment.assessment_type === "quiz"
                          ? "Quiz Instructions"
                          : "Assessment Instructions"}
                      </p>
                      <div className="text-sm text-blue-800 whitespace-pre-wrap space-y-2">
                        {assessment.metadata?.question && (
                          <p>{assessment.metadata.question}</p>
                        )}
                        {assessment.metadata?.prompt && (
                          <p>{assessment.metadata.prompt}</p>
                        )}
                        {assessment.assessment_type === "quiz" &&
                          assessment.metadata?.quiz_description && (
                            <p>{assessment.metadata.quiz_description}</p>
                          )}
                        {assessment.assessment_type === "quiz" &&
                          !assessment.metadata?.question &&
                          !assessment.metadata?.prompt &&
                          !assessment.metadata?.quiz_description && (
                            <p>
                              Complete the quiz below. Answer all questions to
                              the best of your ability.
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Attempt Information */}
              {submissionsWithGrades.length === 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    {!(assessment.metadata?.allow_multiple_attempts ?? true) ? (
                      <span>Single attempt assessment - submit carefully</span>
                    ) : (
                      <span>
                        You have {assessment.metadata?.max_attempts || 3}{" "}
                        attempt
                        {(assessment.metadata?.max_attempts || 3) !== 1
                          ? "s"
                          : ""}{" "}
                        to complete this assessment
                      </span>
                    )}
                  </div>
                </div>
              )}
              {assessment.assessment_type === "text_answer" && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Your Answer
                  </label>
                  <Textarea
                    value={assessmentAnswer}
                    onChange={(e) => setAssessmentAnswer(e.target.value)}
                    placeholder="Type your detailed answer here..."
                    className="min-h-[120px] resize-y"
                  />
                </div>
              )}

              {assessment.assessment_type === "quiz" &&
                displayQuestions.length > 0 && (
                  <div className="space-y-6">
                    {/* Randomization indicator */}
                    {assessment.metadata?.randomize_questions && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>
                            Showing {displayQuestions.length} of{" "}
                            {assessment.quiz_questions?.length || 0} questions
                            (randomized for you)
                          </span>
                        </div>
                      </div>
                    )}

                    {displayQuestions.map((question, index) =>
                      renderQuizQuestion(
                        question,
                        index,
                        quizAnswers,
                        setQuizAnswers
                      )
                    )}
                  </div>
                )}

              {assessment.assessment_type === "checklist" &&
                assessment.metadata?.checklist_items && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">
                        Checklist Items
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Check off each item as you complete it. All items must
                        be checked to submit.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {assessment.metadata.checklist_items.map(
                        (item: any, index: number) => (
                          <Card key={item.id} className="bg-muted/30">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  id={`checklist-${item.id}`}
                                  checked={checklistItems[item.id] || false}
                                  onCheckedChange={() =>
                                    handleChecklistToggle(item.id)
                                  }
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <label
                                    htmlFor={`checklist-${item.id}`}
                                    className="font-medium text-foreground text-sm"
                                  >
                                    {index + 1}. {item.title}
                                  </label>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                {checklistItems[item.id] && (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      )}
                    </div>

                    {/* Checklist completion indicator */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {Object.values(checklistItems).filter(Boolean).length}{" "}
                          of {Object.keys(checklistItems).length} items
                          completed
                        </span>
                        {Object.values(checklistItems).every(
                          (checked) => checked
                        ) ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            All items completed!
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-600">
                            <AlertTriangle className="h-4 w-4" />
                            Complete all items to submit
                          </span>
                        )}
                      </div>
                      <div className="mt-2 w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(Object.values(checklistItems).filter(Boolean).length / Math.max(Object.keys(checklistItems).length, 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

              {assessment.assessment_type === "file_upload" && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Upload Your Work{" "}
                    {isFileRequired && <span className="text-red-500">*</span>}
                  </label>
                  {(isFileRequired || fileSizeError) && (
                    <div className="text-sm text-red-600 mb-2">
                      {fileSizeError ||
                        "Please upload at least one file before submitting."}
                    </div>
                  )}

                  <FileUpload
                    nodeId={nodeId}
                    onUploadComplete={handleFileUpload}
                    onValidationError={handleFileSizeError}
                    onUploadStateChange={setIsUploading}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip"
                    maxSize={10}
                    disabled={isSubmitting}
                    allowMultiple={true}
                  />

                  <p className="text-xs text-muted-foreground">
                    You can upload multiple files. Each file must be under 10MB.
                  </p>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  isUploading ||
                  (assessment.assessment_type === "checklist" &&
                    !Object.values(checklistItems).every(
                      (checked) => checked
                    )) ||
                  // Prevent submission if attempt limit is reached (multiple attempts)
                  (!canResubmit &&
                    progressStatus === "failed" &&
                    (assessment.metadata?.allow_multiple_attempts ?? true) &&
                    submissionsWithGrades.length >=
                      (assessment.metadata?.max_attempts || 3)) ||
                  // Prevent submission for single attempt assessments that already have a submission
                  (!(assessment.metadata?.allow_multiple_attempts ?? true) &&
                    submissionsWithGrades.length > 0)
                }
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md"
                size="lg"
              >
                {isSubmitting ? (
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                ) : isUploading ? (
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isSubmitting
                  ? "Submitting..."
                  : isUploading
                    ? "Uploading Files..."
                    : "Submit Assessment"}
              </Button>
            </div>
          )}

        {/* Submissions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">Your Submissions</h4>
            <Badge variant="outline" className="text-xs">
              {submissionsWithGrades.length} submission
              {submissionsWithGrades.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          {submissionsWithGrades.length > 0 ? (
            <div className="space-y-3">
              {submissionsWithGrades.map(({ submission, grade }, index) => (
                <SubmissionItem
                  key={submission.id}
                  submission={submission}
                  grade={grade}
                  index={index}
                  totalSubmissions={submissionsWithGrades.length}
                  progressStatus={progressStatus}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No submissions yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete the assessment above to submit your work.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
