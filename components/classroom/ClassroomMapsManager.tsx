"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  MoreVertical,
  Unlink,
  Plus,
  GripVertical,
  Users,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LinkMapModal } from "./LinkMapModal";
import { CreateAssignmentFromMapModal } from "./CreateAssignmentFromMapModal";
import {
  getClassroomMaps,
  unlinkMapFromClassroom,
  reorderClassroomMaps,
} from "@/lib/supabase/classrooms";

interface LinkedMap {
  link_id: string;
  map_id: string;
  map_title: string;
  map_description: string | null;
  node_count: number;
  added_at: string;
  added_by: string;
  display_order: number;
  notes: string | null;
  is_active: boolean;
}

interface ClassroomMapsManagerProps {
  classroomId: string;
}

export function ClassroomMapsManager({
  classroomId,
}: ClassroomMapsManagerProps) {
  const [linkedMaps, setLinkedMaps] = useState<LinkedMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unlinkingMapId, setUnlinkingMapId] = useState<string>("");
  const { toast } = useToast();

  const loadLinkedMaps = async () => {
    setIsLoading(true);
    try {
      const maps = await getClassroomMaps(classroomId);
      setLinkedMaps(maps);
    } catch (error) {
      console.error("Failed to load linked maps:", error);
      toast({
        title: "Error",
        description: "Failed to load linked maps",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLinkedMaps();
  }, [classroomId]);

  const handleUnlinkMap = async (mapId: string, mapTitle: string) => {
    if (
      !confirm(
        `Are you sure you want to unlink "${mapTitle}" from this classroom?`
      )
    ) {
      return;
    }

    setUnlinkingMapId(mapId);
    try {
      await unlinkMapFromClassroom(classroomId, mapId);
      toast({
        title: "Success",
        description: `"${mapTitle}" has been unlinked from the classroom`,
      });
      loadLinkedMaps(); // Reload the list
    } catch (error) {
      console.error("Failed to unlink map:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to unlink map",
        variant: "destructive",
      });
    } finally {
      setUnlinkingMapId("");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-4 p-4 border rounded-lg"
              >
                <Skeleton className="h-8 w-8" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>Linked Learning Maps</span>
              <Badge variant="secondary">{linkedMaps.length}</Badge>
            </CardTitle>
            <CardDescription>
              Maps linked to this classroom can be used to create assignments
            </CardDescription>
          </div>
          <LinkMapModal
            classroomId={classroomId}
            onMapLinked={loadLinkedMaps}
          />
        </div>
      </CardHeader>

      <CardContent>
        {linkedMaps.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Maps Linked</h3>
            <p className="text-muted-foreground mb-4">
              Link learning maps to this classroom to create assignments from
              their content
            </p>
            <LinkMapModal
              classroomId={classroomId}
              onMapLinked={loadLinkedMaps}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {linkedMaps.map((map) => (
              <div
                key={map.link_id}
                className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Map Icon */}
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                </div>

                {/* Map Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-sm truncate">
                      {map.map_title}
                    </h4>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{map.node_count} nodes</span>
                    </div>
                  </div>

                  {map.map_description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                      {map.map_description}
                    </p>
                  )}

                  {map.notes && (
                    <p className="text-xs text-muted-foreground italic line-clamp-1">
                      Note: {map.notes}
                    </p>
                  )}

                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Linked {new Date(map.added_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <CreateAssignmentFromMapModal
                    classroomId={classroomId}
                    mapId={map.map_id}
                    mapTitle={map.map_title}
                    onAssignmentCreated={() => {
                      // Optionally refresh parent component
                    }}
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          handleUnlinkMap(map.map_id, map.map_title)
                        }
                        disabled={unlinkingMapId === map.map_id}
                        className="text-destructive focus:text-destructive"
                      >
                        <Unlink className="h-4 w-4 mr-2" />
                        Unlink Map
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
