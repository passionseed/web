"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Activity,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import type {
  UserEvent,
  UserPlannerStatusRow,
  UserPlannerStatus,
  EventType,
} from "@/types/events";
import { calculateProgress, STEP_EVENTS, EVENT_TYPES } from "@/types/events";

const USERS_PER_PAGE = 50;
const EVENTS_PER_PAGE = 100;

const STATUS_COLORS: Record<UserPlannerStatus, string> = {
  not_started: "bg-gray-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  churned: "bg-red-500",
};

const STATUS_LABELS: Record<UserPlannerStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  churned: "Churned",
};

const EVENT_LABELS: Record<string, string> = {
  portfolio_uploaded: "Portfolio Uploaded",
  interest_quiz_started: "Quiz Started",
  interest_quiz_completed: "Quiz Completed",
  interest_quiz_abandoned: "Quiz Abandoned",
  tcas_program_viewed: "Program Viewed",
  tcas_program_saved: "Program Saved",
  plan_created: "Plan Created",
  career_searched: "Career Searched",
  mobile_app_opened: "App Opened",
};

function EventDetailViewer({
  type,
  data,
}: {
  type: string;
  data: any;
}) {
  switch (type) {
    case "career_searched":
      return (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">"{data.query}"</span>
          <span className="text-xs text-muted-foreground">{data.results_count} results found</span>
        </div>
      );
    case "mobile_app_opened":
      return (
        <div className="flex flex-col gap-1">
          <span className="text-sm">{data.device_model}</span>
          <span className="text-xs text-muted-foreground">{data.os_version} (App v{data.app_version})</span>
        </div>
      );
    case "portfolio_uploaded":
      return (
        <div className="flex flex-col gap-1">
          <span className="text-sm">{data.file_count} files</span>
          <span className="text-xs text-muted-foreground">{data.file_types?.join(", ")}</span>
        </div>
      );
    case "interest_quiz_completed":
      return (
        <div className="flex flex-wrap gap-1">
          {data.top_interests?.map((interest: string) => (
            <Badge key={interest} variant="secondary" className="text-[10px] py-0">
              {interest}
            </Badge>
          ))}
        </div>
      );
    case "tcas_program_viewed":
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs">ID: {data.program_id}</span>
          <span className="text-xs text-muted-foreground">Source: {data.source}</span>
        </div>
      );
    default:
      return (
        <pre className="text-xs text-muted-foreground max-w-xs truncate overflow-hidden">
          {JSON.stringify(data)}
        </pre>
      );
  }
}

export function AdminEventTracker() {
  const [users, setUsers] = useState<UserPlannerStatusRow[]>([]);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    completed: 0,
    avgSessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [dateFilter, setDateFilter] = useState("7");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserPlannerStatusRow | null>(null);
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [groupBySession, setGroupBySession] = useState(false);

  const fetchStats = useCallback(async () => {
    const supabase = createClient();

    // Get total users with events
    const { data: statusData } = await supabase
      .from("user_planner_status")
      .select("*");

    if (!statusData) return;

    const totalUsers = statusData.length;
    const completed = statusData.filter((u) => u.status === "completed").length;
    const activeToday = statusData.filter((u) => {
      if (!u.last_event_at) return false;
      const lastEvent = new Date(u.last_event_at);
      const today = new Date();
      return lastEvent.toDateString() === today.toDateString();
    }).length;

    // Calculate average sessions (unique session_ids per user)
    const { data: sessionData } = await supabase
      .from("user_events")
      .select("user_id, session_id");

    const userSessions = new Map<string, Set<string>>();
    sessionData?.forEach((e) => {
      if (!userSessions.has(e.user_id)) {
        userSessions.set(e.user_id, new Set());
      }
      if (e.session_id) {
        userSessions.get(e.user_id)!.add(e.session_id);
      }
    });

    const avgSessions =
      userSessions.size > 0
        ? Array.from(userSessions.values()).reduce((sum, s) => sum + s.size, 0) /
          userSessions.size
        : 0;

    setStats({
      totalUsers,
      activeToday,
      completed,
      avgSessions: Math.round(avgSessions * 10) / 10,
    });
  }, []);

  const fetchUsers = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_planner_status")
      .select("*")
      .order("last_event_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Error fetching users:", error);
      return;
    }

    setUsers(data || []);
  }, []);

  const fetchEvents = useCallback(async () => {
    const supabase = createClient();
    const daysAgo = parseInt(dateFilter, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data, error } = await supabase
      .from("user_events")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(EVENTS_PER_PAGE);

    if (error) {
      console.error("Error fetching events:", error);
      return;
    }

    setEvents(data || []);
  }, [dateFilter]);

  const fetchUserEvents = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user events:", error);
      return;
    }

    setUserEvents(data || []);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchUsers(), fetchEvents()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStats, fetchUsers, fetchEvents]);

  useEffect(() => {
    fetchEvents();
  }, [dateFilter, fetchEvents]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserEvents(selectedUser.user_id);
    }
  }, [selectedUser, fetchUserEvents]);

  // Filter users by search query
  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      (user.profile_name?.toLowerCase().includes(query) ?? false)
    );
  });

  // Paginate users
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * USERS_PER_PAGE,
    userPage * USERS_PER_PAGE
  );
  const totalUserPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

  // Filter events
  const filteredEvents = events.filter((event) => {
    if (typeFilter !== "all" && event.event_type !== typeFilter) return false;
    return true;
  });

  // Group events by session if enabled
  const processedEvents = groupBySession 
    ? [...filteredEvents].sort((a, b) => {
        const sA = a.session_id || "no-session";
        const sB = b.session_id || "no-session";
        if (sA < sB) return -1;
        if (sA > sB) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
    : filteredEvents;

  // Paginate events
  const paginatedEvents = processedEvents.slice(
    (eventPage - 1) * EVENTS_PER_PAGE,
    eventPage * EVENTS_PER_PAGE
  );
  const totalEventPages = Math.ceil(processedEvents.length / EVENTS_PER_PAGE);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Users with events tracked
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeToday}</div>
            <p className="text-xs text-muted-foreground">
              Users with events today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Users who created a plan
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sessions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgSessions}</div>
            <p className="text-xs text-muted-foreground">
              Sessions per user
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>User Progress</CardTitle>
          <CardDescription>
            Track user journeys through the Super Planner
          </CardDescription>
          <div className="flex items-center gap-2 pt-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setUserPage(1);
                }}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.profile_name || "Unknown"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[user.status]}>
                        {STATUS_LABELS[user.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(user.steps_completed / STEP_EVENTS.length) * 100}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">
                          {Math.round((user.steps_completed / STEP_EVENTS.length) * 100)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{user.steps_completed}/5</TableCell>
                    <TableCell>{formatDate(user.last_event_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalUserPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(userPage - 1) * USERS_PER_PAGE + 1} to{" "}
                {Math.min(userPage * USERS_PER_PAGE, filteredUsers.length)} of{" "}
                {filteredUsers.length} users
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={userPage === 1}
                  onClick={() => setUserPage(userPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={userPage === totalUserPages}
                  onClick={() => setUserPage(userPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Event Log</CardTitle>
              <CardDescription>Recent events across all users</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground px-1 text-right">Grouping</span>
                <Button
                  variant={groupBySession ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setGroupBySession(!groupBySession)}
                  className="h-9 px-3"
                >
                  {groupBySession ? "By Session" : "Flat List"}
                </Button>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground px-1">Event Type</span>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {Object.entries(EVENT_LABELS).map(([type, label]) => (
                      <SelectItem key={type} value={type}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground px-1">Time Range</span>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last 1 day</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    No events in selected time range
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEvents.map((event) => {
                  const user = users.find((u) => u.user_id === event.user_id);
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm">
                        {formatDate(event.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {EVENT_LABELS[event.event_type] || event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user?.profile_name || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user?.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <EventDetailViewer
                          type={event.event_type}
                          data={event.event_data}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {totalEventPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(eventPage - 1) * EVENTS_PER_PAGE + 1} to{" "}
                {Math.min(eventPage * EVENTS_PER_PAGE, processedEvents.length)} of{" "}
                {processedEvents.length} events
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={eventPage === 1}
                  onClick={() => setEventPage(eventPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={eventPage === totalEventPages}
                  onClick={() => setEventPage(eventPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Journey</DialogTitle>
            <DialogDescription>
              {selectedUser?.profile_name || "Unknown"} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {/* Progress Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge className={STATUS_COLORS[selectedUser.status]}>
                    {STATUS_LABELS[selectedUser.status]}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Progress</div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={
                        (selectedUser.steps_completed / STEP_EVENTS.length) * 100
                      }
                      className="flex-1"
                    />
                    <span className="text-sm">
                      {selectedUser.steps_completed}/5 steps
                    </span>
                  </div>
                </div>
              </div>

              {/* Step Progress */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Steps Completed</div>
                <div className="grid grid-cols-5 gap-2">
                  {STEP_EVENTS.map((eventType) => {
                    const completed = userEvents.some(
                      (e) => e.event_type === eventType
                    );
                    return (
                      <div
                        key={eventType}
                        className={`p-2 rounded text-center text-xs ${
                          completed
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {EVENT_LABELS[eventType]?.split(" ")[0] || eventType}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Event Timeline */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Event Timeline</div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userEvents.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No events recorded
                    </div>
                  ) : (
                    userEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-2 rounded bg-muted/50"
                      >
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(event.created_at)}
                        </div>
                        <div className="flex-1">
                          <Badge variant="outline" className="text-xs">
                            {EVENT_LABELS[event.event_type] || event.event_type}
                          </Badge>
                          {event.event_data && Object.keys(event.event_data).length > 0 && (
                            <pre className="text-xs text-muted-foreground mt-1">
                              {JSON.stringify(event.event_data, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}