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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  Users,
  PieChart as PieChartIcon,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { getBetaFunnelStats } from "@/actions/beta-funnel";

interface BetaRegistration {
  id: string;
  created_at: string;
  user_id: string | null;
  full_name: string;
  nickname: string;
  email: string;
  phone: string;
  school: string;
  grade: string;
  platform: string;
  motivation: string;
  faculty_interest: string;
}

interface FunnelStats {
  total: number;
  completed: number;
  abandoned: number;
  completionRate: string;
  recentAbandoned: number;
}

type ChartDataType = "platform" | "grade" | "school";

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

export function AdminBetaRegistrations() {
  const [registrations, setRegistrations] = useState<BetaRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [chartDataType, setChartDataType] = useState<ChartDataType>("platform");
  const [funnelStats, setFunnelStats] = useState<FunnelStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRegistrations();
    fetchFunnelStats();
  }, []);

  async function fetchFunnelStats() {
    try {
      const stats = await getBetaFunnelStats();
      if (stats) {
        setFunnelStats(stats);
      }
    } catch (error) {
      console.error("Error fetching funnel stats:", error);
    }
  }

  async function fetchRegistrations() {
    try {
      const response = await fetch("/api/admin/beta-registrations");
      const data = await response.json();

      if (response.ok && data.registrations) {
        setRegistrations(data.registrations);
      } else {
        setError(
          `API error (${response.status}): ${data.error || "Unknown error"}`,
        );
        console.error("API error:", data);
      }
    } catch (error) {
      console.error("Error fetching registrations:", error);
      setError("Network error — could not reach the API.");
    } finally {
      setLoading(false);
    }
  }

  const filteredRegistrations = registrations.filter((r) => {
    const query = searchQuery.toLowerCase();
    return (
      r.full_name.toLowerCase().includes(query) ||
      r.nickname.toLowerCase().includes(query) ||
      r.email.toLowerCase().includes(query) ||
      r.phone.toLowerCase().includes(query) ||
      r.school.toLowerCase().includes(query) ||
      r.grade.toLowerCase().includes(query) ||
      r.platform.toLowerCase().includes(query)
    );
  });

  // Generate chart data based on selected type
  function getChartData() {
    const dataMap = new Map<string, number>();

    registrations.forEach((r) => {
      let key = "";
      switch (chartDataType) {
        case "platform":
          key = r.platform || "Unknown";
          break;
        case "grade":
          key = r.grade || "Unknown";
          break;
        case "school":
          key = r.school || "Unknown";
          break;
      }

      dataMap.set(key, (dataMap.get(key) || 0) + 1);
    });

    return Array.from(dataMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Show top 10 for schools
  }

  const chartData = getChartData();
  const stats = {
    total: registrations.length,
    ios: registrations.filter((r) => r.platform.toLowerCase().includes("ios"))
      .length,
    android: registrations.filter((r) =>
      r.platform.toLowerCase().includes("android"),
    ).length,
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

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-sm font-semibold text-destructive">
            Failed to load registrations
          </p>
          <p className="text-xs text-muted-foreground">{error}</p>
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
              Total Registrations
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">iOS Users</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">📱</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ios}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0
                ? ((stats.ios / stats.total) * 100).toFixed(1)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Android Users</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">🤖</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.android}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0
                ? ((stats.android / stats.total) * 100).toFixed(1)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Analytics */}
      {funnelStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Registration Funnel</CardTitle>
            </div>
            <CardDescription>
              Track users who completed form vs uploaded evidence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Reached Invite Step
                </p>
                <p className="text-2xl font-bold">{funnelStats.total}</p>
                <p className="text-xs text-muted-foreground">Completed form</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {funnelStats.completed}
                </p>
                <p className="text-xs text-muted-foreground">
                  Uploaded evidence
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Abandoned</p>
                <p className="text-2xl font-bold text-red-600">
                  {funnelStats.abandoned}
                </p>
                <p className="text-xs text-muted-foreground">
                  {funnelStats.recentAbandoned} recently (&gt;1h)
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">
                  {funnelStats.completionRate}%
                </p>
                <p className="text-xs text-muted-foreground">Form → Upload</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              <CardTitle>Registration Analytics</CardTitle>
            </div>
            <Select
              value={chartDataType}
              onValueChange={(value: ChartDataType) => setChartDataType(value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform">Platform</SelectItem>
                <SelectItem value="grade">Grade</SelectItem>
                <SelectItem value="school">School (Top 10)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CardDescription>
            Distribution of registrations by selected category
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

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Beta Registrations</CardTitle>
            <CardDescription>
              View all registered beta testers for Passion Seed App
            </CardDescription>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, school, grade, or platform..."
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
                  <TableHead>Full Name</TableHead>
                  <TableHead>Nickname</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Faculty Interest</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground"
                    >
                      {searchQuery
                        ? "No registrations found matching your search"
                        : "No registrations yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRegistrations.map((registration) => (
                    <TableRow key={registration.id}>
                      <TableCell className="font-medium">
                        {registration.full_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {registration.nickname}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {registration.email}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {registration.phone}
                      </TableCell>
                      <TableCell className="text-sm">
                        {registration.school}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{registration.grade}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {registration.faculty_interest || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            registration.platform.toLowerCase().includes("ios")
                              ? "bg-blue-500/10 text-blue-500"
                              : registration.platform
                                    .toLowerCase()
                                    .includes("android")
                                ? "bg-green-500/10 text-green-500"
                                : "bg-purple-500/10 text-purple-500"
                          }
                        >
                          {registration.platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(
                          new Date(registration.created_at),
                          "MMM d, yyyy HH:mm",
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Motivation Details */}
          {filteredRegistrations.length > 0 && (
            <div className="mt-4 space-y-4">
              <h3 className="text-sm font-semibold">Recent Motivations</h3>
              <div className="space-y-3">
                {filteredRegistrations.slice(0, 5).map((registration) => (
                  <Card key={registration.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm">
                            {registration.full_name} ({registration.nickname})
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {registration.school} - {registration.grade}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {format(
                            new Date(registration.created_at),
                            "MMM d, yyyy",
                          )}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {registration.motivation}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
