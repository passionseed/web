"use client";

import type { CcFunnelPoint, CcLeadStatus } from "@/lib/cc-research/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface LeadFunnelChartProps {
  funnel: CcFunnelPoint[];
  selectedStatus?: CcLeadStatus | "all";
}

const LABELS: Record<CcLeadStatus, string> = {
  seeded: "Seeded",
  enriched: "Enriched",
  scored: "Scored",
  outreach_ready: "Outreach-ready",
  emailed: "Emailed",
  linkedIned: "LinkedIned",
  replied: "Replied",
  no_response: "No Response",
  interviewed: "Interviewed",
  blocked: "Blocked",
  disqualified: "Disqualified",
};

function labelFor(status: CcLeadStatus): string {
  return LABELS[status] || status;
}

export function LeadFunnelChart({ funnel }: LeadFunnelChartProps) {
  return (
    <Card className="h-full border-white/15 bg-black/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lead Funnel Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel} margin={{ left: 0, right: 10, top: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" />
              <XAxis
                dataKey="status"
                angle={-25}
                interval={0}
                height={46}
                tickFormatter={(value) => labelFor(value as CcLeadStatus)}
                stroke="#a1a1aa"
              />
              <YAxis stroke="#a1a1aa" />
              <Tooltip
                formatter={(value) => [value, "Lead count"]}
                labelFormatter={(status) => labelFor(status as CcLeadStatus)}
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
