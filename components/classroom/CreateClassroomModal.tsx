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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Loader2,
  BookOpen,
  Users,
  Circle,
  CheckCircle2,
} from "lucide-react";
import {
  createClassroom,
  createClassroomWithMaps,
  getAvailableLearningMaps,
} from "@/lib/supabase/classrooms";
import { useToast } from "@/hooks/use-toast";
import type { CreateClassroomRequest } from "@/types/classroom";

interface AvailableLearningMap {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: number | null;
  node_count: number;
  created_at: string;
}

interface CreateClassroomModalProps {
  onClassroomCreated?: () => void;
}

export function CreateClassroomModal({
  onClassroomCreated,
}: CreateClassroomModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMapsLoading, setIsMapsLoading] = useState(false);
  const [availableMaps, setAvailableMaps] = useState<AvailableLearningMap[]>(
    []
  );
  const [formData, setFormData] = useState<
    CreateClassroomRequest & { selectedMapIds: string[] }
  >({
    name: "",
    description: "",
    max_students: 30,
    selectedMapIds: [],
  });
  
  const [maxStudentsInput, setMaxStudentsInput] = useState<string>("30");
  const { toast } = useToast();

  const loadAvailableMaps = async () => {
    if (!open) return;

    setIsMapsLoading(true);
    try {
      const maps = await getAvailableLearningMaps();
      setAvailableMaps(maps);
    } catch (error) {
      console.error("Failed to load available maps:", error);
      toast({
        title: "Warning",
        description: "Failed to load available maps for linking",
        variant: "destructive",
      });
    } finally {
      setIsMapsLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableMaps();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Classroom name is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await createClassroomWithMaps({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        max_students: formData.max_students || 30,
        selectedMapIds: formData.selectedMapIds,
      });

      toast({
        title: "Success",
        description: `Classroom "${result.classroom.name}" created with join code: ${result.join_code}${
          result.linked_maps_count > 0
            ? ` and ${result.linked_maps_count} learning maps linked`
            : ""
        }`,
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        max_students: 30,
        selectedMapIds: [],
      });
      setMaxStudentsInput("30");

      setOpen(false);
      onClassroomCreated?.();
    } catch (error) {
      console.error("Create classroom error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create classroom",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof (CreateClassroomRequest & { selectedMapIds: string[] }),
    value: string | number | string[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleMapSelection = (mapId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedMapIds: prev.selectedMapIds.includes(mapId)
        ? prev.selectedMapIds.filter((id) => id !== mapId)
        : [...prev.selectedMapIds, mapId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Classroom
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <DialogHeader>
            <DialogTitle>Create New Classroom</DialogTitle>
            <DialogDescription>
              Set up a new classroom for your students. You can optionally link
              learning maps during creation.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            defaultValue="details"
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Classroom Details</TabsTrigger>
              <TabsTrigger value="maps">Link Learning Maps</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Classroom Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., JavaScript Fundamentals - Spring 2025"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the classroom and what students will learn..."
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_students">Maximum Students</Label>
                <Input
                  id="max_students"
                  type="number"
                  min="1"
                  max="1000"
                  value={maxStudentsInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMaxStudentsInput(value);
                    
                    // Update formData with parsed value or keep as undefined if empty
                    if (value === "") {
                      setFormData(prev => ({ ...prev, max_students: undefined as any }));
                    } else {
                      const parsed = parseInt(value);
                      if (!isNaN(parsed) && parsed > 0) {
                        setFormData(prev => ({ ...prev, max_students: parsed }));
                      }
                    }
                  }}
                  onBlur={() => {
                    // If empty on blur, set to default value of 30
                    if (maxStudentsInput === "") {
                      setMaxStudentsInput("30");
                      setFormData(prev => ({ ...prev, max_students: 30 }));
                    }
                  }}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  You can change this limit later in classroom settings
                </p>
              </div>

              {formData.selectedMapIds.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Learning Maps</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <BookOpen className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {formData.selectedMapIds.length} map(s) selected
                      </span>
                    </div>
                    <div className="space-y-1">
                      {formData.selectedMapIds.map((mapId) => {
                        const map = availableMaps.find((m) => m.id === mapId);
                        return map ? (
                          <div
                            key={mapId}
                            className="text-xs text-muted-foreground"
                          >
                            • {map.title}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="maps"
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">
                      Available Learning Maps
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Select maps to link to your classroom (optional)
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {formData.selectedMapIds.length} selected
                  </Badge>
                </div>

                {isMapsLoading ? (
                  <div className="space-y-3">
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
                ) : (
                  <ScrollArea className="flex-1 border rounded-lg">
                    <div className="p-4 space-y-3">
                      {availableMaps.length === 0 ? (
                        <div className="text-center py-8">
                          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="font-medium mb-2">
                            No Learning Maps Found
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Create some learning maps first to link them to
                            classrooms
                          </p>
                        </div>
                      ) : (
                        availableMaps.map((map) => {
                          const isSelected = formData.selectedMapIds.includes(
                            map.id
                          );
                          return (
                            <div
                              key={map.id}
                              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-primary/5 border-primary"
                                  : "hover:bg-muted/50"
                              }`}
                              onClick={() => toggleMapSelection(map.id)}
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
                                  {map.title}
                                </h4>
                                {map.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                    {map.description}
                                  </p>
                                )}
                                <div className="flex items-center space-x-3 text-xs">
                                  <div className="flex items-center space-x-1">
                                    <Users className="h-3 w-3" />
                                    <span>{map.node_count} nodes</span>
                                  </div>
                                  {map.category && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {map.category}
                                    </Badge>
                                  )}
                                  {map.difficulty && (
                                    <div className="flex items-center space-x-1">
                                      <Circle className="h-2 w-2 fill-current text-yellow-500" />
                                      <span>Level {map.difficulty}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Classroom
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
