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
import { Loader2, TrendingUp, Users, Eye, BarChart3 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface DailyStat {
  date: string;
  unique_visitors: number;
  total_page_views: number;
  logged_in_visitors: number;
  anonymous_visitors: number;
}

interface Referrer {
  referrer_source: string;
  unique_visitors: number;
  total_visits: number;
}

interface AnalyticsData {
  summary: {
    total_unique_visitors: number;
    total_page_views: number;
    avg_daily_visitors: number;
    peak_day: {
      date: string;
      visitors: number;
    } | null;
  };
  daily_stats: DailyStat[];
  top_referrers: Referrer[];
}

export function AdminHackathonAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/hackathon/analytics?days=${days}`
      );
      const data = await response.json();

      if (response.ok) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
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

  if (!analytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Failed to load analytics data
          </p>
        </CardContent>
      </Card>
    );
  }

  // Format data for charts
  const chartData = analytics.daily_stats.map((stat) => ({
    date: format(parseISO(stat.date), "MMM d"),
    fullDate: stat.date,
    visitors: stat.unique_visitors,
    pageViews: stat.total_page_views,
    loggedIn: stat.logged_in_visitors,
    anonymous: stat.anonymous_visitors,
  }));

  const referrerData = analytics.top_referrers.slice(0, 10).map((ref) => ({
    source:
      ref.referrer_source.length > 30
        ? ref.referrer_source.substring(0, 30) + "..."
        : ref.referrer_source,
    visitors: ref.unique_visitors,
    visits: ref.total_visits,
  }));

  return (
    <div className="space-y-4">
      {/* Summary Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Unique Visitors
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.summary.total_unique_visitors.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Last {days} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Page Views
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.summary.total_page_views.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All page loads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Daily Visitors
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.summary.avg_daily_visitors}
            </div>
            <p className="text-xs text-muted-foreground">
              Per day average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.summary.peak_day?.visitors || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.peak_day?.date
                ? format(parseISO(analytics.summary.peak_day.date), "MMM d, yyyy")
                : "No data"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Period Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daily Unique Visitors</CardTitle>
              <CardDescription>
                Track unique visitors to hackathon page over time
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDays(7)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  days === 7
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                7d
              </button>
              <button
                onClick={() => setDays(30)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  days === 30
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                30d
              </button>
              <button
                onClick={() => setDays(90)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  days === 90
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                90d
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                stroke="currentColor"
              />
              <YAxis className="text-xs" stroke="currentColor" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="visitors"
                name="Unique Visitors"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="pageViews"
                name="Page Views"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Visitor Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Visitor Type Breakdown</CardTitle>
          <CardDescription>
            Logged-in users vs anonymous visitors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                stroke="currentColor"
              />
              <YAxis className="text-xs" stroke="currentColor" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Legend />
              <Bar
                dataKey="loggedIn"
                name="Logged In"
                fill="hsl(var(--chart-1))"
                stackId="a"
              />
              <Bar
                dataKey="anonymous"
                name="Anonymous"
                fill="hsl(var(--chart-3))"
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Referrers */}
      {referrerData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Referrers</CardTitle>
            <CardDescription>
              Sources driving traffic to hackathon page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={referrerData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" stroke="currentColor" />
                <YAxis
                  type="category"
                  dataKey="source"
                  width={150}
                  className="text-xs"
                  stroke="currentColor"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Bar
                  dataKey="visitors"
                  name="Unique Visitors"
                  fill="hsl(var(--chart-4))"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
