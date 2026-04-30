"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight, Users } from "lucide-react";
import { RankBadge, ScoreBadge } from "@/components/admin/shared/ScoreBadges";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import type { LeaderboardTeam, TeamSubmissionDetail, IndividualSubmissionDetail } from "@/types/admin-hackathon";

function computeBreakdown(team: LeaderboardTeam) {
  const teamPassed = team.team_submissions.filter(s => s.status === "passed").length;
  const teamTotal = team.team_submissions.length;
  const indivPassed = team.individual_submissions.filter(s => s.status === "passed").length;
  const indivTotal = team.individual_submissions.length;

  // Group by activity to show per-activity status
  const byActivity = new Map<string, { title: string; scope: "team" | "individual"; status: string }>();
  for (const s of team.team_submissions) {
    byActivity.set(s.activity_id, { title: s.activity_title ?? s.activity_id, scope: "team", status: s.status });
  }
  for (const s of team.individual_submissions) {
    const existing = byActivity.get(s.activity_id);
    if (!existing) {
      byActivity.set(s.activity_id, { title: s.activity_title ?? s.activity_id, scope: "individual", status: s.status });
    }
  }

  return { teamPassed, teamTotal, indivPassed, indivTotal, activities: [...byActivity.values()] };
}

function SubmissionCompact({ sub }: { sub: TeamSubmissionDetail | IndividualSubmissionDetail }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 px-2 rounded hover:bg-slate-800/30 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-slate-300 truncate">{sub.activity_title ?? sub.activity_id}</span>
        {"participant_name" in sub && sub.participant_name && (
          <span className="text-[10px] text-slate-600 shrink-0">{sub.participant_name}</span>
        )}
        {"submitted_by_name" in sub && sub.submitted_by_name && (
          <span className="text-[10px] text-slate-600 shrink-0">{sub.submitted_by_name}</span>
        )}
      </div>
      <StatusBadge status={sub.status} />
    </div>
  );
}

export function LeaderboardTab() {
  const [teams, setTeams] = useState<LeaderboardTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/hackathon/teams/submissions")
      .then(r => r.json())
      .then(data => { if (data.teams) setTeams(data.teams); })
      .catch(err => console.error("Error fetching leaderboard:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (teams.length === 0) {
    return <div className="text-center text-slate-500 py-16">No teams found.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-slate-700/50">
          <TableHead className="w-[32px]"></TableHead>
          <TableHead className="w-[48px] text-slate-400 text-xs">#</TableHead>
          <TableHead className="text-slate-400 text-xs">Team</TableHead>
          <TableHead className="text-slate-400 text-xs text-center">Members</TableHead>
          <TableHead className="text-slate-400 text-xs text-center">Team Subs</TableHead>
          <TableHead className="text-slate-400 text-xs text-center">Individual</TableHead>
          <TableHead className="text-slate-400 text-xs text-right pr-4">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {teams.map((team, index) => {
          const rank = index + 1;
          const isExpanded = expandedTeamId === team.id;
          const bd = computeBreakdown(team);

          return (
            <React.Fragment key={team.id}>
              <TableRow
                className={`cursor-pointer transition-colors border-slate-800/40 ${isExpanded ? "bg-slate-800/20" : "hover:bg-slate-800/20"}`}
                onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
              >
                <TableCell className="py-2.5">
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                  </motion.div>
                </TableCell>
                <TableCell className="py-2.5"><RankBadge rank={rank} /></TableCell>
                <TableCell className="py-2.5">
                  <span className="font-medium text-slate-200">{team.name}</span>
                  <span className="ml-2 text-[10px] font-mono text-slate-600">{team.lobby_code}</span>
                </TableCell>
                <TableCell className="py-2.5 text-center">
                  <span className="text-sm text-slate-300">{team.member_count}</span>
                </TableCell>
                <TableCell className="py-2.5 text-center">
                  <span className="text-xs text-emerald-400">{bd.teamPassed}</span>
                  <span className="text-xs text-slate-600">/{bd.teamTotal}</span>
                </TableCell>
                <TableCell className="py-2.5 text-center">
                  <span className="text-xs text-emerald-400">{bd.indivPassed}</span>
                  <span className="text-xs text-slate-600">/{bd.indivTotal}</span>
                </TableCell>
                <TableCell className="py-2.5 text-right pr-4">
                  <ScoreBadge score={team.total_score} rank={rank} />
                </TableCell>
              </TableRow>

              <TableRow className="border-none hover:bg-transparent">
                <TableCell colSpan={7} className="p-0 border-none">
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.05, 0.7, 0.35, 0.99] }}
                        className="overflow-hidden"
                      >
                        <div className="px-8 py-4 border-b border-slate-800/40 space-y-4">
                          {/* Score breakdown bar */}
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-slate-500">Score breakdown:</span>
                            <span className="text-slate-300">{team.total_score} pts total</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-300">{team.score_per_member} pts/member</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-emerald-400">{bd.teamPassed + bd.indivPassed} passed</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-400">{bd.teamTotal + bd.indivTotal - bd.teamPassed - bd.indivPassed} pending/other</span>
                          </div>

                          {/* Members inline */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Users className="h-3.5 w-3.5 text-slate-500" />
                            {team.members.map(m => (
                              <span key={m.email} className="text-xs text-slate-400">
                                {m.name} <span className="text-slate-600">({m.university})</span>
                              </span>
                            ))}
                          </div>

                          {/* Submissions — flat list, no nested boxes */}
                          {team.team_submissions.length > 0 && (
                            <div>
                              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                                Team submissions · {bd.teamPassed}/{bd.teamTotal} passed
                              </div>
                              <div className="divide-y divide-slate-800/40">
                                {team.team_submissions.map(sub => (
                                  <SubmissionCompact key={sub.id} sub={sub} />
                                ))}
                              </div>
                            </div>
                          )}

                          {team.individual_submissions.length > 0 && (
                            <div>
                              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                                Individual submissions · {bd.indivPassed}/{bd.indivTotal} passed
                              </div>
                              <div className="divide-y divide-slate-800/40">
                                {team.individual_submissions.map(sub => (
                                  <SubmissionCompact key={sub.id} sub={sub} />
                                ))}
                              </div>
                            </div>
                          )}

                          {team.team_submissions.length === 0 && team.individual_submissions.length === 0 && (
                            <p className="text-xs text-slate-600">No submissions yet.</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </TableCell>
              </TableRow>
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
