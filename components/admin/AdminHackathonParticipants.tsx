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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, Users, UserCheck, UserX, Trash2, PieChart as PieChartIcon, UsersRound, Mail, GraduationCap, Link2, Plus, Copy, Check, X } from "lucide-react";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface Team {
  id: string;
  name: string;
  join_code: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  university: string;
  grade_level: string;
  track: string;
  joined_at: string;
}

interface TeamDetail {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
  members: TeamMember[];
}

interface RegisterLink {
  id: string;
  token: string;
  note: string | null;
  used: boolean;
  created_at: string;
  expires_at: string | null;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  phone: string;
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

type ChartDataType = "referral" | "track" | "grade" | "team_status" | "experience";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF6B9D",
  "#8DD1E1",
  "#D084D0",
];

export function AdminHackathonParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [chartDataType, setChartDataType] = useState<ChartDataType>("referral");
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Register links state
  const [registerLinks, setRegisterLinks] = useState<RegisterLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksExpanded, setLinksExpanded] = useState(false);
  const [newLinkNote, setNewLinkNote] = useState("");
  const [creatingLink, setCreatingLink] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  async function fetchRegisterLinks() {
    setLinksLoading(true);
    try {
      const res = await fetch("/api/admin/hackathon/register-links");
      const data = await res.json();
      if (res.ok) setRegisterLinks(data.links);
    } catch (err) {
      console.error("Failed to fetch register links:", err);
    } finally {
      setLinksLoading(false);
    }
  }

  async function createRegisterLink() {
    setCreatingLink(true);
    try {
      const res = await fetch("/api/admin/hackathon/register-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newLinkNote.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegisterLinks((prev) => [data.link, ...prev]);
        setNewLinkNote("");
      }
    } catch (err) {
      console.error("Failed to create register link:", err);
    } finally {
      setCreatingLink(false);
    }
  }

  async function deleteRegisterLink(id: string) {
    try {
      await fetch("/api/admin/hackathon/register-links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setRegisterLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error("Failed to delete register link:", err);
    }
  }

  function getLinkUrl(token: string) {
    return `${window.location.origin}/hackathon/register/link/${token}`;
  }

  async function copyLink(token: string, id: string) {
    await navigator.clipboard.writeText(getLinkUrl(token));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleToggleLinks() {
    if (!linksExpanded && registerLinks.length === 0) {
      fetchRegisterLinks();
    }
    setLinksExpanded((v) => !v);
  }

  async function openTeamDialog(teamId: string) {
    setTeamDialogOpen(true);
    setSelectedTeam(null);
    setLoadingTeam(true);
    try {
      const response = await fetch(`/api/admin/hackathon/teams/${teamId}`);
      const data = await response.json();
      if (response.ok && data.team) {
        setSelectedTeam(data.team);
      }
    } catch (error) {
      console.error("Error fetching team details:", error);
    } finally {
      setLoadingTeam(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedIds.size} participant(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/admin/hackathon/participants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: Array.from(selectedIds) }),
      });

      if (response.ok) {
        // Remove deleted participants from state
        setParticipants((prev) =>
          prev.filter((p) => !selectedIds.has(p.id))
        );
        setSelectedIds(new Set());
      } else {
        alert("Failed to delete participants");
      }
    } catch (error) {
      console.error("Error deleting participants:", error);
      alert("An error occurred while deleting participants");
    } finally {
      setDeleting(false);
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredParticipants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredParticipants.map((p) => p.id)));
    }
  }

  const filteredParticipants = participants.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.email.toLowerCase().includes(query) ||
      p.university.toLowerCase().includes(query) ||
      p.referral_source?.toLowerCase().includes(query) ||
      p.team?.name.toLowerCase().includes(query) ||
      ""
    );
  });

  const stats = {
    total: participants.length,
    withTeam: participants.filter((p) => p.team && !p.is_in_waitlist).length,
    withoutTeam: participants.filter((p) => !p.team).length,
    teamCount: new Set(
      participants
        .filter((p) => p.team && !p.is_in_waitlist)
        .map((p) => p.team!.id)
    ).size,
    uniTeams: new Set(
      participants
        .filter((p) => p.team && !p.is_in_waitlist && !p.track.includes("มัธยม"))
        .map((p) => p.team!.id)
    ).size,
    highschoolTeams: new Set(
      participants
        .filter((p) => p.team && !p.is_in_waitlist && p.track.includes("มัธยม"))
        .map((p) => p.team!.id)
    ).size,
  };

  // Generate chart data based on selected type
  function getChartData() {
    const dataMap = new Map<string, number>();

    participants.forEach((p) => {
      let key = "";
      switch (chartDataType) {
        case "referral":
          key = p.referral_source || "Unknown";
          break;
        case "track":
          key = p.track || "Unknown";
          break;
        case "grade":
          key = p.grade_level || "Unknown";
          break;
        case "team_status":
          key = p.team
            ? p.is_in_waitlist
              ? "Finding Team"
              : "Has Team"
            : "No Team";
          break;
        case "experience":
          const level = p.experience_level || 1;
          if (level === 1) key = "Total Beginner (1)";
          else if (level <= 3) key = "Less Experience (2-3)";
          else if (level <= 6) key = "Intermediate (4-6)";
          else key = "Advanced (7-10)";
          break;
      }

      dataMap.set(key, (dataMap.get(key) || 0) + 1);
    });

    return Array.from(dataMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  const chartData = getChartData();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const allSelected = selectedIds.size === filteredParticipants.length && filteredParticipants.length > 0;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredParticipants.length;
  const selectAllChecked = allSelected ? true : someSelected ? "indeterminate" : false;

  return (
    <div className="space-y-4">
      {/* One-Time Register Links */}
      <Card>
        <CardHeader className="pb-3">
          <button
            onClick={handleToggleLinks}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-base">One-Time Registration Links</CardTitle>
              <Badge variant="secondary" className="text-xs">Bypass closed registration</Badge>
            </div>
            <span className="text-sm text-muted-foreground">{linksExpanded ? "▲" : "▼"}</span>
          </button>
        </CardHeader>

        {linksExpanded && (
          <CardContent className="space-y-4">
            {/* Create new link */}
            <div className="flex gap-2">
              <Input
                placeholder="Label / note (optional)"
                value={newLinkNote}
                onChange={(e) => setNewLinkNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createRegisterLink(); }}
                className="flex-1"
              />
              <Button onClick={createRegisterLink} disabled={creatingLink} size="sm">
                {creatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Generate</>}
              </Button>
            </div>

            {/* Links list */}
            {linksLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : registerLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No links generated yet.</p>
            ) : (
              <div className="space-y-2">
                {registerLinks.map((link) => (
                  <div
                    key={link.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${link.used ? "opacity-50" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {link.note && (
                          <span className="text-sm font-medium truncate">{link.note}</span>
                        )}
                        {link.used ? (
                          <Badge variant="outline" className="text-xs text-orange-500 border-orange-500/30 shrink-0">Used</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-500 border-green-500/30 shrink-0">Active</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                        /hackathon/register/link/{link.token.slice(0, 16)}…
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {format(new Date(link.created_at), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!link.used && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyLink(link.token, link.id)}
                          title="Copy link"
                        >
                          {copiedId === link.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRegisterLink(link.id)}
                        title="Delete link"
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <UsersRound className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamCount}</div>
            <p className="text-xs text-muted-foreground">
              Avg {stats.teamCount > 0 ? (stats.withTeam / stats.teamCount).toFixed(1) : 0} per team
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uni Teams</CardTitle>
            <UsersRound className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniTeams}</div>
            <p className="text-xs text-muted-foreground">
              {stats.teamCount > 0 ? ((stats.uniTeams / stats.teamCount) * 100).toFixed(1) : 0}% of teams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highschool Teams</CardTitle>
            <UsersRound className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highschoolTeams}</div>
            <p className="text-xs text-muted-foreground">
              {stats.teamCount > 0 ? ((stats.highschoolTeams / stats.teamCount) * 100).toFixed(1) : 0}% of teams
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              <CardTitle>Participant Analytics</CardTitle>
            </div>
            <Select
              value={chartDataType}
              onValueChange={(value: ChartDataType) => setChartDataType(value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="referral">Referral Source</SelectItem>
                <SelectItem value="track">Education Level</SelectItem>
                <SelectItem value="grade">Grade Level</SelectItem>
                <SelectItem value="team_status">Team Status</SelectItem>
                <SelectItem value="experience">Experience Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CardDescription>
            Distribution of participants by selected category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Participants Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Hackathon Participants</CardTitle>
              <CardDescription>
                View and manage all registered hackathon participants
              </CardDescription>
            </div>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete ({selectedIds.size})
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, university, referral source, or team..."
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
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectAllChecked}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>University</TableHead>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Referral Source</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
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
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(participant.id)}
                          onCheckedChange={() => toggleSelection(participant.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {participant.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {participant.email}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {participant.phone}
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
                            participant.track.includes("มัธยม")
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-purple-500/10 text-purple-500"
                          }
                        >
                          {participant.track}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-500/10 text-green-500">
                          {participant.referral_source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {participant.team ? (
                          participant.is_in_waitlist ? (
                            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                              Finding Team
                            </Badge>
                          ) : (
                            <button
                              onClick={() => openTeamDialog(participant.team!.id)}
                              className="flex flex-col gap-1 text-left hover:opacity-70 transition-opacity cursor-pointer"
                            >
                              <span className="font-medium text-sm underline decoration-dotted">
                                {participant.team.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Code: {participant.team.join_code}
                              </span>
                            </button>
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

      {/* Team Detail Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5" />
              {selectedTeam ? selectedTeam.name : "Team Details"}
            </DialogTitle>
          </DialogHeader>

          {loadingTeam ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedTeam ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">Code: {selectedTeam.join_code}</Badge>
                <span>{selectedTeam.members.length} member{selectedTeam.members.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="space-y-2">
                {selectedTeam.members.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-lg border p-3 space-y-1"
                  >
                    <div className="font-medium">{member.name}</div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {member.email}
                    </div>
                    {member.university && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {member.university}
                        {member.grade_level ? ` · ${member.grade_level}` : ""}
                      </div>
                    )}
                    {member.track && (
                      <Badge variant="secondary" className="text-xs">
                        {member.track}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Failed to load team details.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
