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
        changedAssessment?.assessment_type
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
          <div className="flex-shrink-0 px-4 pt-2 bg-background border-b">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="assessment">Assessment</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <TabsContent value="details" className="m-0 p-4 space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={nodeData.title || ""}
                    onChange={handleInputChange("title")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    name="instructions"
                    placeholder="Instructions for the student..."
                    value={nodeData.instructions || ""}
                    onChange={handleInputChange("instructions")}
                    className="min-h-[100px]"
                  />
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
                <div className="text-xs text-muted-foreground mt-4 p-2 bg-muted rounded">
                  Changes are saved automatically to your draft. Use "Save All
                  Changes" to persist to database.
                </div>
              </div>
            </TabsContent>

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
                  assessment={selectedNode.data.node_assessments?.[0] || null}
                  onAssessmentChange={handleAssessmentChange}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
