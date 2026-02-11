"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrendSummaryProps {
  trend: Array<{
    day_number: number;
    energy_level: number;
    confusion_level: number;
    interest_level: number;
  }>;
}

export function TrendSummary({ trend }: TrendSummaryProps) {
  if (trend.length === 0) {
    return null;
  }

  const chartData = trend.map((point) => ({
    day: `Day ${point.day_number}`,
    energy: point.energy_level,
    confusion: point.confusion_level,
    interest: point.interest_level,
  }));

  return (
    <Card className="border-neutral-800 bg-neutral-900/80">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Trend Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-neutral-300">Here is what you discovered about yourself across the path.</p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="day" stroke="#9ca3af" />
              <YAxis domain={[1, 5]} stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="energy" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="interest" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="confusion" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
