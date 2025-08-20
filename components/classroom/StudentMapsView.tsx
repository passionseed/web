"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Users,
  Calendar,
  ChevronDown,
  GitFork,
  Eye,
  Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getClassroomMaps } from "@/lib/supabase/classrooms";
import { getClassroomTeams, getClassroomTeamMaps } from "@/lib/supabase/teams";

interface LinkedMap {
  link_id: string;
  map_id: string;
  map_title: string;
  map_description: string | null;
  node_count: number;
  added_at: string;
}

interface TeamMap {
  team_map_id: string;
  map_id: string;
  original_map_id: string;
  team_id: string;
  team_name: string;
  team_description: string | null;
  map_title: string;
  map_description: string | null;
  original_map_title: string;
  created_by: string;
  created_at: string;
  forked_at: string;
  node_count: number;
  avg_difficulty: number;
  total_assessments: number;
  metadata: any;
}

interface StudentMapsViewProps {
  classroomId: string;
}

export default function StudentMapsView({ classroomId }: StudentMapsViewProps) {
  const [maps, setMaps] = useState<LinkedMap[] | null>(null);
  const [teamMaps, setTeamMaps] = useState<TeamMap[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [forkingMapId, setForkingMapId] = useState<string>("");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [m, tm] = await Promise.all([
          getClassroomMaps(classroomId),
          getClassroomTeamMaps(classroomId)
        ]);
        setMaps(m || []);
        setTeamMaps(tm || []);
      } catch (err) {
        console.error("Failed to load classroom maps for student view", err);
        toast({
          title: "Error",
          description: "Could not load learning maps",
          variant: "destructive",
        });
        setMaps([]);
        setTeamMaps([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [classroomId, toast]);

  useEffect(() => {
    const loadTeams = async () => {
      setTeamsLoading(true);
      try {
        const t = await getClassroomTeams(classroomId);
        setTeams(t || []);
      } catch (err) {
        console.error("Failed to load teams for student fork UI", err);
      } finally {
        setTeamsLoading(false);
      }
    };
    loadTeams();
  }, [classroomId]);

  if (loading || teamsLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-16 w-full" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-20" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if ((!maps || maps.length === 0) && (!teamMaps || teamMaps.length === 0)) {
    return (
      <div className="text-center py-16">
        <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent max-w-2xl mx-auto">
          <CardHeader className="pb-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              No Learning Maps Available
            </CardTitle>
            <CardDescription className="text-base">
              No maps have been linked to this classroom yet. Ask your
              instructor to add learning maps so you can begin your learning
              journey.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              When maps are available, you'll be able to fork them to your team
              and start working through the content.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleForkMap = async (mapId: string, mapTitle: string) => {
    const leaderTeams = teams.filter(
      (t) => t.current_user_membership && t.current_user_membership.is_leader
    );

    if (!leaderTeams || leaderTeams.length === 0) {
      toast({
        title: "Not a team leader",
        description: "You must be a leader of a team to fork this map",
        variant: "destructive",
      });
      return;
    }

    // If only one leader team, use it; otherwise prompt
    let selectedTeamId = leaderTeams[0].id;
    if (leaderTeams.length > 1) {
      const pick = prompt(
        `You lead multiple teams. Enter the team number to fork "${mapTitle}" to:\n${leaderTeams.map((lt: any, i: number) => `${i + 1}) ${lt.name}`).join("\n")}`
      );
      const idx = parseInt(pick || "", 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= leaderTeams.length) {
        toast({ title: "Cancelled", description: "Invalid team selection" });
        return;
      }
      selectedTeamId = leaderTeams[idx].id;
    }

    try {
      setForkingMapId(mapId);
      const res = await fetch(
        `/api/classrooms/${classroomId}/maps/${mapId}/fork-to-team`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team_id: selectedTeamId }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        console.error("Fork failed", data);
        toast({
          title: "Fork failed",
          description: data?.error || "Could not fork map",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Map forked successfully!",
        description: "Opening your team's map editor...",
      });

      const newMapId = data?.map?.id || data?.team_map?.map_id;
      if (newMapId) {
        router.push(`/map/${newMapId}/edit`);
      } else {
        console.warn("No new map id returned from fork API", data);
      }
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
  };

  const getLeaderTeams = () => {
    return teams.filter(
      (t) => t.current_user_membership && t.current_user_membership.is_leader
    );
  };

  return (
    <div className="space-y-8">

      {/* Team Forked Maps Section */}
      {teamMaps && teamMaps.length > 0 && (
        <>
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-50 rounded-full">
              <GitFork className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Your Team Maps
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Forked Learning Maps
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These are maps your team has forked. Click to continue working on them together.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMaps.map((tm) => (
              <Card
                key={tm.team_map_id}
                className="group relative overflow-hidden border-2 border-green-200 hover:border-green-300 transition-all duration-200 hover:shadow-lg bg-green-50/30"
              >
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-100/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                <CardHeader className="relative">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                      <Users className="h-3 w-3 mr-1" />
                      {tm.node_count} nodes
                    </Badge>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(tm.forked_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-green-600 font-medium">
                      Team: {tm.team_name}
                    </div>
                    <CardTitle className="text-xl font-bold leading-tight group-hover:text-green-700 transition-colors">
                      {tm.map_title}
                    </CardTitle>
                  </div>

                  {tm.map_description && (
                    <CardDescription className="text-sm leading-relaxed">
                      {tm.map_description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="relative pt-0">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Forked from: {tm.original_map_title}
                    </div>
                    <Link href={`/map/${tm.map_id}/edit`}>
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <BookOpen className="h-4 w-4 mr-1" />
                        Open Team Map
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Original Classroom Maps Section */}
      {maps && maps.length > 0 && (
        <>
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary/10 rounded-full">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">
                Available Maps
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Fork New Learning Maps
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Fork a learning map to your team to begin working through interactive
              content, assessments, and collaborative projects.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {maps.map((m) => (
              <Card
                key={m.link_id}
                className="group relative overflow-hidden border-2 hover:border-primary/30 transition-all duration-200 hover:shadow-lg"
              >
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                <CardHeader className="relative">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {m.node_count} nodes
                    </Badge>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(m.added_at).toLocaleDateString()}
                    </div>
                  </div>

                  <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                    {m.map_title}
                  </CardTitle>

                  {m.map_description && (
                    <CardDescription className="text-sm leading-relaxed">
                      {m.map_description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="relative pt-0">
                  <div className="flex items-center justify-between">
                    {/* Direct view option */}
                    <Link href={`/map/${m.map_id}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Eye className="h-4 w-4 mr-1" />
                        View Only
                      </Button>
                    </Link>

                    {/* Fork option */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-white"
                          disabled={forkingMapId === m.map_id}
                        >
                          {forkingMapId === m.map_id ? (
                            "Forking..."
                          ) : (
                            <>
                              <GitFork className="h-4 w-4 mr-1" />
                              Fork to Team
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {getLeaderTeams().length === 0 ? (
                          <DropdownMenuItem disabled>
                            You must be a team leader to fork
                          </DropdownMenuItem>
                        ) : getLeaderTeams().length === 1 ? (
                          <DropdownMenuItem
                            onClick={() => handleForkMap(m.map_id, m.map_title)}
                          >
                            <GitFork className="h-4 w-4 mr-2" />
                            Fork to {getLeaderTeams()[0].name}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleForkMap(m.map_id, m.map_title)}
                          >
                            <GitFork className="h-4 w-4 mr-2" />
                            Choose team to fork to...
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Help text */}
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Tip:</strong> Fork a map to your team to create an editable
          copy you can work on together. Use "View Only" to browse the original
          map content.
        </p>
      </div>
    </div>
  );
}
