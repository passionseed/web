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
import { Trash2, MapPin } from "lucide-react";
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

interface NodeEditorPanelProps {
  selectedNode: Node<MapNode> | null;
  onNodeDataChange: (nodeId: string, data: Partial<MapNode>) => void;
  onNodeDelete?: (nodeId: string) => void;
}

export function NodeEditorPanel({
  selectedNode,
  onNodeDataChange,
  onNodeDelete,
}: NodeEditorPanelProps) {
  const [nodeData, setNodeData] = useState<Partial<MapNode>>({});
  // Track quiz questions separately for batch operations
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  // Check if this is a text node (text nodes don't need content/assessment tabs)
  const isTextNode = useMemo(() => {
    return (selectedNode?.data as any)?.node_type === "text";
  }, [selectedNode]);

  // For text nodes, we want immediate UI updates with debounced data changes
  const [localText, setLocalText] = useState("");

  // Sync local text with selected node data
  useEffect(() => {
    if (selectedNode && isTextNode) {
      setLocalText(selectedNode.data.title || "");
    }
  }, [selectedNode, isTextNode]);

  // Debounced update for text nodes
  useEffect(() => {
    if (!isTextNode || !selectedNode) return;

    const timeoutId = setTimeout(() => {
      if (localText !== selectedNode.data.title) {
        onNodeDataChange(selectedNode.id, { title: localText });
      }
    }, 150); // 150ms debounce

    return () => clearTimeout(timeoutId);
  }, [localText, isTextNode, selectedNode, onNodeDataChange]);

  useEffect(() => {
    if (selectedNode) {
      setNodeData(selectedNode.data);
      // Initialize quiz questions from existing assessment
      const assessment = selectedNode.data.node_assessments?.[0];
      if (assessment?.assessment_type === "quiz") {
        setQuizQuestions(assessment.quiz_questions || []);
        console.log(
          "📋 Loaded existing quiz questions:",
          assessment.quiz_questions?.length || 0
        );
      }
    }
  }, [selectedNode]);

  const handleInputChange = useCallback(
    (field: keyof MapNode) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { value } = e.target;

        // For text nodes title field, use local state for immediate UI updates
        if (isTextNode && field === "title") {
          setLocalText(value);
          return;
        }

        // For other fields, use normal update flow
        const newData = { ...nodeData, [field]: value };
        setNodeData(newData);

        if (selectedNode) {
          onNodeDataChange(selectedNode.id, { [field]: value });
        }
      },
    [nodeData, selectedNode, onNodeDataChange]
  );

  const handleSliderChange = useCallback(
    (value: number[]) => {
      const newData = { ...nodeData, difficulty: value[0] };
      setNodeData(newData);

      if (selectedNode) {
        onNodeDataChange(selectedNode.id, { difficulty: value[0] });
      }
    },
    [nodeData, selectedNode, onNodeDataChange]
  );

  const handleContentChange = useCallback(
    (newContent: NodeContent[]) => {
      console.log(
        "📝 NodeEditorPanel: Content changed, new content:",
        newContent.length
      );

      if (!selectedNode) {
        console.warn(
          "❌ NodeEditorPanel: No selected node, cannot update content"
        );
        return;
      }

      const updatedNodeData = {
        ...selectedNode.data,
        node_content: newContent,
      };

      onNodeDataChange(selectedNode.id, updatedNodeData);
    },
    [selectedNode, onNodeDataChange]
  );

  const handleAssessmentChange = useCallback(
    (changedAssessment: NodeAssessment | null, action: "add" | "delete") => {
      if (!selectedNode) return;

      console.log(
        "🔧 Assessment change:",
        action,
        changedAssessment?.assessment_type,
        "points_possible:",
        changedAssessment?.points_possible,
        "is_graded:",
        changedAssessment?.is_graded
      );

      const newAssessments =
        action === "add" && changedAssessment ? [changedAssessment] : [];
      const updatedNodeData = { ...nodeData, node_assessments: newAssessments };

      setNodeData(updatedNodeData);
      onNodeDataChange(selectedNode.id, {
        node_assessments: newAssessments,
      } as any);

      // Clear quiz questions if deleting assessment
      if (action === "delete") {
        setQuizQuestions([]);
      }
    },
    [selectedNode, nodeData, onNodeDataChange]
  );

  // NEW: Handle quiz questions changes specifically
  const handleQuizQuestionsChange = useCallback(
    (questions: QuizQuestion[]) => {
      console.log(
        "🔄 NodeEditorPanel: Quiz questions changed:",
        questions.length
      );
      setQuizQuestions(questions);

      if (!selectedNode) return;

      // Update the assessment with new questions
      const currentAssessment = nodeData.node_assessments?.[0];
      if (currentAssessment?.assessment_type === "quiz") {
        const updatedAssessment = {
          ...currentAssessment,
          quiz_questions: questions,
        };

        const updatedNodeData = {
          ...selectedNode.data,
          node_assessments: [updatedAssessment],
        };

        console.log("📊 Updating node with quiz questions:", questions.length);
        onNodeDataChange(selectedNode.id, updatedNodeData);
      }
    },
    [selectedNode, nodeData, onNodeDataChange]
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
    <div className="h-full flex flex-col bg-background overflow-hidden">
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
        <Tabs defaultValue="details" className="h-full flex flex-col">
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
                    value={isTextNode ? localText : nodeData.title || ""}
                    onChange={handleInputChange("title")}
                    placeholder={
                      isTextNode ? "Enter your text..." : "Node title..."
                    }
                  />
                </div>
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
                              (nodeData.metadata as any)?.textColor || "#374151"
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
                              (nodeData.metadata as any)?.textColor || "#374151"
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
                            placeholder="#374151"
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
                        value={nodeData.instructions || ""}
                        onChange={handleInputChange("instructions")}
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
                            onSpriteSelect={(spriteUrl) => {
                              const newData = {
                                ...nodeData,
                                sprite_url: spriteUrl,
                              };
                              setNodeData(newData);
                              if (selectedNode) {
                                onNodeDataChange(selectedNode.id, {
                                  sprite_url: spriteUrl,
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
                    : 'Changes are saved automatically to your draft. Use "Save All Changes" to persist to database.'}
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
                    />
                  </div>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
