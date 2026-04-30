"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Users, Calendar, Layers, ChevronRight, Download, Trophy, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import type { HackathonTeam, Participant } from "@/types/admin-hackathon";
import { RankBadge, ScoreBadge } from "@/components/admin/shared/ScoreBadges";
import { ParticipantDetailModal } from "@/components/admin/teams/ParticipantDetailModal";
import { TeamMessageForm } from "@/components/admin/teams/TeamMessageForm";
import { MentorAssignmentRow } from "@/components/admin/teams/MentorAssignmentRow";
import { LeaderboardTab } from "@/components/admin/teams/LeaderboardTab";

export function AdminHackathonTeams() {
  const [activeTab, setActiveTab] = useState<"browser" | "leaderboard">("browser");
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "created" | "members">("score");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [runningMatching, setRunningMatching] = useState(false);
  const [matchingMessage, setMatchingMessage] = useState("");
  const [resettingQuotaTeamId, setResettingQuotaTeamId] = useState<string | null>(null);
  const [quotaResetMessage, setQuotaResetMessage] = useState<{ teamId: string; message: string } | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<{ participant: Participant; isOwner: boolean } | null>(null);

  useEffect(() => { fetchTeams(); }, []);

  async function fetchTeams() {
    try {
      const response = await fetch("/api/admin/hackathon/teams");
      const data = await response.json();
      if (response.ok && data.teams) setTeams(data.teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTeams = teams.filter((t) => {
    const query = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(query) || t.lobby_code.toLowerCase().includes(query) || t.hackathon_team_members.some((m) => m.hackathon_participants.name.toLowerCase().includes(query));
  }).sort((a, b) => {
    if (sortBy === "score") return b.total_score - a.total_score;
    if (sortBy === "members") return b.hackathon_team_members.length - a.hackathon_team_members.length;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const stats = {
    totalTeams: teams.length,
    totalMembers: teams.reduce((acc, t) => acc + t.hackathon_team_members.length, 0),
    avgSize: teams.length > 0 ? (teams.reduce((acc, t) => acc + t.hackathon_team_members.length, 0) / teams.length).toFixed(1) : 0,
    largestTeam: Math.max(0, ...teams.map((t) => t.hackathon_team_members.length)),
  };

  const downloadCSV = () => {
    const headers = ["Team Name", "Lobby Code", "Member Name", "Email", "University", "Member Joined At", "Participant Registered At"];
    const rows = teams.flatMap((team) =>
      team.hackathon_team_members.map((member) => [
        team.name, team.lobby_code, member.hackathon_participants.name, member.hackathon_participants.email,
        member.hackathon_participants.university, format(new Date(member.joined_at), "yyyy-MM-dd HH:mm:ss"),
        format(new Date(member.hackathon_participants.created_at), "yyyy-MM-dd HH:mm:ss"),
      ])
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map((e) => e.map((val) => `"${val}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `hackathon_teams_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetTeamQuota = async (teamId: string) => {
    setResettingQuotaTeamId(teamId);
    setQuotaResetMessage(null);
    try {
      const response = await fetch(`/api/admin/hackathon/teams/${teamId}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) { setQuotaResetMessage({ teamId, message: data.error || "Failed to reset quota" }); return; }
      setQuotaResetMessage({ teamId, message: data.reset === 0 ? "No bookings to reset" : `Reset ${data.reset} booking(s) — quota restored` });
    } catch {
      setQuotaResetMessage({ teamId, message: "Failed to reset quota" });
    } finally {
      setResettingQuotaTeamId(null);
    }
  };

  const runAutoMatching = async () => {
    setRunningMatching(true);
    setMatchingMessage("");
    try {
      const response = await fetch("/api/admin/hackathon/team-matching/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await response.json();
      if (!response.ok) { setMatchingMessage(data.error || "Failed to run automatic matching"); return; }
      setMatchingMessage(`Created ${data.result?.createdTeams?.length ?? 0} matched teams.`);
      await fetchTeams();
    } catch (error) {
      console.error("Error running auto matching:", error);
      setMatchingMessage("Failed to run automatic matching");
    } finally {
      setRunningMatching(false);
    }
  };

  if (loading) {
    return <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { title: "Total Teams", value: stats.totalTeams, icon: <Layers className="h-4 w-4 text-muted-foreground" /> },
          { title: "In Teams", value: stats.totalMembers, icon: <Users className="h-4 w-4 text-blue-500" />, desc: "Participants in teams" },
          { title: "Avg Team Size", value: stats.avgSize, icon: <Users className="h-4 w-4 text-green-500" /> },
          { title: "Largest Team", value: stats.largestTeam, icon: <Users className="h-4 w-4 text-purple-500" /> },
        ].map((s) => (
          <Card key={s.title} className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
              {s.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              {s.desc && <p className="text-xs text-muted-foreground">{s.desc}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-2 border-b border-slate-700/50 pb-0">
        <button onClick={() => setActiveTab("browser")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "browser" ? "border-blue-400 text-blue-300" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
          <Users className="h-4 w-4" /> Team Browser
        </button>
        <button onClick={() => setActiveTab("leaderboard")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "leaderboard" ? "border-yellow-400 text-yellow-300" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
          <Trophy className="h-4 w-4" /> Leaderboard
        </button>
      </div>

      {activeTab === "browser" && (
        <Card className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 shadow-xl overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent italic">Hackathon Team Browser</CardTitle>
                <CardDescription className="text-slate-400">Browse all teams and their respective members.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={runAutoMatching} disabled={runningMatching} className="border-slate-700 hover:bg-slate-800 transition-all font-medium">
                  {runningMatching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                  Run Auto Matching
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCSV} className="border-slate-700 hover:bg-slate-800 transition-all font-medium">
                  <Download className="mr-2 h-4 w-4" /> Download CSV
                </Button>
              </div>
            </div>
            {matchingMessage && (
              <div className="mt-3 rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-100">{matchingMessage}</div>
            )}
            <div className="flex gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by team name, lobby code, or member name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-slate-950/50 border-slate-700 focus:ring-blue-500/50" />
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "score" | "created" | "members")} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100">
                <option value="score">Sort by Score</option>
                <option value="members">Sort by Members</option>
                <option value="created">Sort by Created</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-slate-700/50 overflow-hidden bg-slate-950/20">
              <Table>
                <TableHeader className="bg-slate-900/60">
                  <TableRow className="hover:bg-transparent border-slate-700/50">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[56px] text-slate-300 font-medium tracking-tight">Rank</TableHead>
                    <TableHead className="text-slate-300 font-medium tracking-tight">Team Name</TableHead>
                    <TableHead className="text-slate-300 font-medium tracking-tight">Lobby Code</TableHead>
                    <TableHead className="text-slate-300 font-medium tracking-tight text-center">Members</TableHead>
                    <TableHead className="text-slate-300 font-medium tracking-tight text-right">Score</TableHead>
                    <TableHead className="text-slate-300 font-medium tracking-tight">Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        {searchQuery ? "No teams found matching your search" : "No teams created yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeams.map((team, index) => (
                      <React.Fragment key={team.id}>
                        <TableRow
                          className={`cursor-pointer transition-all duration-200 border-slate-800/50 ${expandedTeamId === team.id ? "bg-blue-500/5" : "hover:bg-slate-800/40"}`}
                          onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                        >
                          <TableCell>
                            <motion.div animate={{ rotate: expandedTeamId === team.id ? 90 : 0 }} transition={{ duration: 0.2, ease: [0.05, 0.7, 0.35, 0.99] }}>
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            </motion.div>
                          </TableCell>
                          <TableCell><RankBadge rank={index + 1} /></TableCell>
                          <TableCell className="font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">{team.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs border-blue-500/20 bg-blue-500/5 text-blue-300/80">{team.lobby_code}</Badge>
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
                          <TableCell className="text-right"><ScoreBadge score={team.total_score} rank={index + 1} /></TableCell>
                          <TableCell className="text-sm text-slate-500">{format(new Date(team.created_at), "MMM d, yyyy")}</TableCell>
                        </TableRow>

                        <TableRow className="border-none hover:bg-transparent">
                          <TableCell colSpan={7} className="p-0 border-none">
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
                                        <Users className="h-4 w-4 text-blue-400" /> Team Members
                                      </h4>
                                      <div className="flex items-center gap-2">
                                        {quotaResetMessage?.teamId === team.id && (
                                          <span className="text-[10px] text-slate-400">{quotaResetMessage.message}</span>
                                        )}
                                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); resetTeamQuota(team.id); }} disabled={resettingQuotaTeamId === team.id} className="border-slate-700 hover:bg-slate-800 text-xs h-7 px-2">
                                          {resettingQuotaTeamId === team.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                                          Reset Mentor Quota
                                        </Button>
                                        <Badge variant="outline" className="text-[10px] border-slate-700 bg-slate-800/50 text-slate-400 px-2 py-0">
                                          {team.hackathon_team_members.length} Active
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-700/50 bg-slate-950/40 shadow-inner overflow-hidden">
                                      <Table>
                                        <TableHeader className="bg-slate-900/80">
                                          <TableRow className="hover:bg-transparent border-slate-800/50">
                                            <TableHead className="text-[10px] text-slate-400 uppercase tracking-[0.1em] h-9">Name <span className="normal-case text-slate-600 font-normal">(click for details)</span></TableHead>
                                            <TableHead className="text-[10px] text-slate-400 uppercase tracking-[0.1em] h-9">University</TableHead>
                                            <TableHead className="text-[10px] text-slate-400 uppercase tracking-[0.1em] h-9">When Joined (Team)</TableHead>
                                            <TableHead className="text-[10px] text-slate-400 uppercase tracking-[0.1em] h-9 text-right">When Reg (Hackathon)</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {team.hackathon_team_members.map((member) => (
                                            <TableRow
                                              key={member.participant_id}
                                              className="hover:bg-slate-800/30 border-slate-800/50 group/member cursor-pointer"
                                              onClick={(e) => { e.stopPropagation(); setSelectedParticipant({ participant: member.hackathon_participants, isOwner: member.participant_id === team.owner_id }); }}
                                            >
                                              <TableCell className="text-sm py-3">
                                                <div className="flex flex-col">
                                                  <span className="font-semibold text-slate-200 group-hover/member:text-blue-200 transition-colors">
                                                    {member.hackathon_participants.name}
                                                    {member.participant_id === team.owner_id && (
                                                      <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 align-middle">Owner</span>
                                                    )}
                                                  </span>
                                                  <span className="text-xs text-slate-500 font-mono">{member.hackathon_participants.email}</span>
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-sm py-3 text-slate-400 font-medium">{member.hackathon_participants.university}</TableCell>
                                              <TableCell className="text-xs py-3">
                                                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-blue-500/5 border border-blue-500/10 w-fit text-blue-300/70 group-hover/member:border-blue-500/30 transition-colors">
                                                  <Calendar className="h-3 w-3" />
                                                  {format(new Date(member.joined_at), "MMM d, HH:mm")}
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-xs py-3 text-right">
                                                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-purple-500/5 border border-purple-500/10 w-fit text-purple-300/70 group-hover/member:border-purple-500/30 transition-colors ml-auto">
                                                  <Calendar className="h-3 w-3" />
                                                  {format(new Date(member.hackathon_participants.created_at), "MMM d, HH:mm")}
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>

                                    <TeamMessageForm teamId={team.id} teamName={team.name} memberCount={team.hackathon_team_members.length} />
                                    <MentorAssignmentRow teamId={team.id} teamName={team.name} />
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
      )}

      {selectedParticipant && (
        <ParticipantDetailModal participant={selectedParticipant.participant} isOwner={selectedParticipant.isOwner} onClose={() => setSelectedParticipant(null)} />
      )}

      {activeTab === "leaderboard" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" /> Hackathon Leaderboard
              </h2>
              <p className="text-sm text-slate-500">Teams ranked by total score. Click any row to expand.</p>
            </div>
          </div>
          <div className="rounded-md border border-slate-700/50 overflow-hidden">
            <LeaderboardTab />
          </div>
        </div>
      )}
    </div>
  );
}
