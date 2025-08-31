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
  GitBranch,
  Eye,
  Edit,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LinkMapModal } from "./LinkMapModal";
import { CreateAssignmentFromMapModal } from "./CreateAssignmentFromMapModal";
import {
  getClassroomMaps,
  unlinkMapFromClassroom,
  reorderClassroomMaps,
} from "@/lib/supabase/classrooms";
import { getClassroomTeams, getClassroomTeamMaps } from "@/lib/supabase/teams";

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
  canManage?: boolean;
  enableAssignments?: boolean;
  onMapsUpdated?: () => void;
}

export function ClassroomMapsManager({
  classroomId,
  canManage = false,
  enableAssignments = true,
  onMapsUpdated,
}: ClassroomMapsManagerProps) {
  const [linkedMaps, setLinkedMaps] = useState<LinkedMap[]>([]);
  const [teamForkedMaps, setTeamForkedMaps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teamMapsLoading, setTeamMapsLoading] = useState(true);
  const [unlinkingMapId, setUnlinkingMapId] = useState<string>("");
  const [teams, setTeams] = useState<any[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [forkingMapId, setForkingMapId] = useState<string>("");
  const router = useRouter();
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

  const loadTeamForkedMaps = async () => {
    console.log("🔄 ClassroomMapsManager: Loading team forked maps for classroom:", classroomId);
    setTeamMapsLoading(true);
    try {
      const teamMaps = await getClassroomTeamMaps(classroomId);
      console.log("✅ ClassroomMapsManager: Received team maps:", teamMaps);
      setTeamForkedMaps(teamMaps);
    } catch (error) {
      console.error("❌ ClassroomMapsManager: Failed to load team forked maps:", error);
      toast({
        title: "Error",
        description: "Failed to load team forked maps",
        variant: "destructive",
      });
    } finally {
      setTeamMapsLoading(false);
    }
  };

  useEffect(() => {
    loadLinkedMaps();
    loadTeamForkedMaps();
  }, [classroomId]);

  useEffect(() => {
    const loadTeams = async () => {
      setTeamsLoading(true);
      try {
        const t = await getClassroomTeams(classroomId);
        setTeams(t || []);
      } catch (err) {
        console.error("Failed to load teams for fork UI", err);
      } finally {
        setTeamsLoading(false);
      }
    };

    loadTeams();
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
    <div className="space-y-6">
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
                      <Link
                        href={`/map/${map.map_id}/edit`}
                        className="hover:underline"
                      >
                        {map.map_title}
                      </Link>
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
                  {enableAssignments && canManage && (
                    <CreateAssignmentFromMapModal
                      classroomId={classroomId}
                      mapId={map.map_id}
                      mapTitle={map.map_title}
                      onAssignmentCreated={() => {
                        onMapsUpdated?.();
                      }}
                    />
                  )}

                  {/* Quick edit link to map editor */}
                  <Link href={`/map/${map.map_id}/edit`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Fork to team - only show if user is leader of any team */}
                      {teamsLoading ? (
                        <DropdownMenuItem disabled>
                          Loading teams...
                        </DropdownMenuItem>
                      ) : null}
                      {teams && teams.length > 0 ? (
                        <DropdownMenuItem
                          onClick={async () => {
                            // Show inline prompt to select team by name
                            const leaderTeams = teams.filter(
                              (t) =>
                                t.current_user_membership &&
                                t.current_user_membership.is_leader
                            );
                            if (!leaderTeams || leaderTeams.length === 0) {
                              toast({
                                title: "Not a team leader",
                                description:
                                  "You must be a leader of a team to fork this map",
                                variant: "destructive",
                              });
                              return;
                            }

                            // If only one leader team, pick it; otherwise prompt via prompt()
                            let selectedTeamId = leaderTeams[0].id;
                            if (leaderTeams.length > 1) {
                              const pick = prompt(
                                `You lead multiple teams. Enter the team number to fork to:\n${leaderTeams.map((lt: any, i: number) => `${i + 1}) ${lt.name}`).join("\n")}`
                              );
                              const idx = parseInt(pick || "", 10) - 1;
                              if (
                                isNaN(idx) ||
                                idx < 0 ||
                                idx >= leaderTeams.length
                              ) {
                                toast({
                                  title: "Cancelled",
                                  description: "Invalid team selection",
                                });
                                return;
                              }
                              selectedTeamId = leaderTeams[idx].id;
                            }

                            // Call API
                            try {
                              setForkingMapId(map.map_id);
                              const res = await fetch(
                                `/api/classrooms/${classroomId}/maps/${map.map_id}/fork-to-team`,
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    team_id: selectedTeamId,
                                  }),
                                }
                              );
                              const data = await res.json();
                              if (!res.ok) {
                                console.error("Fork failed", data);
                                toast({
                                  title: "Fork failed",
                                  description:
                                    data?.error || "Could not fork map",
                                  variant: "destructive",
                                });
                                return;
                              }

                              toast({
                                title: "Fork created",
                                description: "Opening map editor...",
                              });
                              // Navigate to new map editor
                              const newMapId =
                                data?.map?.id || data?.team_map?.map_id;
                              if (newMapId)
                                router.push(`/map/${newMapId}/edit`);
                              else
                                console.warn(
                                  "No new map id returned from fork API",
                                  data
                                );
                            } catch (err) {
                              console.error("Error calling fork API", err);
                              toast({
                                title: "Error",
                                description: "Failed to fork map",
                                variant: "destructive",
                              });
                            } finally {
                              setForkingMapId("");
                            }
                          }}
                        >
                          <GripVertical className="h-4 w-4 mr-2" />
                          Fork to team
                        </DropdownMenuItem>
                      ) : null}

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

    {/* Team Forked Maps Section */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <GitBranch className="h-5 w-5" />
              <span>Team Forked Maps</span>
              <Badge variant="secondary">{teamForkedMaps.length}</Badge>
            </CardTitle>
            <CardDescription>
              Maps that teams have forked and customized from classroom maps
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {teamMapsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
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
        ) : teamForkedMaps.length === 0 ? (
          <div className="text-center py-12">
            <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Team Forked Maps</h3>
            <p className="text-muted-foreground mb-4">
              Teams haven't created any custom forks of the classroom maps yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamForkedMaps.map((teamMap) => (
              <div
                key={teamMap.team_map_id}
                className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Fork Icon */}
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <GitBranch className="h-5 w-5 text-orange-500" />
                  </div>
                </div>

                {/* Map Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-sm truncate">
                      {teamMap.map_title}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {teamMap.team_name}
                    </Badge>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{teamMap.node_count} nodes</span>
                    </div>
                  </div>

                  {teamMap.map_description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                      {teamMap.map_description}
                    </p>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <GitBranch className="h-3 w-3" />
                      <span>Forked from: {teamMap.original_map_title}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Forked {new Date(teamMap.forked_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {/* View link */}
                  <Link href={`/map/${teamMap.map_id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </Link>

                  {/* Edit link */}
                  <Link href={`/map/${teamMap.map_id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
