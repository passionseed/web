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
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, BookOpen, Users, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getAvailableMapsForClassroom,
  linkMapToClassroom,
} from "@/lib/supabase/classrooms";

interface LinkMapModalProps {
  classroomId: string;
  onMapLinked?: () => void;
}

interface AvailableMap {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty_level: number | null;
  node_count: number;
  created_at: string;
}

export function LinkMapModal({ classroomId, onMapLinked }: LinkMapModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableMaps, setAvailableMaps] = useState<AvailableMap[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const filteredMaps = availableMaps.filter(
    (map) =>
      map.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      map.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      map.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMap = availableMaps.find((map) => map.id === selectedMapId);

  const loadAvailableMaps = async () => {
    if (!open) return;

    setIsLoading(true);
    try {
      const maps = await getAvailableMapsForClassroom(classroomId);
      setAvailableMaps(maps);
    } catch (error) {
      console.error("Failed to load available maps:", error);
      toast({
        title: "Error",
        description: "Failed to load available maps",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableMaps();
  }, [open, classroomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMapId) {
      toast({
        title: "Error",
        description: "Please select a map to link",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await linkMapToClassroom(classroomId, selectedMapId, notes || undefined);

      toast({
        title: "Success",
        description: `Map "${selectedMap?.title}" has been linked to the classroom`,
      });

      // Reset form
      setSelectedMapId("");
      setNotes("");
      setSearchQuery("");
      setOpen(false);
      onMapLinked?.();
    } catch (error) {
      console.error("Link map error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to link map",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyColor = (level: number | null) => {
    if (!level) return "bg-gray-100 text-gray-800";
    if (level <= 2) return "bg-green-100 text-green-800";
    if (level <= 3) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getDifficultyLabel = (level: number | null) => {
    if (!level) return "Unknown";
    if (level <= 1) return "Beginner";
    if (level <= 2) return "Easy";
    if (level <= 3) return "Medium";
    if (level <= 4) return "Hard";
    return "Expert";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Link Map
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Link Learning Map to Classroom</DialogTitle>
          <DialogDescription>
            Select a learning map to link to this classroom. Linked maps can be
            used to create assignments.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Maps</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by title, description, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Map Selection */}
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
              <Label>Available Maps ({filteredMaps.length})</Label>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredMaps.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Available Maps
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "No maps match your search criteria"
                      : "All available maps are already linked to this classroom"}
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
                    {filteredMaps.map((map) => (
                      <Card
                        key={map.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedMapId === map.id
                            ? "ring-2 ring-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedMapId(map.id)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base line-clamp-2">
                              {map.title}
                            </CardTitle>
                            {map.difficulty_level && (
                              <Badge
                                variant="secondary"
                                className={getDifficultyColor(
                                  map.difficulty_level
                                )}
                              >
                                {getDifficultyLabel(map.difficulty_level)}
                              </Badge>
                            )}
                          </div>
                          {map.description && (
                            <CardDescription className="text-sm line-clamp-2">
                              {map.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1">
                                <Users className="h-4 w-4" />
                                <span>{map.node_count} nodes</span>
                              </div>
                              {map.category && (
                                <Badge variant="outline" className="text-xs">
                                  {map.category}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {new Date(map.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedMapId && (
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about why you're linking this map to the classroom..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground">
                  {notes.length}/1000 characters
                </p>
              </div>
            )}
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
            <Button type="submit" disabled={!selectedMapId || isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Link Map
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
