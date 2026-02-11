"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PathReportData } from "@/types/pathlab";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ReportGenerator } from "./ReportGenerator";

interface StudentDetailProps {
  enrollment: any;
  profile: any;
  reflections: any[];
  exitReflection: any | null;
  endReflection: any | null;
  reportData: PathReportData;
}

function metricWidth(value: number) {
  const safeValue = Math.max(1, Math.min(5, value));
  return `${(safeValue / 5) * 100}%`;
}

function MiniMetricBar({ label, value, barClassName }: { label: string; value: number; barClassName: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-neutral-300">
        <span>{label}</span>
        <span>{value}/5</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-neutral-800">
        <div className={`h-1.5 rounded-full ${barClassName}`} style={{ width: metricWidth(value) }} />
      </div>
    </div>
  );
}

export function StudentDetail({
  enrollment,
  profile,
  reflections,
  exitReflection,
  endReflection,
  reportData,
}: StudentDetailProps) {
  const chartData = reflections.map((reflection) => ({
    day: `Day ${reflection.day_number}`,
    energy: reflection.energy_level,
    confusion: reflection.confusion_level,
    interest: reflection.interest_level,
    minutes: reflection.time_spent_minutes || 0,
  }));

  const totalMinutes = reflections.reduce((sum, reflection) => sum + (reflection.time_spent_minutes || 0), 0);

  return (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900/80">
        <CardHeader>
          <CardTitle className="text-white">
            {profile?.full_name || profile?.username || "Student"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Status</p>
            <Badge className="mt-2 bg-neutral-200 text-neutral-900 hover:bg-neutral-200">{enrollment.status}</Badge>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Current day</p>
            <p className="mt-2 text-white">{enrollment.current_day}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Reflections</p>
            <p className="mt-2 text-white">{reflections.length}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Total time</p>
            <p className="mt-2 text-white">{totalMinutes} min</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-neutral-800 bg-neutral-900/80">
        <CardHeader>
          <CardTitle className="text-white">Day-by-day trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis domain={[1, 5]} stroke="#9ca3af" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="energy" stroke="#34d399" strokeWidth={2} />
                <Line type="monotone" dataKey="interest" stroke="#60a5fa" strokeWidth={2} />
                <Line type="monotone" dataKey="confusion" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-neutral-800 bg-neutral-900/80">
        <CardHeader>
          <CardTitle className="text-white">Day Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reflections.length === 0 ? (
            <p className="text-sm text-neutral-400">No reflections yet.</p>
          ) : (
            reflections.map((reflection) => (
              <div key={reflection.id} className="rounded-md border border-neutral-800 bg-neutral-950/70 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Day {reflection.day_number}</p>
                  <p className="text-xs text-neutral-400">{reflection.time_spent_minutes || 0} min</p>
                </div>
                <div className="mt-3 space-y-2">
                  <MiniMetricBar label="Energy" value={reflection.energy_level} barClassName="bg-emerald-400" />
                  <MiniMetricBar label="Interest" value={reflection.interest_level} barClassName="bg-blue-400" />
                  <MiniMetricBar
                    label="Confusion"
                    value={reflection.confusion_level}
                    barClassName="bg-amber-400"
                  />
                </div>
                {reflection.open_response && (
                  <p className="mt-3 text-xs italic text-neutral-300">"{reflection.open_response}"</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {exitReflection && (
        <Card className="border-neutral-800 bg-neutral-900/80">
          <CardHeader>
            <CardTitle className="text-white">Exit Reflection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-200">
            <p>Reason: {exitReflection.reason_category}</p>
            <p>Interest change: {exitReflection.interest_change}</p>
            {exitReflection.open_response && <p>Note: {exitReflection.open_response}</p>}
          </CardContent>
        </Card>
      )}

      {endReflection && (
        <Card className="border-neutral-800 bg-neutral-900/80">
          <CardHeader>
            <CardTitle className="text-white">End Reflection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-200">
            <p>Overall interest: {endReflection.overall_interest}/5</p>
            <p>Fit level: {endReflection.fit_level}/5</p>
            <p>Explore deeper: {endReflection.would_explore_deeper}</p>
            {endReflection.surprise_response && <p>Surprise: {endReflection.surprise_response}</p>}
          </CardContent>
        </Card>
      )}

      <ReportGenerator enrollmentId={enrollment.id} reportData={reportData} />
    </div>
  );
}
