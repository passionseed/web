"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Users,
  Clock,
  Loader2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getClassroomAvailableNodes,
  createAssignmentFromMap,
} from "@/lib/supabase/classrooms";

interface CreateAssignmentFromMapModalProps {
  classroomId: string;
  mapId: string;
  mapTitle: string;
  onAssignmentCreated?: () => void;
}

interface MapNode {
  node_id: string;
  node_title: string;
  node_description: string | null;
  has_content: boolean;
  has_assessment: boolean;
}

interface MapWithNodes {
  map_id: string;
  map_title: string;
  nodes: MapNode[];
}

export function CreateAssignmentFromMapModal({
  classroomId,
  mapId,
  mapTitle,
  onAssignmentCreated,
}: CreateAssignmentFromMapModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableNodes, setAvailableNodes] = useState<MapWithNodes[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    selectedNodeIds: [] as string[],
    autoEnroll: true,
  });
  const { toast } = useToast();

  const currentMap = availableNodes.find((map) => map.map_id === mapId);

  const loadAvailableNodes = async () => {
    if (!open) return;

    setIsLoading(true);
    try {
      const nodes = await getClassroomAvailableNodes(classroomId);
      setAvailableNodes(nodes);

      // Auto-select the map we're creating from and set default title
      if (!formData.title) {
        setFormData((prev) => ({
          ...prev,
          title: `${mapTitle} Assignment`,
          selectedNodeIds:
            nodes
              .find((map: MapWithNodes) => map.map_id === mapId)
              ?.nodes.map((node: MapNode) => node.node_id) || [],
        }));
      }
    } catch (error) {
      console.error("Failed to load available nodes:", error);
      toast({
        title: "Error",
        description: "Failed to load available nodes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableNodes();
  }, [open, classroomId, mapId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Assignment title is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.selectedNodeIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one node for the assignment",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createAssignmentFromMap(
        classroomId,
        mapId,
        formData.title.trim(),
        formData.description.trim() || undefined,
        formData.selectedNodeIds,
        formData.autoEnroll
      );

      toast({
        title: "Success",
        description: `Assignment created with ${result.nodes_added} nodes and ${result.students_enrolled} students enrolled`,
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        selectedNodeIds: [],
        autoEnroll: true,
      });

      setOpen(false);
      onAssignmentCreated?.();
    } catch (error) {
      console.error("Create assignment error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create assignment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleNodeSelection = (nodeId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedNodeIds: prev.selectedNodeIds.includes(nodeId)
        ? prev.selectedNodeIds.filter((id) => id !== nodeId)
        : [...prev.selectedNodeIds, nodeId],
    }));
  };

  const selectAllNodes = () => {
    if (!currentMap) return;
    setFormData((prev) => ({
      ...prev,
      selectedNodeIds: currentMap.nodes.map((node) => node.node_id),
    }));
  };

  const deselectAllNodes = () => {
    setFormData((prev) => ({
      ...prev,
      selectedNodeIds: [],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Plus className="h-4 w-4 mr-1" />
          Create Assignment
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Assignment from "{mapTitle}"</DialogTitle>
          <DialogDescription>
            Create a new assignment based on the nodes from this learning map.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Assignment Details */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Assignment Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter assignment title..."
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what students will learn in this assignment..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  disabled={isSubmitting}
                  rows={2}
                />
              </div>
            </div>

            {/* Auto-enroll Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoEnroll"
                checked={formData.autoEnroll}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, autoEnroll: !!checked }))
                }
              />
              <Label htmlFor="autoEnroll" className="text-sm">
                Automatically enroll all classroom students
              </Label>
            </div>

            {/* Node Selection */}
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between">
                <Label>Select Nodes to Include</Label>
                {currentMap && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllNodes}
                      disabled={isLoading}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={deselectAllNodes}
                      disabled={isLoading}
                    >
                      Deselect All
                    </Button>
                    <Badge variant="secondary">
                      {formData.selectedNodeIds.length} of{" "}
                      {currentMap.nodes.length} selected
                    </Badge>
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-3 p-3 border rounded-lg"
                    >
                      <Skeleton className="h-5 w-5" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-3/4 mb-1" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : currentMap ? (
                <ScrollArea className="flex-1 border rounded-lg">
                  <div className="p-4 space-y-2">
                    {currentMap.nodes.map((node) => {
                      const isSelected = formData.selectedNodeIds.includes(
                        node.node_id
                      );
                      return (
                        <div
                          key={node.node_id}
                          className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-primary/5 border-primary"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => toggleNodeSelection(node.node_id)}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {isSelected ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm mb-1">
                              {node.node_title}
                            </h4>
                            {node.node_description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                {node.node_description}
                              </p>
                            )}
                            <div className="flex items-center space-x-3 text-xs">
                              <div
                                className={`flex items-center space-x-1 ${
                                  node.has_content
                                    ? "text-green-600"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <Circle className="h-3 w-3 fill-current" />
                                <span>Content</span>
                              </div>
                              <div
                                className={`flex items-center space-x-1 ${
                                  node.has_assessment
                                    ? "text-blue-600"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <Circle className="h-3 w-3 fill-current" />
                                <span>Assessment</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No nodes found for this map
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || formData.selectedNodeIds.length === 0}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Assignment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
