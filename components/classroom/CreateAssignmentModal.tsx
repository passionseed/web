"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  Plus,
  BookOpen,
  Map,
  Users,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  FileText,
  MapPin,
  UserCheck,
  Eye,
} from "lucide-react";
import { format } from "date-fns";

interface CreateAssignmentModalProps {
  classroomId: string;
  onAssignmentCreated: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

interface LearningMap {
  id: string;
  title: string;
  description: string;
  node_count: number;
}

interface MapNode {
  id: string;
  title: string;
  description: string;
  node_type: string;
  sequence_number: number;
  has_assessment: boolean;
}

interface ClassroomStudent {
  id: string;
  user_id: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
  joined_at: string;
}

type AssignmentStep = "details" | "nodes" | "students" | "review";

// Step configuration for better maintainability and UX
const ASSIGNMENT_STEPS = [
  {
    key: "details" as AssignmentStep,
    title: "Details",
    icon: FileText,
    description: "Basic information",
  },
  {
    key: "nodes" as AssignmentStep,
    title: "Content",
    icon: MapPin,
    description: "Select learning nodes",
  },
  {
    key: "students" as AssignmentStep,
    title: "Students",
    icon: UserCheck,
    description: "Choose participants",
  },
  {
    key: "review" as AssignmentStep,
    title: "Review",
    icon: Eye,
    description: "Confirm details",
  },
] as const;

export function CreateAssignmentModal({
  classroomId,
  onAssignmentCreated,
  variant = "default",
}: CreateAssignmentModalProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<AssignmentStep>("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date>();

  // Data loading states
  const [maps, setMaps] = useState<LearningMap[]>([]);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [students, setStudents] = useState<ClassroomStudent[]>([]);
  const [loadingMaps, setLoadingMaps] = useState(false);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "",
  });

  // Assignment mode: "manual" for selected students, "auto" for all students (including future ones)
  const [assignmentMode, setAssignmentMode] = useState<"manual" | "auto">(
    "manual"
  );

  // Selection states
  const [selectedMapId, setSelectedMapId] = useState<string>("");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setError(""); // Clear any previous errors
      loadMaps();
      loadStudents();
    }
  }, [open]);

  useEffect(() => {
    if (selectedMapId) {
      loadNodes(selectedMapId);
    } else {
      setNodes([]);
      setSelectedNodeIds([]);
    }
  }, [selectedMapId]);

  const loadMaps = async () => {
    setLoadingMaps(true);
    try {
      const response = await fetch("/api/maps");
      if (response.ok) {
        const mapsData = await response.json();
        setMaps(mapsData);
      }
    } catch (error) {
      console.error("Error loading maps:", error);
    } finally {
      setLoadingMaps(false);
    }
  };

  const loadNodes = async (mapId: string) => {
    setLoadingNodes(true);
    try {
      const response = await fetch(`/api/maps/${mapId}/nodes`);
      if (response.ok) {
        const nodesData = await response.json();
        setNodes(
          nodesData.sort(
            (a: MapNode, b: MapNode) => a.sequence_number - b.sequence_number
          )
        );
      }
    } catch (error) {
      console.error("Error loading nodes:", error);
    } finally {
      setLoadingNodes(false);
    }
  };

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await fetch(`/api/classrooms/${classroomId}/students`);
      if (response.ok) {
        const studentsData = await response.json();
        setStudents(studentsData);
      }
    } catch (error) {
      console.error("Error loading students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Step 1: Create the assignment
      const assignmentResponse = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classroom_id: classroomId,
          title: formData.title,
          description: formData.description || null,
          instructions: formData.instructions || null,
          default_due_date: dueDate?.toISOString() || null,
          auto_assign: assignmentMode === "auto",
        }),
      });

      if (!assignmentResponse.ok) {
        const errorData = await assignmentResponse.json().catch(() => ({}));
        const errorMessage =
          errorData.error ||
          errorData.message ||
          `Server error: ${assignmentResponse.status}`;
        console.error("Assignment creation failed:", {
          status: assignmentResponse.status,
          statusText: assignmentResponse.statusText,
          error: errorData,
        });
        throw new Error(errorMessage);
      }

      const assignment = await assignmentResponse.json();

      // Step 2: Add nodes to assignment
      if (selectedNodeIds.length > 0) {
        const nodesResponse = await fetch(
          `/api/assignments/${assignment.id}/nodes`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              node_ids: selectedNodeIds,
            }),
          }
        );

        if (!nodesResponse.ok) {
          const nodeErrorData = await nodesResponse.json().catch(() => ({}));
          const nodeErrorMessage =
            nodeErrorData.error ||
            nodeErrorData.message ||
            "Failed to add nodes to assignment";

          console.error("Node addition failed:", {
            status: nodesResponse.status,
            statusText: nodesResponse.statusText,
            error: nodeErrorData,
            assignmentId: assignment.id,
            nodeIds: selectedNodeIds,
          });

          // Clean up the assignment since node addition failed
          try {
            await fetch(`/api/assignments?assignment_id=${assignment.id}`, {
              method: "DELETE",
            });
            console.log("🧹 Cleaned up incomplete assignment:", assignment.id);
          } catch (cleanupError) {
            console.error(
              "Failed to clean up incomplete assignment:",
              cleanupError
            );
          }

          throw new Error(
            `Assignment creation failed: ${nodeErrorMessage}${nodeErrorData.database_error ? ` (${nodeErrorData.database_error.code}: ${nodeErrorData.database_error.message})` : ""}`
          );
        }
      }

      // Step 3: Enroll students
      if (assignmentMode === "auto") {
        // Auto mode: enroll all current students and set up auto-enrollment for future students
        const allStudentIds = students.map((s) => s.user_id);

        if (allStudentIds.length > 0) {
          const customDueDates = dueDate
            ? Object.fromEntries(
                allStudentIds.map((studentId) => [
                  studentId,
                  dueDate.toISOString(),
                ])
              )
            : undefined;

          const enrollmentResponse = await fetch(
            `/api/assignments/${assignment.id}/enroll`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                student_ids: allStudentIds,
                custom_due_dates: customDueDates,
                auto_enroll_future: true,
              }),
            }
          );

          if (!enrollmentResponse.ok) {
            let enrollmentErrorData;
            let enrollmentErrorText = "";

            try {
              enrollmentErrorText = await enrollmentResponse.text();
              enrollmentErrorData = enrollmentErrorText
                ? JSON.parse(enrollmentErrorText)
                : {};
            } catch (parseError) {
              enrollmentErrorData = {
                raw_response: enrollmentErrorText,
                parse_error:
                  parseError instanceof Error
                    ? parseError.message
                    : "Unknown parse error",
              };
            }

            const enrollmentErrorMessage =
              enrollmentErrorData.error ||
              enrollmentErrorData.message ||
              `HTTP ${enrollmentResponse.status}: ${enrollmentResponse.statusText}` ||
              "Failed to enroll students in auto mode";

            console.error("Auto enrollment failed:", {
              status: enrollmentResponse.status,
              statusText: enrollmentResponse.statusText,
              error: enrollmentErrorData,
              assignmentId: assignment.id,
              studentIds: allStudentIds,
              responseText: enrollmentErrorText,
            });

            // Note: We don't clean up the assignment here since the assignment itself was created successfully
            // The user can manually enroll students later
            throw new Error(
              `Assignment created but enrollment failed: ${enrollmentErrorMessage}`
            );
          }
        }
      } else if (selectedStudentIds.length > 0) {
        // Manual mode: enroll only selected students
        const customDueDates = dueDate
          ? Object.fromEntries(
              selectedStudentIds.map((studentId) => [
                studentId,
                dueDate.toISOString(),
              ])
            )
          : undefined;

        const enrollmentResponse = await fetch(
          `/api/assignments/${assignment.id}/enroll`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              student_ids: selectedStudentIds,
              custom_due_dates: customDueDates,
              auto_enroll_future: false,
            }),
          }
        );

        if (!enrollmentResponse.ok) {
          const enrollmentErrorData = await enrollmentResponse
            .json()
            .catch(() => ({}));
          const enrollmentErrorMessage =
            enrollmentErrorData.error || "Failed to enroll students";

          console.error("Manual enrollment failed:", {
            status: enrollmentResponse.status,
            statusText: enrollmentResponse.statusText,
            error: enrollmentErrorData,
            assignmentId: assignment.id,
            studentIds: selectedStudentIds,
          });

          // Note: We don't clean up the assignment here since the assignment itself was created successfully
          throw new Error(
            `Assignment created but enrollment failed: ${enrollmentErrorMessage}`
          );
        }
      }

      // Reset form and close modal
      resetForm();
      setOpen(false);
      onAssignmentCreated();
    } catch (error) {
      console.error("Error creating assignment:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create assignment";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      instructions: "",
    });
    setDueDate(undefined);
    setAssignmentMode("manual");
    setSelectedMapId("");
    setSelectedNodeIds([]);
    setSelectedStudentIds([]);
    setCurrentStep("details");
    setError(""); // Clear error when resetting form
  };

  const handleNodeToggle = (nodeId: string) => {
    setSelectedNodeIds((prev) =>
      prev.includes(nodeId)
        ? prev.filter((id) => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudentIds(students.map((s) => s.user_id));
  };

  const deselectAllStudents = () => {
    setSelectedStudentIds([]);
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case "details":
        return formData.title.trim().length > 0;
      case "nodes":
        return selectedNodeIds.length > 0;
      case "students":
        return assignmentMode === "auto" || selectedStudentIds.length > 0;
      case "review":
        return true;
      default:
        return false;
    }
  };

  // Helper functions for step navigation
  const getCurrentStepIndex = () =>
    ASSIGNMENT_STEPS.findIndex((step) => step.key === currentStep);
  const isStepCompleted = (stepIndex: number) =>
    stepIndex < getCurrentStepIndex();
  const isStepCurrent = (stepIndex: number) =>
    stepIndex === getCurrentStepIndex();

  const getStepTitle = () => {
    const step = ASSIGNMENT_STEPS.find((s) => s.key === currentStep);
    return step ? `Assignment ${step.title}` : "Create Assignment";
  };

  const nextStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < ASSIGNMENT_STEPS.length - 1) {
      setCurrentStep(ASSIGNMENT_STEPS[currentIndex + 1].key);
    }
  };

  const prevStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(ASSIGNMENT_STEPS[currentIndex - 1].key);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>{getStepTitle()}</span>
          </DialogTitle>
          <DialogDescription>
            Step {getCurrentStepIndex() + 1} of {ASSIGNMENT_STEPS.length}:{" "}
            {ASSIGNMENT_STEPS[getCurrentStepIndex()]?.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Enhanced Step Progress */}
          <div className="relative">
            <div className="flex items-center justify-between">
              {ASSIGNMENT_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const completed = isStepCompleted(index);
                const current = isStepCurrent(index);

                return (
                  <div
                    key={step.key}
                    className="flex flex-col items-center relative"
                  >
                    {/* Step Circle */}
                    <div
                      className={cn(
                        "relative w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 z-10",
                        current
                          ? "bg-primary text-primary-foreground shadow-lg scale-110"
                          : completed
                            ? "bg-green-500 text-white shadow-md"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {completed ? (
                        <Check className="h-5 w-5" />
                      ) : current ? (
                        <StepIcon className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-4 w-4" />
                      )}
                    </div>

                    {/* Step Label */}
                    <div className="mt-3 text-center">
                      <div
                        className={cn(
                          "text-sm font-medium transition-colors",
                          current
                            ? "text-primary"
                            : completed
                              ? "text-green-600"
                              : "text-muted-foreground"
                        )}
                      >
                        {step.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 max-w-[80px] leading-tight">
                        {step.description}
                      </div>
                    </div>

                    {/* Connection Line */}
                    {index < ASSIGNMENT_STEPS.length - 1 && (
                      <div
                        className={cn(
                          "absolute top-6 left-12 w-[calc(100vw/4-3rem)] h-1 -translate-y-1/2 transition-all duration-300",
                          completed ? "bg-green-500" : "bg-muted"
                        )}
                        style={{
                          width: `calc((100% - 3rem) / ${ASSIGNMENT_STEPS.length - 1})`,
                          left: "3rem",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress Bar Background */}
            <div className="absolute top-6 left-6 right-6 h-1 bg-muted -translate-y-1/2 rounded-full" />
          </div>

          <ScrollArea className="h-[400px] pr-4">
            {/* Step 1: Assignment Details */}
            {currentStep === "details" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Assignment Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter assignment title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the assignment"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Detailed instructions for students"
                    value={formData.instructions}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        instructions: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Default Due Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : "Select due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    You can set individual due dates when enrolling students
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Assignment Mode</Label>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="manual-mode"
                        checked={assignmentMode === "manual"}
                        onCheckedChange={(checked) => {
                          if (checked) setAssignmentMode("manual");
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor="manual-mode"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Manual Assignment
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Assign to specific students only. You'll select which
                          students to enroll.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="auto-mode"
                        checked={assignmentMode === "auto"}
                        onCheckedChange={(checked) => {
                          if (checked) setAssignmentMode("auto");
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor="auto-mode"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Auto Assignment
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically assign to all students in the classroom,
                          including those who join later.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Node Selection */}
            {currentStep === "nodes" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Learning Map</Label>
                  <Select
                    value={selectedMapId}
                    onValueChange={setSelectedMapId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a learning map" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingMaps ? (
                        <SelectItem value="loading" disabled>
                          Loading maps...
                        </SelectItem>
                      ) : (
                        maps.map((map) => (
                          <SelectItem key={map.id} value={map.id}>
                            <div>
                              <div className="font-medium">{map.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {map.node_count} nodes
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedMapId && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>
                        Select Nodes ({selectedNodeIds.length} selected)
                      </Label>
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedNodeIds(nodes.map((n) => n.id))
                          }
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedNodeIds([])}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>

                    {loadingNodes ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading nodes...
                      </div>
                    ) : (
                      <div className="grid gap-2 max-h-60 overflow-y-auto">
                        {nodes.map((node) => (
                          <Card
                            key={node.id}
                            className={cn(
                              "cursor-pointer transition-all",
                              selectedNodeIds.includes(node.id)
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            )}
                            onClick={() => handleNodeToggle(node.id)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start space-x-3">
                                <Checkbox
                                  checked={selectedNodeIds.includes(node.id)}
                                  onChange={() => handleNodeToggle(node.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium">
                                      {node.title}
                                    </h4>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {node.sequence_number}
                                    </Badge>
                                    {node.has_assessment && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        Quiz
                                      </Badge>
                                    )}
                                  </div>
                                  {node.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {node.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Student Selection */}
            {currentStep === "students" && (
              <div className="space-y-4">
                {assignmentMode === "auto" ? (
                  <Card className="p-6 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Auto Assignment Mode
                        </h3>
                        <p className="text-muted-foreground">
                          This assignment will be automatically assigned to all
                          students currently in the classroom and any students
                          who join later.
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Current students: {students.length}</span>
                      </div>
                      {students.length === 0 && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-700">
                            💡 No students are currently enrolled, but this
                            assignment will be automatically assigned to all
                            students who join the classroom in the future.
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ) : (
                  <>
                    {/* Manual Mode Options */}
                    <div className="space-y-4">
                      {/* Option to assign to everyone */}
                      <Card className="p-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="assign-all"
                            checked={
                              (assignmentMode as "auto" | "manual") === "auto"
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setAssignmentMode("auto");
                                setSelectedStudentIds([]);
                              } else {
                                setAssignmentMode("manual");
                              }
                            }}
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor="assign-all"
                              className="text-sm font-medium cursor-pointer"
                            >
                              Assign to Everyone (Current + Future Students)
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {students.length === 0
                                ? "No students currently enrolled, but assignment will be given to all future students who join."
                                : `Assign to all ${students.length} current students and automatically assign to future students.`}
                            </p>
                          </div>
                        </div>
                      </Card>

                      {/* Individual student selection - only show in manual mode */}
                      {assignmentMode === "manual" && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <Label>
                              Or select specific students (
                              {selectedStudentIds.length} selected)
                            </Label>
                            {students.length > 0 && (
                              <div className="space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={selectAllStudents}
                                >
                                  Select All Current
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={deselectAllStudents}
                                >
                                  Clear All
                                </Button>
                              </div>
                            )}
                          </div>

                          {loadingStudents ? (
                            <div className="text-center py-8 text-muted-foreground">
                              Loading students...
                            </div>
                          ) : students.length === 0 ? (
                            <Card className="p-6 text-center">
                              <div className="space-y-4">
                                <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                                <div>
                                  <h3 className="text-lg font-semibold mb-2">
                                    No Students Currently Enrolled
                                  </h3>
                                  <p className="text-muted-foreground text-sm">
                                    No students have joined this classroom yet.
                                    You can still create this assignment and
                                    choose to assign it to all future students
                                    who join.
                                  </p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <p className="text-sm text-blue-700">
                                    💡 <strong>Tip:</strong> Use "Assign to
                                    Everyone" above to automatically give this
                                    assignment to students when they join the
                                    classroom.
                                  </p>
                                </div>
                              </div>
                            </Card>
                          ) : (
                            <div className="grid gap-2 max-h-60 overflow-y-auto">
                              {students.map((student) => (
                                <Card
                                  key={student.id}
                                  className={cn(
                                    "cursor-pointer transition-all",
                                    selectedStudentIds.includes(student.user_id)
                                      ? "border-primary bg-primary/5"
                                      : "hover:bg-muted/50"
                                  )}
                                  onClick={() =>
                                    handleStudentToggle(student.user_id)
                                  }
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-center space-x-3">
                                      <Checkbox
                                        checked={selectedStudentIds.includes(
                                          student.user_id
                                        )}
                                        onChange={() =>
                                          handleStudentToggle(student.user_id)
                                        }
                                      />
                                      <div className="flex-1">
                                        <h4 className="font-medium">
                                          {student.user.full_name ||
                                            student.user.email}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                          {student.user.email}
                                        </p>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Joined{" "}
                                        {format(
                                          new Date(student.joined_at),
                                          "MMM d"
                                        )}
                                      </Badge>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === "review" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Assignment Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Title</Label>
                      <p className="text-sm text-muted-foreground">
                        {formData.title}
                      </p>
                    </div>

                    {formData.description && (
                      <div>
                        <Label className="text-sm font-medium">
                          Description
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {formData.description}
                        </p>
                      </div>
                    )}

                    {dueDate && (
                      <div>
                        <Label className="text-sm font-medium">Due Date</Label>
                        <p className="text-sm text-muted-foreground">
                          {format(dueDate, "PPP")}
                        </p>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-medium">
                        Selected Nodes
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedNodeIds.length} nodes from{" "}
                        {maps.find((m) => m.id === selectedMapId)?.title}
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        Assignment Mode
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {assignmentMode === "auto"
                          ? "Auto Assignment - All current and future students"
                          : "Manual Assignment - Selected students only"}
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        Assigned Students
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {assignmentMode === "auto"
                          ? `All students (${students.length} current + future students)`
                          : `${selectedStudentIds.length} selected students`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button
              type="button"
              variant="outline"
              onClick={
                currentStep === "details" ? () => setOpen(false) : prevStep
              }
              disabled={loading}
            >
              {currentStep === "details" ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </>
              )}
            </Button>

            <Button
              onClick={currentStep === "review" ? handleSubmit : nextStep}
              disabled={loading || !canProceedToNextStep()}
            >
              {loading ? (
                "Creating..."
              ) : currentStep === "review" ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Assignment
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
