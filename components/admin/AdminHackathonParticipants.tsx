"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Users, UserCheck, UserX } from "lucide-react";
import { format } from "date-fns";

interface Team {
  id: string;
  name: string;
  join_code: string;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  university: string;
  role: string;
  track: string;
  grade_level: string;
  experience_level: number;
  referral_source: string;
  bio: string;
  created_at: string;
  team: Team | null;
  joined_team_at: string | null;
  is_in_waitlist?: boolean;
}

export function AdminHackathonParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchParticipants();
  }, []);

  async function fetchParticipants() {
    try {
      const response = await fetch("/api/admin/hackathon/participants");
      const data = await response.json();

      if (response.ok && data.participants) {
        setParticipants(data.participants);
      }
    } catch (error) {
      console.error("Error fetching participants:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredParticipants = participants.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.email.toLowerCase().includes(query) ||
      p.university.toLowerCase().includes(query) ||
      p.team?.name.toLowerCase().includes(query) ||
      ""
    );
  });

  const stats = {
    total: participants.length,
    withTeam: participants.filter((p) => p.team).length,
    withoutTeam: participants.filter((p) => !p.team).length,
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Participants
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Team</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withTeam}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0
                ? ((stats.withTeam / stats.total) * 100).toFixed(1)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Without Team</CardTitle>
            <UserX className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withoutTeam}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0
                ? ((stats.withoutTeam / stats.total) * 100).toFixed(1)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Participants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Hackathon Participants</CardTitle>
          <CardDescription>
            View and manage all registered hackathon participants
          </CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, university, or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>University</TableHead>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      {searchQuery
                        ? "No participants found matching your search"
                        : "No participants registered yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParticipants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">
                        {participant.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {participant.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {participant.university}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{participant.grade_level}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            participant.track === "Track 1"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-purple-500/10 text-purple-500"
                          }
                        >
                          {participant.track}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {participant.team ? (
                          participant.is_in_waitlist ? (
                            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                              Finding Team
                            </Badge>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-sm">
                                {participant.team.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Code: {participant.team.join_code}
                              </span>
                            </div>
                          )
                        ) : (
                          <Badge variant="outline" className="text-orange-500">
                            No Team
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(
                          new Date(participant.created_at),
                          "MMM d, yyyy"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
