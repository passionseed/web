"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search,
  Users,
  Calendar,
  Layers,
  ChevronRight,
  Download,
} from "lucide-react";
import { format } from "date-fns";

interface Participant {
  id: string;
  name: string;
  email: string;
  university: string;
  created_at: string;
}

interface TeamMember {
  joined_at: string;
  participant_id: string;
  hackathon_participants: Participant;
}

interface HackathonTeam {
  id: string;
  name: string;
  lobby_code: string;
  owner_id: string;
  created_at: string;
  hackathon_team_members: TeamMember[];
}

export function AdminHackathonTeams() {
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams() {
    try {
      const response = await fetch("/api/admin/hackathon/teams");
      const data = await response.json();

      if (response.ok && data.teams) {
        setTeams(data.teams);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTeams = teams.filter((t) => {
    const query = searchQuery.toLowerCase();
    const matchesTeamName = t.name.toLowerCase().includes(query);
    const matchesLobbyCode = t.lobby_code.toLowerCase().includes(query);
    const matchesMemberName = t.hackathon_team_members.some((m) =>
      m.hackathon_participants.name.toLowerCase().includes(query)
    );
    return matchesTeamName || matchesLobbyCode || matchesMemberName;
  });

  const stats = {
    totalTeams: teams.length,
    totalMembers: teams.reduce((acc, t) => acc + t.hackathon_team_members.length, 0),
    avgSize: teams.length > 0
      ? (teams.reduce((acc, t) => acc + t.hackathon_team_members.length, 0) / teams.length).toFixed(1)
      : 0,
    largestTeam: Math.max(0, ...teams.map((t) => t.hackathon_team_members.length)),
  };

  const downloadCSV = () => {
    // Generate CSV data: Team Name, Join Code, Member Name, University, Joined At, Reg At
    const headers = [
      "Team Name",
      "Lobby Code",
      "Member Name",
      "Email",
      "University",
      "Member Joined At",
      "Participant Registered At",
    ];
    
    const rows = teams.flatMap((team) =>
      team.hackathon_team_members.map((member) => [
        team.name,
        team.lobby_code,
        member.hackathon_participants.name,
        member.hackathon_participants.email,
        member.hackathon_participants.university,
        format(new Date(member.joined_at), "yyyy-MM-dd HH:mm:ss"),
        format(new Date(member.hackathon_participants.created_at), "yyyy-MM-dd HH:mm:ss"),
      ])
    );

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.map((val) => `"${val}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hackathon_teams_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="space-y-4 font-[family-name:var(--font-mitr)]">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Teams</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">Participants in teams</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Team Size</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgSize}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Largest Team</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.largestTeam}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 shadow-xl overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent italic">Hackathon Team Browser</CardTitle>
              <CardDescription className="text-slate-400">
                Browse all teams and their respective members.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={downloadCSV} className="border-slate-700 hover:bg-slate-800 transition-all font-medium">
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by team name, lobby code, or member name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-950/50 border-slate-700 focus:ring-blue-500/50"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-700/50 overflow-hidden bg-slate-950/20">
            <Table>
              <TableHeader className="bg-slate-900/60">
                <TableRow className="hover:bg-transparent border-slate-700/50">
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="text-slate-300 font-medium tracking-tight">Team Name</TableHead>
                  <TableHead className="text-slate-300 font-medium tracking-tight">Lobby Code</TableHead>
                  <TableHead className="text-slate-300 font-medium tracking-tight text-center">Members</TableHead>
                  <TableHead className="text-slate-300 font-medium tracking-tight">Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      {searchQuery
                        ? "No teams found matching your search"
                        : "No teams created yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeams.map((team) => (
                    <React.Fragment key={team.id}>
                      <TableRow
                        className={`cursor-pointer transition-all duration-200 border-slate-800/50 ${
                          expandedTeamId === team.id ? "bg-blue-500/5" : "hover:bg-slate-800/40"
                        }`}
                        onClick={() =>
                          setExpandedTeamId(expandedTeamId === team.id ? null : team.id)
                        }
                      >
                        <TableCell>
                          <motion.div
                            animate={{ rotate: expandedTeamId === team.id ? 90 : 0 }}
                            transition={{ duration: 0.2, ease: [0.05, 0.7, 0.35, 0.99] }}
                          >
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                          </motion.div>
                        </TableCell>
                        <TableCell className="font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
                          {team.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs border-blue-500/20 bg-blue-500/5 text-blue-300/80">
                            {team.lobby_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-medium text-slate-200">{team.hackathon_team_members.length}</span>
                            <div className="flex -space-x-2">
                              {team.hackathon_team_members.slice(0, 3).map((m, i) => (
                                <div key={i} className="h-5 w-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                                  {m.hackathon_participants.name[0]}
                                </div>
                              ))}
                              {team.hackathon_team_members.length > 3 && (
                                <div className="h-5 w-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[8px] text-slate-500">
                                  +{team.hackathon_team_members.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {format(new Date(team.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                      
                      <TableRow className="border-none hover:bg-transparent">
                        <TableCell colSpan={5} className="p-0 border-none">
                          <AnimatePresence initial={false}>
                            {expandedTeamId === team.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: [0.05, 0.7, 0.35, 0.99] }}
                                className="overflow-hidden bg-slate-900/10 backdrop-blur-sm"
                              >
                                <div className="px-12 py-6 border-b border-slate-800/50">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                      <Users className="h-4 w-4 text-blue-400" />
                                      Team Members
                                    </h4>
                                    <Badge variant="outline" className="text-[10px] border-slate-700 bg-slate-800/50 text-slate-400 px-2 py-0">
                                      {team.hackathon_team_members.length} Active
                                    </Badge>
                                  </div>
                                  
                                  <div className="rounded-xl border border-slate-700/50 bg-slate-950/40 shadow-inner overflow-hidden">
                                    <Table>
                                      <TableHeader className="bg-slate-900/80">
                                        <TableRow className="hover:bg-transparent border-slate-800/50">
                                          <TableHead className="text-[10px] text-slate-400 uppercase tracking-[0.1em] h-9">Name</TableHead>
                                          <TableHead className="text-[10px] text-slate-400 uppercase tracking-[0.1em] h-9">University</TableHead>
                                          <TableHead className="text-[10px] text-slate-400 uppercase tracking-[0.1em] h-9">When Joined (Team)</TableHead>
                                          <TableHead className="text-[10px] text-slate-400 uppercase tracking-[0.1em] h-9 text-right">When Reg (Hackathon)</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {team.hackathon_team_members.map((member) => (
                                          <TableRow key={member.participant_id} className="hover:bg-slate-800/30 border-slate-800/50 group/member">
                                            <TableCell className="text-sm py-3">
                                              <div className="flex flex-col">
                                                <span className="font-semibold text-slate-200 group-hover/member:text-blue-200 transition-colors">{member.hackathon_participants.name}</span>
                                                <span className="text-xs text-slate-500 font-mono">
                                                  {member.hackathon_participants.email}
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-sm py-3 text-slate-400 font-medium">
                                              {member.hackathon_participants.university}
                                            </TableCell>
                                            <TableCell className="text-xs py-3">
                                              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-blue-500/5 border border-blue-500/10 w-fit text-blue-300/70 group-hover/member:border-blue-500/30 transition-colors">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(member.joined_at), "MMM d, HH:mm")}
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-xs py-3 text-right">
                                              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-purple-500/5 border border-purple-500/10 w-fit text-purple-300/70 group-hover/member:border-purple-500/30 transition-colors ml-auto">
                                                <Calendar className="h-3 w-3" />
                                                {format(
                                                  new Date(member.hackathon_participants.created_at),
                                                  "MMM d, HH:mm"
                                                )}
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
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
