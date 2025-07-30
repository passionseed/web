"use client";

import { useEffect, useState, useTransition } from "react";
import { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { MapNode, NodeContent, NodeAssessment } from "@/types/map";
import { Loader2, Save, Trash2 } from "lucide-react";
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
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedNode) {
      setNodeData(selectedNode.data);
    }
  }, [selectedNode]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const newData = { ...nodeData, [name]: value };
    setNodeData(newData);

    // Update immediately without needing a save button
    if (selectedNode) {
      onNodeDataChange(selectedNode.id, { [name]: value });
    }
  };

  const handleSliderChange = (value: number[]) => {
    const newData = { ...nodeData, difficulty: value[0] };
    setNodeData(newData);

    // Update immediately
    if (selectedNode) {
      onNodeDataChange(selectedNode.id, { difficulty: value[0] });
    }
  };

  const handleContentChange = (newContent: NodeContent[]) => {
    console.log("NodeEditorPanel: Content changed, new content:", newContent);

    if (!selectedNode) {
      console.warn("NodeEditorPanel: No selected node, cannot update content");
      return;
    }

    // Update the node data with new content
    const updatedNodeData = {
      ...selectedNode.data,
      node_content: newContent,
    };

    console.log(
      "NodeEditorPanel: Calling onNodeDataChange with updated content"
    );
    onNodeDataChange(selectedNode.id, updatedNodeData);
  };

  const handleAssessmentChange = (
    changedAssessment: NodeAssessment | null,
    action: "add" | "delete"
  ) => {
    if (!selectedNode) return;

    const newAssessments =
      action === "add" && changedAssessment
        ? [
            {
              ...changedAssessment,
              id:
                changedAssessment.id ||
                `temp_assessment_${Date.now()}_${Math.random()}`,
            },
          ]
        : [];

    const updatedNodeData = { ...nodeData, node_assessments: newAssessments };
    setNodeData(updatedNodeData);
    onNodeDataChange(selectedNode.id, {
      node_assessments: newAssessments,
    } as any);
  };

  const handleDeleteNode = () => {
    if (selectedNode && onNodeDelete) {
      onNodeDelete(selectedNode.id);
    }
  };

  if (!selectedNode) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Select a node to edit its details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 h-full">
      <div className="space-y-6">
        {/* Header with delete button */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit Node</h3>
          {onNodeDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Node</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{selectedNode.data.title}"?{" "}
                    This will also remove all connections to and from this node.{" "}
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteNode}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Node
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <Tabs defaultValue="details" className="h-full flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">
              Details
            </TabsTrigger>
            <TabsTrigger value="content" className="flex-1">
              Content
            </TabsTrigger>
            <TabsTrigger value="assessment" className="flex-1">
              Assessment
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="flex-grow">
            <div className="p-2 space-y-4 h-full">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={nodeData.title || ""}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    name="instructions"
                    placeholder="Instructions for the student..."
                    value={nodeData.instructions || ""}
                    onChange={handleInputChange}
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
                  <Label htmlFor="sprite_url">Sprite URL</Label>
                  <Input
                    id="sprite_url"
                    name="sprite_url"
                    placeholder="http://path/to/image.png"
                    value={nodeData.sprite_url || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-4 p-2 bg-muted rounded">
                Changes are saved automatically to your draft. Use "Save All
                Changes" to persist to database.
              </div>
            </div>
          </TabsContent>
          <TabsContent value="content" className="flex-grow overflow-y-auto">
            <div className="h-full flex flex-col">
              <div className="flex-grow">
                <ContentEditor
                  nodeId={selectedNode.id}
                  content={selectedNode.data.node_content || []}
                  onContentChange={handleContentChange}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="assessment" className="flex-grow overflow-y-auto">
            <div className="h-full flex flex-col">
              <div className="flex-grow">
                <AssessmentEditor
                  nodeId={selectedNode.id}
                  assessment={(nodeData as any).node_assessments?.[0] || null}
                  onAssessmentChange={handleAssessmentChange}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
