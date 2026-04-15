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
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { 
  Users, 
  TrendingUp, 
  Activity, 
  Target,
  Clock,
  UserPlus,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface RetentionSummary {
  current_dau: number;
  current_wau: number;
  current_mau: number;
  prev_dau: number;
  prev_wau: number;
  prev_mau: number;
  total_users_ever: number;
  active_users_7d: number;
  active_users_30d: number;
  avg_session_min: number;
  dau_change_pct: number;
  wau_change_pct: number;
  mau_change_pct: number;
}

interface DAUData {
  activity_date: string;
  dau: number;
  new_daily_users: number;
  power_users: number;
}

interface WAUData {
  activity_week: string;
  wau: number;
  new_weekly_users: number;
  highly_engaged_users: number;
}

interface CohortRetentionData {
  cohort_week: string;
  week_number: number;
  retention_rate_pct: number;
  users_active: number;
}

interface OnboardingFunnel {
  step_1_app_opened: number;
  step_5_onboarding_completed: number;
  pct_overall_conversion: number;
  drop_off_before_onboarding: number;
  drop_off_during_onboarding: number;
}

interface UserJourney {
  total_tracked_users: number;
  journey_onboarding: number;
  journey_engaged: number;
  journey_high_intent: number;
  overall_engagement_rate: number;
  avg_seeds_per_user: number;
  avg_portfolio_per_user: number;
}

interface SessionDurationData {
  session_date: string;
  avg_session_duration_min: number;
  median_session_duration_min: number;
  engaged_sessions: number;
  total_sessions: number;
}

interface FunnelByCohort {
  cohort_week: string;
  cohort_size: number;
  pct_onboarding: number;
  pct_first_seed: number;
  pct_engaged: number;
}

interface AnalyticsResponse {
  retention: RetentionSummary | null;
  dau: DAUData[];
  wau: WAUData[];
  cohortRetention: CohortRetentionData[];
  onboardingFunnel: OnboardingFunnel | null;
  userJourney: UserJourney | null;
  sessionDuration: SessionDurationData[];
  funnelByCohort: FunnelByCohort[];
}

export function AdminProductAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/analytics");
      
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load product analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analytics?.retention) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              Analytics data not available. Run the SQL migrations first.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { retention } = analytics;

  // Prepare chart data
  const dauChartData = analytics.dau
    .slice()
    .reverse()
    .map((d) => ({
      date: format(parseISO(d.activity_date), "MMM d"),
      dau: d.dau,
      newUsers: d.new_daily_users,
      powerUsers: d.power_users,
    }));

  const wauChartData = analytics.wau
    .slice()
    .reverse()
    .map((w) => ({
      week: format(parseISO(w.activity_week), "MMM d"),
      wau: w.wau,
      newUsers: w.new_weekly_users,
      engaged: w.highly_engaged_users,
    }));

  // Organize cohort retention data by cohort
  const cohorts = [...new Set(analytics.cohortRetention.map((c) => c.cohort_week))].slice(0, 8);
  const retentionChartData = [];
  for (let week = 0; week <= 8; week++) {
    const dataPoint: Record<string, number | string> = { week: `W${week}` };
    cohorts.forEach((cohort) => {
      const data = analytics.cohortRetention.find(
        (c) => c.cohort_week === cohort && c.week_number === week
      );
      dataPoint[format(parseISO(cohort), "MMM d")] = data?.retention_rate_pct || 0;
    });
    retentionChartData.push(dataPoint);
  }

  const sessionChartData = analytics.sessionDuration
    .slice()
    .reverse()
    .map((s) => ({
      date: format(parseISO(s.session_date), "MMM d"),
      avgDuration: s.avg_session_duration_min,
      medianDuration: s.median_session_duration_min,
      engaged: s.engaged_sessions,
    }));

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    } else if (change < 0) {
      return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Product Analytics</h2>
        <p className="text-muted-foreground">
          Retention, engagement, and user journey metrics
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retention.current_dau.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs">
              {getChangeIcon(retention.dau_change_pct)}
              <span className={getChangeColor(retention.dau_change_pct)}>
                {retention.dau_change_pct > 0 ? "+" : ""}
                {retention.dau_change_pct}% from yesterday
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retention.current_wau.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs">
              {getChangeIcon(retention.wau_change_pct)}
              <span className={getChangeColor(retention.wau_change_pct)}>
                {retention.wau_change_pct > 0 ? "+" : ""}
                {retention.wau_change_pct}% from last week
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retention.current_mau.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs">
              {getChangeIcon(retention.mau_change_pct)}
              <span className={getChangeColor(retention.mau_change_pct)}>
                {retention.mau_change_pct > 0 ? "+" : ""}
                {retention.mau_change_pct}% from last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(retention.avg_session_min)}m
            </div>
            <p className="text-xs text-muted-foreground">
              Average session duration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Lifecycle Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {retention.total_users_ever.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All time registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active (7 days)</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {retention.active_users_7d.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {((retention.active_users_7d / retention.total_users_ever) * 100).toFixed(1)}% of total users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active (30 days)</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {retention.active_users_30d.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {((retention.active_users_30d / retention.total_users_ever) * 100).toFixed(1)}% of total users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DAU Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Active Users (Last 30 Days)</CardTitle>
          <CardDescription>
            Track daily engagement and new user acquisition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dauChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="dau"
                name="DAU"
                stroke="#6366f1"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="newUsers"
                name="New Users"
                stroke="#10b981"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* User Journey Funnel */}
      {analytics.userJourney && (
        <Card>
          <CardHeader>
            <CardTitle>User Journey Funnel</CardTitle>
            <CardDescription>
              Conversion from app open to high-intent actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {analytics.userJourney.total_tracked_users.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {analytics.userJourney.journey_onboarding.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Onboarded</p>
                <p className="text-xs text-muted-foreground">
                  {((analytics.userJourney.journey_onboarding / analytics.userJourney.total_tracked_users) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {analytics.userJourney.journey_engaged.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Engaged (3+ Seeds)</p>
                <p className="text-xs text-muted-foreground">
                  {((analytics.userJourney.journey_engaged / analytics.userJourney.total_tracked_users) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {analytics.userJourney.journey_high_intent.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">High Intent</p>
                <p className="text-xs text-muted-foreground">
                  Saved programs
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {analytics.userJourney.overall_engagement_rate.toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">Engagement Rate</p>
                <p className="text-xs text-muted-foreground">
                  Become engaged
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cohort Retention Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Retention (Weekly)</CardTitle>
          <CardDescription>
            What percentage of users from each cohort week are still active
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={retentionChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis unit="%" />
              <Tooltip />
              <Legend />
              {cohorts.slice(0, 6).map((cohort, index) => (
                <Line
                  key={cohort}
                  type="monotone"
                  dataKey={format(parseISO(cohort), "MMM d")}
                  stroke={[
                    "#6366f1",
                    "#10b981",
                    "#f59e0b",
                    "#ef4444",
                    "#8b5cf6",
                    "#ec4899",
                  ][index]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Session Duration */}
      <Card>
        <CardHeader>
          <CardTitle>Session Duration Trends</CardTitle>
          <CardDescription>
            How long users stay engaged in the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sessionChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis unit="min" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgDuration"
                name="Avg Duration"
                stroke="#6366f1"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="medianDuration"
                name="Median Duration"
                stroke="#10b981"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Funnel by Cohort */}
      {analytics.funnelByCohort.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Adoption by Cohort</CardTitle>
            <CardDescription>
              How recent cohorts convert through key features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.funnelByCohort.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="cohort_week" 
                  tickFormatter={(value) => format(parseISO(value), "MMM d")}
                />
                <YAxis unit="%" />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="pct_onboarding"
                  name="Onboarding %"
                  fill="#3b82f6"
                />
                <Bar
                  dataKey="pct_first_seed"
                  name="First Seed %"
                  fill="#10b981"
                />
                <Bar
                  dataKey="pct_engaged"
                  name="Engaged %"
                  fill="#f59e0b"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
