"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import type { LobbyRosterEntry } from "@/types/lobby";
import { ArrowLeft, Users } from "lucide-react";

interface LobbyRosterProps {
  lobbyId: string;
  onBack: () => void;
}

export function LobbyRoster({ lobbyId, onBack }: LobbyRosterProps) {
  const [roster, setRoster] = useState<LobbyRosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoster = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/lobbies/${encodeURIComponent(lobbyId)}/roster`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setRoster(data.roster ?? []);
    } catch (error) {
      console.error("Error loading roster:", error);
      toast.error("Could not load the roster", {
        description: error instanceof Error ? error.message : undefined,
      });
      setRoster([]);
    } finally {
      setLoading(false);
    }
  }, [lobbyId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const getInitials = (name: string | null): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{roster.length} member{roster.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {roster.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No members in this lobby yet.
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Current Node</TableHead>
                <TableHead className="text-right">Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((entry) => (
                <TableRow key={entry.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {entry.avatar_url ? (
                          <AvatarImage src={entry.avatar_url} alt={entry.full_name ?? ""} />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {getInitials(entry.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {entry.full_name ?? "Unknown"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {entry.current_node_title ?? "Not started"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-medium">{entry.completed_count}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
