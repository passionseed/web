"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  GitFork,
  Calendar,
  Users,
  BarChart3,
  ExternalLink,
  Edit,
  Eye,
} from "lucide-react";

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

interface TeamMapsPanelProps {
  teamMaps: TeamMap[];
  onMapsUpdated: () => void;
}

export function TeamMapsPanel({ teamMaps, onMapsUpdated }: TeamMapsPanelProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDifficultyBadge = (difficulty: number) => {
    if (difficulty <= 2) return { label: "Beginner", variant: "secondary" as const };
    if (difficulty <= 3) return { label: "Intermediate", variant: "default" as const };
    return { label: "Advanced", variant: "destructive" as const };
  };

  if (teamMaps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <GitFork className="h-5 w-5 mr-2" />
            Team Learning Maps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <GitFork className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No forked maps yet</p>
            <p className="text-sm">
              Fork a learning map from your classroom to start collaborating
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <GitFork className="h-5 w-5 mr-2" />
          Team Learning Maps ({teamMaps.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Forked learning maps your team is collaborating on
        </p>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {teamMaps.map((map) => {
            const difficulty = getDifficultyBadge(map.avg_difficulty);
            
            return (
              <div
                key={map.team_map_id}
                className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-base truncate">
                        {map.map_title}
                      </h3>
                      <Badge variant={difficulty.variant} className="text-xs">
                        {difficulty.label}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {map.map_description || "No description available"}
                    </p>
                    
                    <div className="flex items-center text-xs text-muted-foreground space-x-4">
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {map.node_count} nodes
                      </div>
                      <div className="flex items-center">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        {map.total_assessments} assessments
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Forked {formatDate(map.forked_at)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Original Map Info */}
                <div className="bg-muted/30 rounded p-3 mb-3">
                  <div className="flex items-center text-xs text-muted-foreground mb-1">
                    <GitFork className="h-3 w-3 mr-1" />
                    Forked from:
                  </div>
                  <div className="text-sm font-medium">{map.original_map_title}</div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Link href={`/map/${map.map_id}/edit`} className="flex-1">
                    <Button className="w-full" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Team Map
                    </Button>
                  </Link>
                  
                  <Link href={`/map/${map.map_id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </Link>
                  
                  <Link href={`/map/${map.original_map_id}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Original
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Footer */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Need more maps? Visit your classroom to fork additional learning maps.
            </p>
            <Link href="/classrooms">
              <Button variant="outline" size="sm">
                <BookOpen className="h-4 w-4 mr-2" />
                Browse Classrooms
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}