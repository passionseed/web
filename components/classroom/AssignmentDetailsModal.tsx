"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  CalendarDays,
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Trophy,
  Star,
  Target,
  Zap,
  FileText,
  GraduationCap,
  User,
} from "lucide-react";
import { ClassroomAssignment } from "@/types/classroom";
import { format } from "date-fns";

interface AssignmentDetailsModalProps {
  assignment: ClassroomAssignment & {
    _count?: {
      assignment_nodes: number;
      assignment_enrollments: number;
    };
    progress_stats?: {
      total_students: number;
      completed: number;
      in_progress: number;
      not_started: number;
    };
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
}

interface AssignmentNode {
  id: string;
  node_id: string;
  sequence_order: number;
  is_required: boolean;
  created_at: string;
  map_nodes: {
    id: string;
    title: string;
    instructions: string | null;
    difficulty: number;
    sprite_url: string | null;
    metadata?: any;
  };
  progress?: {
    status: string;
    started_at: string | null;
    completed_at: string | null;
    grade: number | null;
    attempts: number;
    last_activity_at: string | null;
  };
}

interface StudentEnrollment {
  id: string;
  user_id: string;
  assignment_id: string;
  status: string;
  assigned_at: string;
  due_date: string | null;
  completed_at: string | null;
  completion_percentage: number;
  notes: string | null;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    user_profiles?: {
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    }[];
  };
}

interface StudentProgress {
  enrollment: {
    id: string;
    status: string;
    assigned_at: string;
    due_date: string | null;
    completed_at: string | null;
    completion_percentage: number;
  };
  nodes: AssignmentNode[];
  progress_stats: {
    total_nodes: number;
    completed: number;
    in_progress: number;
    not_started: number;
    completion_percentage: number;
  };
  recent_activity: {
    node_id: string;
    status: string;
    last_activity_at: string;
    map_nodes: {
      title: string;
    };
  }[];
}

export function AssignmentDetailsModal({
  assignment,
  open,
  onOpenChange,
  canManage,
}: AssignmentDetailsModalProps) {
  const router = useRouter();
  const [nodes, setNodes] = useState<AssignmentNode[]>([]);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [studentProgress, setStudentProgress] =
    useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && assignment.id) {
      loadAssignmentDetails();
    }
  }, [open, assignment.id]);

  const loadAssignmentDetails = async () => {
    console.log("🔄 [AssignmentModal] Loading assignment details started", {
      assignmentId: assignment.id,
      canManage,
      open,
    });

    setLoading(true);
    setError(null);

    try {
      if (canManage) {
        console.log("👨‍🏫 [AssignmentModal] Loading instructor/TA view data");
        // Load data for instructors/TAs
        const [nodesResponse, enrollmentsResponse] = await Promise.all([
          fetch(`/api/assignments/${assignment.id}/nodes`),
          fetch(`/api/assignments/${assignment.id}/enrollments`),
        ]);

        console.log("📡 [AssignmentModal] API responses:", {
          nodesStatus: nodesResponse.status,
          nodesOk: nodesResponse.ok,
          enrollmentsStatus: enrollmentsResponse.status,
          enrollmentsOk: enrollmentsResponse.ok,
        });

        if (nodesResponse.ok) {
          const nodesData = await nodesResponse.json();
          console.log("✅ [AssignmentModal] Nodes loaded successfully:", {
            count: nodesData?.length || 0,
            nodes:
              nodesData?.map((n: any) => ({
                id: n.id,
                node_id: n.node_id,
                title: n.map_nodes?.title,
              })) || [],
          });
          setNodes(nodesData);
        } else {
          const errorText = await nodesResponse.text();
          console.error("❌ [AssignmentModal] Failed to load nodes:", {
            status: nodesResponse.status,
            statusText: nodesResponse.statusText,
            errorText,
          });
          throw new Error("Failed to load assignment content");
        }

        if (enrollmentsResponse.ok) {
          const enrollmentsData = await enrollmentsResponse.json();
          console.log("✅ [AssignmentModal] Enrollments loaded successfully:", {
            count: enrollmentsData.enrollments?.length || 0,
            canViewAll: enrollmentsData.can_view_all,
            userRole: enrollmentsData.user_role,
          });
          setEnrollments(enrollmentsData.enrollments || []);
        } else {
          const errorText = await enrollmentsResponse.text();
          console.error("❌ [AssignmentModal] Failed to load enrollments:", {
            status: enrollmentsResponse.status,
            statusText: enrollmentsResponse.statusText,
            errorText,
          });
          throw new Error("Failed to load student enrollments");
        }
      } else {
        console.log("👨‍🎓 [AssignmentModal] Loading student view data");
        // Load data for students
        const [nodesResponse, progressResponse] = await Promise.all([
          fetch(`/api/assignments/${assignment.id}/nodes`),
          fetch(`/api/assignments/${assignment.id}/progress`),
        ]);

        console.log("📡 [AssignmentModal] Student API responses:", {
          nodesStatus: nodesResponse.status,
          nodesOk: nodesResponse.ok,
          progressStatus: progressResponse.status,
          progressOk: progressResponse.ok,
        });

        if (nodesResponse.ok) {
          const nodesData = await nodesResponse.json();
          console.log("✅ [AssignmentModal] Student nodes loaded:", {
            count: nodesData?.length || 0,
            nodes:
              nodesData?.map((n: any) => ({
                id: n.id,
                node_id: n.node_id,
                title: n.map_nodes?.title,
              })) || [],
          });
          setNodes(nodesData);
        } else {
          const errorText = await nodesResponse.text();
          console.error("❌ [AssignmentModal] Student failed to load nodes:", {
            status: nodesResponse.status,
            statusText: nodesResponse.statusText,
            errorText,
          });
          throw new Error("Failed to load assignment content");
        }

        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          console.log("✅ [AssignmentModal] Student progress loaded:", {
            hasData: !!progressData,
            data: progressData.data || progressData,
          });
          setStudentProgress(progressData.data || progressData);
        } else {
          const errorText = await progressResponse.text();
          console.error(
            "❌ [AssignmentModal] Failed to load student progress:",
            {
              status: progressResponse.status,
              statusText: progressResponse.statusText,
              errorText,
            }
          );
          throw new Error("Failed to load your progress data");
        }
      }
    } catch (error) {
      console.error("❌ [AssignmentModal] Failed to load assignment details:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
        assignmentId: assignment.id,
        canManage,
      });
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load assignment details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    if (assignment.id) {
      loadAssignmentDetails();
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    return format(new Date(dateString), "PPP");
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "PPP 'at' p");
  };

  const getDisplayName = (user: StudentEnrollment["user"]) => {
    if (!user) return "Unknown User";
    if (user.full_name) return user.full_name;
    if (user.user_profiles?.[0]) {
      const profile = user.user_profiles[0];
      return (
        `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
        user.email
      );
    }
    return user.email || "Unknown User";
  };

  const navigateToNode = (nodeId: string, mapId?: string) => {
    // TODO: Implement navigation to the actual map node
    // This should navigate to /map/[mapId]?node=[nodeId] or similar
    console.log("Navigate to node:", nodeId, "in map:", mapId);

    // For now, we'll show a helpful message
    alert(
      `Navigation to node will be implemented soon!\n\nNode ID: ${nodeId}\nThis will take you to the interactive learning map where you can complete this content.`
    );
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "bg-green-100 text-green-800 border-green-200";
    if (difficulty <= 4)
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return "Beginner";
    if (difficulty <= 4) return "Intermediate";
    return "Advanced";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      completed: { variant: "default", icon: CheckCircle },
      in_progress: { variant: "secondary", icon: Clock },
      assigned: { variant: "outline", icon: User },
      overdue: { variant: "destructive", icon: AlertCircle },
    };

    const config = variants[status] || variants.assigned;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getCompletionRate = () => {
    if (
      !assignment.progress_stats ||
      assignment.progress_stats.total_students === 0
    ) {
      return 0;
    }
    return Math.round(
      (assignment.progress_stats.completed /
        assignment.progress_stats.total_students) *
        100
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {assignment.title}
              </DialogTitle>
              <DialogDescription>
                Assignment details and progress overview
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </DialogHeader>

        <Tabs
          defaultValue={canManage ? "overview" : "content"}
          className="flex-1"
        >
          <TabsList
            className={`grid w-full ${canManage ? "grid-cols-4" : "grid-cols-2"}`}
          >
            {canManage ? (
              <>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="content">Assignment</TabsTrigger>
                <TabsTrigger value="progress">My Progress</TabsTrigger>
              </>
            )}
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            {/* Teacher/Instructor View */}
            {canManage && (
              <>
                <TabsContent value="overview" className="space-y-6">
                  {/* Assignment Info */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Assignment Information</CardTitle>
                        {assignment.source_map_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/map/${assignment.source_map_id}/grading?assignment=${assignment.id}`
                              )
                            }
                            className="flex items-center gap-2"
                          >
                            <GraduationCap className="h-4 w-4" />
                            Grade Submissions
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Title
                          </label>
                          <p className="text-sm">{assignment.title}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Status
                          </label>
                          <div className="mt-1">
                            <Badge
                              variant={
                                assignment.is_active ? "default" : "secondary"
                              }
                            >
                              {assignment.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Due Date
                          </label>
                          <p className="text-sm">
                            {formatDate(assignment.default_due_date)}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Auto Assignment
                          </label>
                          <div className="mt-1">
                            <Badge
                              variant={
                                assignment.auto_assign ? "default" : "outline"
                              }
                            >
                              {assignment.auto_assign ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {assignment.description && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Description
                          </label>
                          <p className="text-sm mt-1">
                            {assignment.description}
                          </p>
                        </div>
                      )}

                      {assignment.instructions && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Instructions
                          </label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">
                            {assignment.instructions}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Progress Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Progress Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            Overall Completion
                          </span>
                          <span className="text-sm font-bold">
                            {getCompletionRate()}%
                          </span>
                        </div>
                        <Progress value={getCompletionRate()} className="h-2" />

                        {assignment.progress_stats && (
                          <div className="grid grid-cols-4 gap-4 mt-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {assignment.progress_stats.completed}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Completed
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {assignment.progress_stats.in_progress}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                In Progress
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-600">
                                {assignment.progress_stats.not_started}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Not Started
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold">
                                {assignment.progress_stats.total_students}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Total Students
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}

            {/* Student Assignment Content View */}
            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {canManage
                      ? `Assignment Content (${nodes.length} nodes)`
                      : assignment.title}
                  </CardTitle>
                  {!canManage && (
                    <CardDescription>
                      {assignment.description && (
                        <p className="mb-2">{assignment.description}</p>
                      )}
                      {assignment.default_due_date && (
                        <p className="text-sm">
                          <strong>Due:</strong>{" "}
                          {formatDate(assignment.default_due_date)}
                        </p>
                      )}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {/* Instructions for students */}
                  {!canManage && assignment.instructions && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">
                        Instructions
                      </h4>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">
                        {assignment.instructions}
                      </p>
                    </div>
                  )}

                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading content...
                    </div>
                  ) : error ? (
                    <div className="text-center py-8 text-red-600">{error}</div>
                  ) : nodes.length > 0 ? (
                    <div className="space-y-3">
                      {nodes.map((node, index) => {
                        const progress = canManage ? null : node.progress;
                        const isCompleted = progress?.status === "passed";
                        const isInProgress =
                          progress?.status === "in_progress" ||
                          progress?.status === "submitted";

                        return (
                          <div
                            key={node.id}
                            className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${
                              isCompleted
                                ? "bg-green-50 border-green-200"
                                : isInProgress
                                  ? "bg-blue-50 border-blue-200"
                                  : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                                  isCompleted
                                    ? "bg-green-200 text-green-800 border-green-300"
                                    : isInProgress
                                      ? "bg-blue-200 text-blue-800 border-blue-300"
                                      : "bg-primary/10 border-primary/20"
                                }`}
                              >
                                {node.map_nodes.sprite_url ? (
                                  <img
                                    src={node.map_nodes.sprite_url}
                                    alt={node.map_nodes.title}
                                    className="w-8 h-8 object-contain"
                                  />
                                ) : isCompleted ? (
                                  <CheckCircle className="h-5 w-5" />
                                ) : isInProgress ? (
                                  <Clock className="h-5 w-5" />
                                ) : (
                                  <span className="text-lg font-bold">
                                    {index + 1}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">
                                  {node.map_nodes.title}
                                </h4>
                                {node.map_nodes.instructions && (
                                  <p className="text-sm text-muted-foreground">
                                    {node.map_nodes.instructions}
                                  </p>
                                )}
                                {!canManage &&
                                  progress &&
                                  progress.last_activity_at && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Last activity:{" "}
                                      {formatDateTime(
                                        progress.last_activity_at
                                      )}
                                    </p>
                                  )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(node.map_nodes.difficulty)}`}
                              >
                                {getDifficultyLabel(node.map_nodes.difficulty)}
                              </div>
                              {node.is_required && (
                                <Badge variant="secondary">Required</Badge>
                              )}
                              {!canManage &&
                                (isCompleted ? (
                                  <Badge
                                    variant="default"
                                    className="bg-green-600"
                                  >
                                    Completed
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant={
                                      isInProgress ? "default" : "outline"
                                    }
                                    onClick={() => navigateToNode(node.node_id)}
                                  >
                                    {isInProgress ? "Continue" : "Start"}
                                  </Button>
                                ))}
                              {canManage && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigateToNode(node.node_id)}
                                >
                                  View
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No content nodes assigned to this assignment.
                      {canManage && (
                        <div className="mt-2">
                          <Button variant="outline" size="sm">
                            Add Content
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Student Progress View */}
            {!canManage && (
              <TabsContent value="progress" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      My Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading progress...
                      </div>
                    ) : error ? (
                      <div className="text-center py-8 text-red-600">
                        {error}
                      </div>
                    ) : studentProgress ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            Completion Status
                          </span>
                          <Badge
                            variant={
                              studentProgress.enrollment.status === "completed"
                                ? "default"
                                : studentProgress.enrollment.status ===
                                    "in_progress"
                                  ? "secondary"
                                  : studentProgress.enrollment.status ===
                                      "overdue"
                                    ? "destructive"
                                    : "outline"
                            }
                          >
                            {studentProgress.enrollment.status.replace(
                              "_",
                              " "
                            )}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span className="font-medium">
                              {
                                studentProgress.progress_stats
                                  .completion_percentage
                              }
                              %
                            </span>
                          </div>
                          <Progress
                            value={
                              studentProgress.progress_stats
                                .completion_percentage
                            }
                            className="h-2"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">
                              {studentProgress.progress_stats.completed}
                            </div>
                            <div className="text-xs text-green-700">
                              Completed
                            </div>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-lg font-bold text-blue-600">
                              {studentProgress.progress_stats.not_started +
                                studentProgress.progress_stats.in_progress}
                            </div>
                            <div className="text-xs text-blue-700">
                              Remaining
                            </div>
                          </div>
                        </div>

                        {studentProgress.enrollment.due_date && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium mb-1">
                              Due Date
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(studentProgress.enrollment.due_date)}
                            </div>
                          </div>
                        )}

                        {studentProgress.recent_activity.length > 0 && (
                          <div className="pt-4 border-t">
                            <h4 className="font-medium mb-2">
                              Recent Activity
                            </h4>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              {studentProgress.recent_activity
                                .slice(0, 3)
                                .map((activity, index) => (
                                  <p key={index}>
                                    • {activity.status.replace("_", " ")} "
                                    {activity.map_nodes.title}" -{" "}
                                    {activity.last_activity_at
                                      ? formatDateTime(
                                          activity.last_activity_at
                                        )
                                      : "Recently"}
                                  </p>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Node-level progress for students */}
                        {studentProgress.nodes.length > 0 && (
                          <div className="pt-4 border-t">
                            <h4 className="font-medium mb-3">
                              Assignment Content
                            </h4>
                            <div className="space-y-2">
                              {studentProgress.nodes.map((node, index) => (
                                <div
                                  key={node.id}
                                  className={`flex items-center justify-between p-3 border rounded-lg ${
                                    node.progress?.status === "passed"
                                      ? "bg-green-50 border-green-200"
                                      : node.progress?.status ===
                                            "in_progress" ||
                                          node.progress?.status === "submitted"
                                        ? "bg-blue-50 border-blue-200"
                                        : "bg-gray-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                                        node.progress?.status === "passed"
                                          ? "bg-green-200 text-green-800 border-green-300"
                                          : node.progress?.status ===
                                                "in_progress" ||
                                              node.progress?.status ===
                                                "submitted"
                                            ? "bg-blue-200 text-blue-800 border-blue-300"
                                            : "bg-gray-200 text-gray-600 border-gray-300"
                                      }`}
                                    >
                                      {node.map_nodes.sprite_url ? (
                                        <img
                                          src={node.map_nodes.sprite_url}
                                          alt={node.map_nodes.title}
                                          className="w-6 h-6 object-contain"
                                        />
                                      ) : (
                                        <span className="font-bold">
                                          {index + 1}
                                        </span>
                                      )}
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-sm">
                                        {node.map_nodes.title}
                                      </h4>
                                      {node.map_nodes.instructions && (
                                        <p className="text-xs text-muted-foreground">
                                          {node.map_nodes.instructions}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(node.map_nodes.difficulty)}`}
                                    >
                                      {getDifficultyLabel(
                                        node.map_nodes.difficulty
                                      )}
                                    </div>
                                    {node.progress?.status === "passed" ? (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : node.progress?.status ===
                                        "in_progress" ||
                                      node.progress?.status === "submitted" ? (
                                      <Clock className="h-4 w-4 text-blue-600" />
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                        onClick={() => {
                                          // TODO: Navigate to the map node
                                          console.log(
                                            "Navigate to node:",
                                            node.node_id
                                          );
                                        }}
                                      >
                                        Start
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No progress data available.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Teacher-only views */}
            {canManage && (
              <>
                <TabsContent value="students" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Student Enrollments ({enrollments.length})
                      </CardTitle>
                      <CardDescription>
                        Track student progress and manage enrollments
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Loading students...
                        </div>
                      ) : error ? (
                        <div className="text-center py-8 text-red-600">
                          {error}
                        </div>
                      ) : enrollments.length > 0 ? (
                        <div className="space-y-3">
                          {enrollments.map((enrollment) => {
                            const displayName = getDisplayName(enrollment.user);

                            return (
                              <div
                                key={enrollment.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                    {enrollment.user.user_profiles?.[0]
                                      ?.avatar_url ? (
                                      <img
                                        src={
                                          enrollment.user.user_profiles[0]
                                            .avatar_url
                                        }
                                        alt={displayName}
                                        className="w-10 h-10 rounded-full object-cover"
                                      />
                                    ) : (
                                      <User className="h-5 w-5 text-gray-600" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-medium">
                                      {displayName}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {enrollment.user.email}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-muted-foreground">
                                        Progress:{" "}
                                        {enrollment.completion_percentage}%
                                      </span>
                                      <div className="w-16 h-1 bg-gray-200 rounded-full">
                                        <div
                                          className="h-1 bg-blue-500 rounded-full transition-all"
                                          style={{
                                            width: `${enrollment.completion_percentage}%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right space-y-1">
                                  {getStatusBadge(enrollment.status)}
                                  <div className="text-xs text-muted-foreground">
                                    {enrollment.completed_at
                                      ? `Completed ${formatDateTime(enrollment.completed_at)}`
                                      : `Assigned ${formatDateTime(enrollment.assigned_at)}`}
                                  </div>
                                  {enrollment.due_date && (
                                    <div className="text-xs text-muted-foreground">
                                      Due: {formatDate(enrollment.due_date)}
                                    </div>
                                  )}
                                  {enrollment.notes && (
                                    <div className="text-xs text-blue-600 italic">
                                      Note: {enrollment.notes}
                                    </div>
                                  )}
                                  <div className="flex gap-1 mt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        // Navigate to student's profile or progress page
                                        router.push(
                                          `/me?user=${enrollment.user_id}&assignment=${assignment.id}`
                                        );
                                      }}
                                    >
                                      View Progress
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No students enrolled in this assignment.
                          {assignment.auto_assign && (
                            <p className="mt-2 text-sm">
                              Auto-assignment is enabled. Students will be
                              automatically enrolled when they join the
                              classroom.
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Assignment Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-3">Timeline</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Created:
                              </span>
                              <span>
                                {formatDateTime(assignment.created_at)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Last Updated:
                              </span>
                              <span>
                                {formatDateTime(assignment.updated_at)}
                              </span>
                            </div>
                            {assignment.default_due_date && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Due Date:
                                </span>
                                <span>
                                  {formatDate(assignment.default_due_date)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-3">Statistics</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Content Nodes:
                              </span>
                              <span>
                                {assignment._count?.assignment_nodes || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Enrolled Students:
                              </span>
                              <span>
                                {assignment._count?.assignment_enrollments || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Completion Rate:
                              </span>
                              <span>{getCompletionRate()}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
