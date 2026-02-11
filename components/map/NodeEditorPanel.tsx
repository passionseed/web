"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MapNode,
  NodeContent,
  NodeAssessment,
  QuizQuestion,
} from "@/types/map";
import { PathDay } from "@/types/pathlab";
import { Trash2, MapPin, Clock, Check, Calendar } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ContentEditor } from "./ContentEditor";
import { AssessmentEditor } from "./AssessmentEditor";
import { SpritePickerDialog } from "./SpritePickerDialog";
import { updateNode } from "@/lib/supabase/nodes";
import { useToast } from "@/components/ui/use-toast";

interface NodeEditorPanelProps {
  selectedNode: Node<MapNode> | null;
  onNodeDataChange: (nodeId: string, data: Partial<MapNode>) => void;
  onNodeDelete?: (nodeId: string) => void;
  onEditingStateChange?: (isEditing: boolean) => void;
  isSeedMap?: boolean; // NEW: Flag to indicate if this is a seed map
  pathDays?: PathDay[];
  seedInfo?: { id: string; seed_type: string } | null;
  onPathDaysChange?: (days: PathDay[]) => void;
}

export function NodeEditorPanel({
  selectedNode,
  onNodeDataChange,
  onNodeDelete,
  onEditingStateChange,
  isSeedMap = false,
  pathDays = [],
  seedInfo,
  onPathDaysChange,
}: NodeEditorPanelProps) {
  const { toast } = useToast();
  const [nodeData, setNodeData] = useState<Partial<MapNode>>({});
  // Track quiz questions separately for batch operations
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  // Check if this is a text node (text nodes don't need content/assessment tabs)
  const isTextNode = useMemo(() => {
    return (selectedNode?.data as any)?.node_type === "text";
  }, [selectedNode]);

  // For text nodes, we want immediate UI updates with debounced data changes
  const [localText, setLocalText] = useState("");
  // For regular nodes, we also need local state for title to prevent deselection on every keystroke
  const [localTitle, setLocalTitle] = useState("");
  // For instructions field, use local state to prevent re-rendering issues
  const [localInstructions, setLocalInstructions] = useState("");
  // Track current tab to save on tab change
  const [currentTab, setCurrentTab] = useState("details");

  // Store original values for comparison on blur
  const [originalTitle, setOriginalTitle] = useState("");
  const [originalInstructions, setOriginalInstructions] = useState("");

  // Remove the debounced updates - we'll only update on blur to prevent refreshing
  // The visual updates are handled by local state, data persistence happens on blur

  // Handle blur events to sync React Flow nodes when editing is complete
  const handleTitleBlur = useCallback(() => {
    onEditingStateChange?.(false);

    // Force sync React Flow nodes when editing is complete
    // This ensures visual consistency without flashing during typing
    if (selectedNode && !isTextNode && localTitle !== originalTitle) {
      // Trigger a non-title update to force React Flow sync
      onNodeDataChange(selectedNode.id, {
        title: localTitle,
        updated_at: new Date().toISOString(), // Add timestamp to force update
      });
    } else if (selectedNode && isTextNode && localText !== originalTitle) {
      // For text nodes, also ensure sync
      onNodeDataChange(selectedNode.id, {
        title: localText,
        updated_at: new Date().toISOString(), // Add timestamp to force update
      });
    }
  }, [
    selectedNode,
    isTextNode,
    localTitle,
    localText,
    originalTitle,
    onNodeDataChange,
    onEditingStateChange,
  ]);

  const handleTitleFocus = useCallback(() => {
    onEditingStateChange?.(true);
  }, [onEditingStateChange]);

  // Save any pending changes to title and instructions
  const savePendingChanges = useCallback(() => {
    if (!selectedNode) return;

    let hasChanges = false;
    const updates: Partial<MapNode> = {};

    // Check and save title changes
    if (isTextNode && localText !== originalTitle) {
      updates.title = localText;
      hasChanges = true;
    } else if (!isTextNode && localTitle !== originalTitle) {
      updates.title = localTitle;
      hasChanges = true;
    }

    // Check and save instructions changes
    if (!isTextNode && localInstructions !== originalInstructions) {
      updates.instructions = localInstructions;
      hasChanges = true;
    }

    if (hasChanges) {
      updates.updated_at = new Date().toISOString();
      onNodeDataChange(selectedNode.id, updates);
      console.log("💾 Saved pending changes on tab switch:", updates);
    }
  }, [
    selectedNode,
    isTextNode,
    localText,
    localTitle,
    localInstructions,
    originalTitle,
    originalInstructions,
    onNodeDataChange,
  ]);

  const handleInstructionsBlur = useCallback(() => {
    onEditingStateChange?.(false);

    if (selectedNode && localInstructions !== originalInstructions) {
      onNodeDataChange(selectedNode.id, {
        instructions: localInstructions,
        updated_at: new Date().toISOString(),
      });
    }
  }, [
    selectedNode,
    localInstructions,
    originalInstructions,
    onNodeDataChange,
    onEditingStateChange,
  ]);

  const handleInstructionsFocus = useCallback(() => {
    onEditingStateChange?.(true);
  }, [onEditingStateChange]);

  // Handle tab changes - save pending changes before switching
  const handleTabChange = useCallback(
    (newTab: string) => {
      console.log("📑 Tab changing from", currentTab, "to", newTab);
      savePendingChanges();
      setCurrentTab(newTab);
      onEditingStateChange?.(false);
    },
    [currentTab, savePendingChanges, onEditingStateChange],
  );

  useEffect(() => {
    if (selectedNode) {
      console.log(
        "📋 NodeEditorPanel: selectedNode changed, updating local state",
      );
      console.log(
        "📊 New node assessments:",
        selectedNode.data.node_assessments,
      );

      setNodeData(selectedNode.data);

      // Initialize quiz questions from existing assessment
      const assessment = selectedNode.data.node_assessments?.[0];
      if (assessment?.assessment_type === "quiz") {
        const newQuestions = assessment.quiz_questions || [];
        setQuizQuestions(newQuestions);
        console.log("📋 Loaded existing quiz questions:", newQuestions.length);
      } else {
        setQuizQuestions([]);
        console.log("📋 Cleared quiz questions for new node");
      }

      // Update local title states for new node selection
      if (isTextNode) {
        setLocalText(selectedNode.data.title || "");
      } else {
        setLocalTitle(selectedNode.data.title || "");
        setLocalInstructions(selectedNode.data.instructions || "");
      }
    }
  }, [selectedNode, isTextNode]);

  const handleInputChange = useCallback(
    (field: keyof MapNode) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { value } = e.target;

        // For text nodes title field, use local state for immediate UI updates only
        if (isTextNode && field === "title") {
          setLocalText(value);
          return;
        }

        // For regular nodes title field, use local state for immediate UI updates only
        if (!isTextNode && field === "title") {
          setLocalTitle(value);
          return;
        }

        // For instructions field, use local state to prevent re-rendering issues
        if (field === "instructions") {
          setLocalInstructions(value);
          return;
        }

        // For other fields, use normal update flow
        const newData = { ...nodeData, [field]: value };
        setNodeData(newData);

        if (selectedNode) {
          onNodeDataChange(selectedNode.id, { [field]: value });
        }
      },
    [nodeData, selectedNode, onNodeDataChange, isTextNode],
  );

  const handleSliderChange = useCallback(
    (value: number[]) => {
      const newData = { ...nodeData, difficulty: value[0] };
      setNodeData(newData);

      if (selectedNode) {
        onNodeDataChange(selectedNode.id, { difficulty: value[0] });
      }
    },
    [nodeData, selectedNode, onNodeDataChange],
  );

  const handleContentChange = useCallback(
    (newContent: NodeContent[]) => {
      console.log(
        "📝 NodeEditorPanel: Content changed, new content:",
        newContent.length,
      );

      if (!selectedNode) {
        console.warn(
          "❌ NodeEditorPanel: No selected node, cannot update content",
        );
        return;
      }

      // Update local state immediately
      setNodeData((prev) => ({
        ...prev,
        node_content: newContent,
      }));

      // Also update the React Flow node data
      onNodeDataChange(selectedNode.id, {
        node_content: newContent,
      });
    },
    [selectedNode, onNodeDataChange],
  );

  const handleAssessmentChange = useCallback(
    (
      changedAssessment: NodeAssessment | null,
      action: "add" | "delete" | "update",
    ) => {
      if (!selectedNode) return;

      console.log(
        "🔧 Assessment change:",
        action,
        changedAssessment?.assessment_type,
        "points_possible:",
        changedAssessment?.points_possible,
        "is_graded:",
        changedAssessment?.is_graded,
      );

      let newAssessments: NodeAssessment[];

      if (action === "delete") {
        newAssessments = [];
      } else if (action === "add" && changedAssessment) {
        // For add, replace the assessment array with the new one
        newAssessments = [changedAssessment];
      } else if (action === "update" && changedAssessment) {
        // For update, update the existing assessment in place
        const currentAssessments = nodeData.node_assessments || [];
        const existingIndex = currentAssessments.findIndex(
          (a) => a.id === changedAssessment.id,
        );

        if (existingIndex >= 0) {
          newAssessments = [...currentAssessments];
          newAssessments[existingIndex] = changedAssessment;
        } else {
          // If not found, add it (fallback case)
          newAssessments = [changedAssessment];
        }
      } else {
        newAssessments = nodeData.node_assessments || [];
      }

      console.log(
        "📊 New assessments array:",
        newAssessments,
        "Length:",
        newAssessments.length,
      );

      // Update local state immediately
      setNodeData((prev) => ({
        ...prev,
        node_assessments: newAssessments,
      }));

      // Also update the React Flow node data
      onNodeDataChange(selectedNode.id, {
        node_assessments: newAssessments,
      });

      // Clear quiz questions if deleting assessment
      if (action === "delete") {
        setQuizQuestions([]);
      }
    },
    [selectedNode, onNodeDataChange, nodeData.node_assessments],
  );

  const handleDeleteNode = useCallback(() => {
    if (selectedNode && onNodeDelete) {
      onNodeDelete(selectedNode.id);
    }
  }, [selectedNode, onNodeDelete]);

  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-muted/10">
        <div className="space-y-4 max-w-sm">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Node Selected
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Click on a node in the map to view and edit its properties,
              content, and assessments.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden node-editor-panel">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Node Editor</h2>
              <p className="text-xs text-muted-foreground">
                ID: {selectedNode.id.substring(0, 8)}...
              </p>
            </div>
          </div>
          {onNodeDelete && (
            <Button
              onClick={handleDeleteNode}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Content - Scrollable */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          value={currentTab}
          onValueChange={handleTabChange}
          className="h-full flex flex-col"
        >
          <div className="flex-shrink-0 px-4 py-2 bg-background border-b">
            <TabsList
              className={`grid w-full ${isTextNode ? "grid-cols-1" : "grid-cols-3"}`}
            >
              <TabsTrigger value="details">Details</TabsTrigger>
              {!isTextNode && (
                <>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="assessment">Assessment</TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <TabsContent value="details" className="m-0 p-4 space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    {isTextNode ? "Text Content" : "Title"}
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={isTextNode ? localText : localTitle}
                    onChange={handleInputChange("title")}
                    onFocus={handleTitleFocus}
                    onBlur={handleTitleBlur}
                    placeholder={
                      isTextNode ? "Enter your text..." : "Node title..."
                    }
                  />
                </div>

                {/* Node Type Selector - Only show for seed maps or always show */}
                {!isTextNode && (
                  <div className="space-y-2">
                    <Label htmlFor="node_type">Node Type</Label>
                    <select
                      id="node_type"
                      value={
                        (selectedNode?.data as any)?.node_type || "learning"
                      }
                      onChange={(e) => {
                        const newType = e.target.value as
                          | "learning"
                          | "text"
                          | "comment"
                          | "end";
                        if (selectedNode) {
                          onNodeDataChange(selectedNode.id, {
                            node_type: newType,
                          });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="learning">🎯 Learning Node</option>
                      <option value="text">📝 Text/Label</option>
                      <option value="comment">💬 Comment</option>
                      <option value="end">🏁 End Node (Completion)</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {(selectedNode?.data as any)?.node_type === "end" && (
                        <span className="text-amber-600 font-medium">
                          ⚠️ When students complete this node, they will see a
                          congratulations popup marking the seed as finished.
                        </span>
                      )}
                      {(selectedNode?.data as any)?.node_type === "learning" &&
                        "Standard interactive node with content and assessments"}
                      {(selectedNode?.data as any)?.node_type === "text" &&
                        "Text label for annotations and information"}
                      {(selectedNode?.data as any)?.node_type === "comment" &&
                        "Comment node for notes and reminders"}
                    </p>
                  </div>
                )}

                {/* Path Days selection for PathLab maps */}
                {!isTextNode &&
                  (seedInfo?.seed_type === "pathlab" ||
                    (pathDays && pathDays.length > 0)) && (
                    <div className="space-y-3 pt-4 border-t">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4 text-blue-500" />
                        Assign to Path Days
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {pathDays?.map((day) => {
                          const isAssigned = day.node_ids?.includes(
                            selectedNode.id,
                          );
                          return (
                            <div
                              key={day.id}
                              className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all duration-200 ${
                                isAssigned
                                  ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                                  : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                              }`}
                              onClick={() => {
                                if (!onPathDaysChange || !pathDays) return;

                                const newNodeIds = isAssigned
                                  ? day.node_ids.filter(
                                      (id) => id !== selectedNode.id,
                                    )
                                  : [...(day.node_ids || []), selectedNode.id];

                                const updatedDays = pathDays.map((d) =>
                                  d.id === day.id
                                    ? { ...d, node_ids: newNodeIds }
                                    : d,
                                );

                                onPathDaysChange(updatedDays);
                              }}
                            >
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isAssigned
                                    ? "bg-blue-500 border-blue-500"
                                    : "bg-background border-muted-foreground/30"
                                }`}
                              >
                                {isAssigned && (
                                  <Check className="h-3 w-3 text-white stroke-[3]" />
                                )}
                              </div>
                              <span className="text-xs font-semibold">
                                Day {day.day_number}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {(!pathDays || pathDays.length === 0) && (
                        <p className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded border border-dashed text-center">
                          No path days defined yet.
                        </p>
                      )}
                    </div>
                  )}

                {isTextNode && (
                  <>
                    {/* Text Styling Options for Text Nodes */}
                    <div className="space-y-4 border-t pt-4">
                      <Label className="text-sm font-medium">
                        Text Styling
                      </Label>

                      {/* Font Size */}
                      <div className="space-y-2">
                        <Label htmlFor="fontSize" className="text-xs">
                          Font Size
                        </Label>
                        <select
                          id="fontSize"
                          value={(nodeData.metadata as any)?.fontSize || "16px"}
                          onChange={(e) => {
                            const newMetadata = {
                              ...(nodeData.metadata || {}),
                              fontSize: e.target.value,
                            };
                            if (selectedNode) {
                              onNodeDataChange(selectedNode.id, {
                                metadata: newMetadata,
                              });
                            }
                          }}
                          className="w-full px-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="12px">12px</option>
                          <option value="14px">14px</option>
                          <option value="16px">16px</option>
                          <option value="18px">18px</option>
                          <option value="20px">20px</option>
                          <option value="24px">24px</option>
                          <option value="28px">28px</option>
                          <option value="32px">32px</option>
                        </select>
                      </div>

                      {/* Text Color */}
                      <div className="space-y-2">
                        <Label htmlFor="textColor" className="text-xs">
                          Text Color
                        </Label>
                        <div className="flex gap-2">
                          <input
                            id="textColor"
                            type="color"
                            value={
                              (nodeData.metadata as any)?.textColor || "#d5e5ff"
                            }
                            onChange={(e) => {
                              const newMetadata = {
                                ...(nodeData.metadata || {}),
                                textColor: e.target.value,
                              };
                              if (selectedNode) {
                                onNodeDataChange(selectedNode.id, {
                                  metadata: newMetadata,
                                });
                              }
                            }}
                            className="w-16 h-8 border border-gray-300 rounded cursor-pointer"
                          />
                          <Input
                            value={
                              (nodeData.metadata as any)?.textColor || "#d5e5ff"
                            }
                            onChange={(e) => {
                              const newMetadata = {
                                ...(nodeData.metadata || {}),
                                textColor: e.target.value,
                              };
                              if (selectedNode) {
                                onNodeDataChange(selectedNode.id, {
                                  metadata: newMetadata,
                                });
                              }
                            }}
                            placeholder="#d5e5ff"
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>

                      {/* Background Color */}
                      <div className="space-y-2">
                        <Label htmlFor="backgroundColor" className="text-xs">
                          Background Color
                        </Label>
                        <div className="flex gap-2">
                          <input
                            id="backgroundColor"
                            type="color"
                            value={
                              (nodeData.metadata as any)?.backgroundColor ||
                              "#ffffff"
                            }
                            onChange={(e) => {
                              const newMetadata = {
                                ...(nodeData.metadata || {}),
                                backgroundColor: e.target.value,
                              };
                              if (selectedNode) {
                                onNodeDataChange(selectedNode.id, {
                                  metadata: newMetadata,
                                });
                              }
                            }}
                            className="w-16 h-8 border border-gray-300 rounded cursor-pointer"
                          />
                          <Input
                            value={
                              (nodeData.metadata as any)?.backgroundColor ||
                              "transparent"
                            }
                            onChange={(e) => {
                              const newMetadata = {
                                ...(nodeData.metadata || {}),
                                backgroundColor: e.target.value,
                              };
                              if (selectedNode) {
                                onNodeDataChange(selectedNode.id, {
                                  metadata: newMetadata,
                                });
                              }
                            }}
                            placeholder="transparent"
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>

                      {/* Font Weight */}
                      <div className="space-y-2">
                        <Label htmlFor="fontWeight" className="text-xs">
                          Font Weight
                        </Label>
                        <select
                          id="fontWeight"
                          value={
                            (nodeData.metadata as any)?.fontWeight || "normal"
                          }
                          onChange={(e) => {
                            const newMetadata = {
                              ...(nodeData.metadata || {}),
                              fontWeight: e.target.value,
                            };
                            if (selectedNode) {
                              onNodeDataChange(selectedNode.id, {
                                metadata: newMetadata,
                              });
                            }
                          }}
                          className="w-full px-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                          <option value="600">Semi Bold</option>
                          <option value="300">Light</option>
                        </select>
                      </div>

                      {/* Text Alignment */}
                      <div className="space-y-2">
                        <Label htmlFor="textAlign" className="text-xs">
                          Text Alignment
                        </Label>
                        <select
                          id="textAlign"
                          value={
                            (nodeData.metadata as any)?.textAlign || "center"
                          }
                          onChange={(e) => {
                            const newMetadata = {
                              ...(nodeData.metadata || {}),
                              textAlign: e.target.value,
                            };
                            if (selectedNode) {
                              onNodeDataChange(selectedNode.id, {
                                metadata: newMetadata,
                              });
                            }
                          }}
                          className="w-full px-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
                {!isTextNode && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="instructions">Instructions</Label>
                      <Textarea
                        id="instructions"
                        name="instructions"
                        placeholder="Add instruction..."
                        value={localInstructions}
                        onChange={handleInputChange("instructions")}
                        onFocus={handleInstructionsFocus}
                        onBlur={handleInstructionsBlur}
                        className="min-h-[100px]"
                      />
                    </div>

                    {/* Submission Requirement - Only for learning nodes */}
                    <div className="space-y-2">
                      <Label htmlFor="submission_requirement">
                        Submission Requirement
                      </Label>
                      <RadioGroup
                        id="submission_requirement"
                        value={
                          (nodeData.metadata as any)?.submission_requirement ||
                          "single"
                        }
                        onValueChange={(value: "single" | "all") => {
                          const newMetadata = {
                            ...(nodeData.metadata || {}),
                            submission_requirement: value,
                          };
                          if (selectedNode) {
                            onNodeDataChange(selectedNode.id, {
                              metadata: newMetadata,
                            });
                          }
                        }}
                        className="flex gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem
                            value="single"
                            id="requirement-single"
                          />
                          <Label
                            htmlFor="requirement-single"
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <span className="text-blue-500">👤</span>
                            Single Member
                            <span className="text-xs text-muted-foreground">
                              (Any team member can complete)
                            </span>
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="all" id="requirement-all" />
                          <Label
                            htmlFor="requirement-all"
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <span className="text-purple-500">👥</span>
                            All Members
                            <span className="text-xs text-muted-foreground">
                              (All team members must complete)
                            </span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="difficulty">
                        Difficulty: {nodeData.difficulty}
                      </Label>
                      <Slider
                        id="difficulty"
                        name="difficulty"
                        min={1}
                        max={10}
                        step={1}
                        value={[nodeData.difficulty || 1]}
                        onValueChange={handleSliderChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sprite_url">Node Sprite</Label>
                      <div className="flex items-center gap-2">
                        {nodeData.sprite_url && (
                          <div className="w-12 h-12 bg-gradient-to-br from-sky-100 to-blue-100 rounded-lg flex items-center justify-center p-1 border">
                            <img
                              src={nodeData.sprite_url}
                              alt="Current sprite"
                              className="max-w-full max-h-full object-contain drop-shadow-sm"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <SpritePickerDialog
                            currentSprite={nodeData.sprite_url || undefined}
                            onSpriteSelect={async (spriteUrl) => {
                              if (!selectedNode) return;

                              try {
                                // Save sprite to database immediately
                                console.log(
                                  "🖼️ Saving sprite to database:",
                                  spriteUrl,
                                );
                                await updateNode(selectedNode.id, {
                                  sprite_url: spriteUrl,
                                });
                                console.log("✅ Sprite saved to database");

                                // Update local state
                                const newData = {
                                  ...nodeData,
                                  sprite_url: spriteUrl,
                                };
                                setNodeData(newData);
                                onNodeDataChange(selectedNode.id, {
                                  sprite_url: spriteUrl,
                                });

                                toast({
                                  title: "Sprite updated!",
                                  description:
                                    "Node sprite has been saved successfully.",
                                });
                              } catch (error) {
                                console.error(
                                  "❌ Failed to save sprite:",
                                  error,
                                );
                                toast({
                                  title: "Failed to save sprite",
                                  description:
                                    (error as Error).message || "Unknown error",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Button variant="outline" className="w-full">
                              <MapPin className="h-4 w-4 mr-2" />
                              {nodeData.sprite_url
                                ? "Change Sprite"
                                : "Choose Sprite"}
                            </Button>
                          </SpritePickerDialog>
                        </div>
                      </div>
                      {nodeData.sprite_url && (
                        <p className="text-xs text-muted-foreground">
                          Current: {nodeData.sprite_url.split("/").pop()}
                        </p>
                      )}
                    </div>
                  </>
                )}
                <div className="text-xs text-muted-foreground mt-4 p-2 bg-muted rounded">
                  {isTextNode
                    ? "Text nodes are for annotations and labels. Changes are saved automatically to your draft."
                    : 'Changes are saved automatically to your draft. Use "Save All" to persist to database.'}
                </div>
              </div>
            </TabsContent>

            {!isTextNode && (
              <>
                <TabsContent value="content" className="m-0 h-full">
                  <div className="h-full overflow-y-auto">
                    <ContentEditor
                      nodeId={selectedNode.id}
                      content={selectedNode.data.node_content || []}
                      onContentChange={handleContentChange}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="assessment" className="m-0 h-full">
                  <div className="h-full overflow-y-auto">
                    <AssessmentEditor
                      nodeId={selectedNode.id}
                      assessment={
                        selectedNode.data.node_assessments?.[0] || null
                      }
                      onAssessmentChange={handleAssessmentChange}
                      isSeedMap={isSeedMap}
                    />
                  </div>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        {/* PathLab Day Assignment */}
        {seedInfo?.seed_type === "pathlab" &&
          pathDays.length > 0 &&
          selectedNode &&
          !isTextNode && (
            <div className="border-t border-gray-700 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">PathLab Days</Label>
                <span className="text-xs text-gray-400">Assign to days</span>
              </div>
              <p className="text-xs text-gray-400">
                Check which days should include this node
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pathDays.map((day) => {
                  const isAssigned =
                    Array.isArray(day.node_ids) &&
                    day.node_ids.includes(selectedNode.id);
                  return (
                    <label
                      key={day.id}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                        isAssigned
                          ? "border-blue-500 bg-blue-950/30"
                          : "border-gray-700 hover:border-gray-600"
                      }`}
                      onClick={async () => {
                        if (!onPathDaysChange || !seedInfo) return;

                        const updatedDays = pathDays.map((d) => {
                          if (d.day_number === day.day_number) {
                            const currentNodeIds = Array.isArray(d.node_ids)
                              ? d.node_ids
                              : [];
                            const newNodeIds = isAssigned
                              ? currentNodeIds.filter(
                                  (id: string) => id !== selectedNode.id,
                                )
                              : [...currentNodeIds, selectedNode.id];
                            return { ...d, node_ids: newNodeIds };
                          }
                          return d;
                        });

                        onPathDaysChange(updatedDays);

                        // Save to database
                        try {
                          const pathResponse = await fetch(
                            `/api/pathlab/days?seedId=${seedInfo.id}`,
                          );
                          const pathData = await pathResponse.json();

                          if (pathData.days && pathData.days.length > 0) {
                            const pathId = pathData.days[0].path_id;

                            await fetch("/api/pathlab/days", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                pathId,
                                totalDays: updatedDays.length,
                                days: updatedDays,
                              }),
                            });

                            toast({
                              title: isAssigned
                                ? "Removed from day"
                                : "Added to day",
                              description: `Node ${isAssigned ? "removed from" : "added to"} Day ${day.day_number}`,
                            });
                          }
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to update day assignment",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => {}} // Handled by label onClick
                        className="h-4 w-4"
                      />
                      <span
                        className={`text-sm ${isAssigned ? "text-white font-medium" : "text-gray-300"}`}
                      >
                        Day {day.day_number}
                        {day.title ? `: ${day.title}` : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
