"use client";

import { Fragment, useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Users, CheckCircle, Clock, Bookmark, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Participant {
  id: string;
  name: string;
  email: string;
  university: string;
  created_at: string;
  loves: string[] | null;
  good_at: string[] | null;
  school_level: string | null;
  problem_preferences: string[] | null;
  confidence_level: number | null;
  family_support_level: number | null;
  team_role_preference: string | null;
  ai_proficiency: string | null;
  dream_faculty: string | null;
  why_hackathon: string | null;
  has_questionnaire: boolean;
}

interface Stats {
  total_participants: number;
  completed_questionnaire: number;
  completion_rate: number;
  avg_problems_saved: number;
  problem_counts: Record<string, number>;
  school_level_breakdown: { university: number; high_school: number };
  role_distribution: Record<string, number>;
  top_loves: Array<{ item: string; count: number }>;
  top_good_at: Array<{ item: string; count: number }>;
}

interface QuestionnaireData {
  participants: Participant[];
  stats: Stats;
}

// Track colors from problem JSON
const TRACK_COLORS: Record<string, string> = {
  "Track 01": "#91C4E3",
  "Track 02": "#A594BA",
  "Track 03": "#91C4E3",
};

const PROBLEM_TRACK_MAP: Record<string, string> = {
  "P1": "Track 01",
  "P2": "Track 01",
  "P3": "Track 01",
  "P4": "Track 02",
  "P5": "Track 02",
  "P6": "Track 02",
  "P7": "Track 03",
  "P8": "Track 03",
  "P9": "Track 03",
};

export function AdminHackathonQuestionnaire() {
  const [data, setData] = useState<QuestionnaireData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [aiFilter, setAiFilter] = useState("all");
  const [problemFilter, setProblemFilter] = useState("all");

  useEffect(() => {
    fetchQuestionnaires();
  }, []);

  async function fetchQuestionnaires() {
    try {
      const response = await fetch("/api/admin/hackathon/questionnaires");
      const result = await response.json();

      if (response.ok && result.participants) {
        setData({ participants: result.participants, stats: result.stats });
      }
    } catch (error) {
      console.error("Error fetching questionnaires:", error);
    } finally {
      setLoading(false);
    }
  }

  const completedParticipants = data?.participants.filter((p) => p.has_questionnaire) || [];

  const filteredParticipants = completedParticipants.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      p.name.toLowerCase().includes(query) ||
      p.email?.toLowerCase().includes(query) ||
      p.university?.toLowerCase().includes(query)
    );
    const matchesSchool = schoolFilter === "all" || p.school_level === schoolFilter;
    const matchesRole = roleFilter === "all" || p.team_role_preference === roleFilter;
    const matchesAi = aiFilter === "all" || p.ai_proficiency === aiFilter;
    const matchesProblem =
      problemFilter === "all" || p.problem_preferences?.includes(problemFilter);
    return matchesSearch && matchesSchool && matchesRole && matchesAi && matchesProblem;
  });

  const stats = {
    totalParticipants: data?.stats.total_participants || 0,
    completedCount: data?.stats.completed_questionnaire || 0,
    completionRate: data?.stats.completion_rate || 0,
    avgProblemsSaved: data?.stats.avg_problems_saved || 0,
  };
  const filteredStats = {
    responses: filteredParticipants.length,
    avgConfidence:
      filteredParticipants.length > 0
        ? (
            filteredParticipants.reduce(
              (sum, p) => sum + (p.confidence_level ?? 0),
              0
            ) / filteredParticipants.length
          ).toFixed(1)
        : "0.0",
    avgFamilySupport:
      filteredParticipants.length > 0
        ? (
            filteredParticipants.reduce(
              (sum, p) => sum + (p.family_support_level ?? 0),
              0
            ) / filteredParticipants.length
          ).toFixed(1)
        : "0.0",
  };
  const uniqueRoles = Array.from(
    new Set(
      completedParticipants
        .map((p) => p.team_role_preference)
        .filter((role): role is string => Boolean(role))
    )
  ).sort();
  const uniqueAiLevels = Array.from(
    new Set(
      completedParticipants
        .map((p) => p.ai_proficiency)
        .filter((level): level is string => Boolean(level))
    )
  ).sort();
  const uniqueProblems = Array.from(
    new Set(
      completedParticipants
        .flatMap((p) => p.problem_preferences || [])
        .filter((problem): problem is string => Boolean(problem))
    )
  ).sort();

  // Build chart data from problem_counts
  const chartData = Object.entries(data?.stats.problem_counts || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([problemId, count]) => ({
      name: problemId,
      value: count,
      fill: TRACK_COLORS[PROBLEM_TRACK_MAP[problemId]] || "#91C4E3",
    }));

  function toggleExpand(id: string) {
    setExpandedRow(expandedRow === id ? null : id);
  }

  function getSchoolLevelLabel(level: string | null) {
    if (!level) return "N/A";
    return level === "university" ? "University" : "High School";
  }

  function getRoleLabel(role: string | null) {
    if (!role) return "N/A";
    const roleMap: Record<string, string> = {
      "builder": "Builder",
      "designer": "Designer",
      "researcher": "Researcher",
      "domain_expert": "Domain Expert",
      "storyteller": "Storyteller",
      "generalist": "Generalist",
    };
    return roleMap[role] || role;
  }

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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Participants
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Questionnaire Completed
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Problems Saved
            </CardTitle>
            <Bookmark className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgProblemsSaved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Problem Popularity Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle>Problem Popularity</CardTitle>
          </div>
          <CardDescription>
            Number of participants who saved each problem (P1-P9) by track
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={40}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value} bookmarks`, "Count"]}
                    labelFormatter={(label) => `Problem ${label}`}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRACK_COLORS["Track 01"] }} />
                  <span className="text-xs text-muted-foreground">Track 01 - Healthcare</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRACK_COLORS["Track 02"] }} />
                  <span className="text-xs text-muted-foreground">Track 02 - Mental Health</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRACK_COLORS["Track 03"] }} />
                  <span className="text-xs text-muted-foreground">Track 03 - Community</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No problem preferences data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Loves & Good At */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top "Loves"</CardTitle>
            <CardDescription>Most common things participants love</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.stats.top_loves.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">{item.item}</span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
              {(!data?.stats.top_loves || data.stats.top_loves.length === 0) && (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top "Good At"</CardTitle>
            <CardDescription>Most common skills participants have</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.stats.top_good_at.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">{item.item}</span>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">{item.count}</Badge>
                </div>
              ))}
              {(!data?.stats.top_good_at || data.stats.top_good_at.length === 0) && (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Responses Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Questionnaire Responses</CardTitle>
            <CardDescription>
              View all submitted hackathon pre-questionnaires
            </CardDescription>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or university..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="grid gap-2 mt-3 md:grid-cols-4">
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter school level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All school levels</SelectItem>
                <SelectItem value="university">University</SelectItem>
                <SelectItem value="high_school">High School</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {uniqueRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {getRoleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={aiFilter} onValueChange={setAiFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter AI proficiency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All AI levels</SelectItem>
                {uniqueAiLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={problemFilter} onValueChange={setProblemFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter problem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All problems</SelectItem>
                {uniqueProblems.map((problem) => (
                  <SelectItem key={problem} value={problem}>
                    {problem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 mt-3 md:grid-cols-3">
            <Badge variant="outline" className="justify-center py-1.5">
              Filtered responses: {filteredStats.responses}
            </Badge>
            <Badge variant="outline" className="justify-center py-1.5">
              Avg confidence: {filteredStats.avgConfidence}/5
            </Badge>
            <Badge variant="outline" className="justify-center py-1.5">
              Avg family support: {filteredStats.avgFamilySupport}/5
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>School Level</TableHead>
                  <TableHead>Loves</TableHead>
                  <TableHead>Good At</TableHead>
                  <TableHead>Problems</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>AI Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground py-8"
                    >
                      {searchQuery
                        ? "No responses found matching your search"
                        : "No questionnaire responses yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParticipants.map((p) => (
                    <Fragment key={p.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(p.id)}
                      >
                        <TableCell className="font-medium">
                          <div>
                            {p.name}
                            <div className="text-xs text-muted-foreground">
                              {p.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getSchoolLevelLabel(p.school_level)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {p.loves?.slice(0, 2).map((item, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs"
                              >
                                {item}
                              </Badge>
                            ))}
                            {p.loves && p.loves.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{p.loves.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {p.good_at?.slice(0, 2).map((item, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs bg-green-500/10 text-green-600"
                              >
                                {item}
                              </Badge>
                            ))}
                            {p.good_at && p.good_at.length > 2 && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-green-500/10 text-green-600"
                              >
                                +{p.good_at.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-purple-500/10 text-purple-600"
                          >
                            {p.problem_preferences?.length || 0} saved
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getRoleLabel(p.team_role_preference)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {p.ai_proficiency || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className="bg-green-500/10 text-green-600 hover:bg-green-500/20"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Done
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {expandedRow === p.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRow === p.id && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={9} className="p-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="space-y-3">
                                <div>
                                  <span className="font-semibold text-muted-foreground">
                                    University:
                                  </span>
                                  <p className="mt-0.5">{p.university || "N/A"}</p>
                                </div>
                                <div>
                                  <span className="font-semibold text-muted-foreground">
                                    Dream Faculty:
                                  </span>
                                  <p className="mt-0.5">{p.dream_faculty || "N/A"}</p>
                                </div>
                                <div>
                                  <span className="font-semibold text-muted-foreground">
                                    Confidence Level:
                                  </span>
                                  <p className="mt-0.5">{p.confidence_level || "N/A"}/5</p>
                                </div>
                                <div>
                                  <span className="font-semibold text-muted-foreground">
                                    Family Support:
                                  </span>
                                  <p className="mt-0.5">{p.family_support_level || "N/A"}/5</p>
                                </div>
                                <div>
                                  <span className="font-semibold text-muted-foreground">
                                    AI Proficiency:
                                  </span>
                                  <p className="mt-0.5">{p.ai_proficiency || "N/A"}</p>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <span className="font-semibold text-muted-foreground">
                                    Why Hackathon:
                                  </span>
                                  <p className="mt-0.5 whitespace-pre-wrap">{p.why_hackathon || "N/A"}</p>
                                </div>
                                <div>
                                  <span className="font-semibold text-muted-foreground">
                                    All Loves:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {p.loves?.map((item, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {item}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <span className="font-semibold text-muted-foreground">
                                    All Good At:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {p.good_at?.map((item, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="text-xs bg-green-500/10 text-green-600"
                                      >
                                        {item}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <span className="font-semibold text-muted-foreground">
                                    Saved Problems:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {p.problem_preferences?.map((problem, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="outline"
                                        className="text-xs bg-purple-500/10 text-purple-600"
                                      >
                                        {problem}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
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