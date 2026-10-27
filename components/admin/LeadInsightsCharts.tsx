"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LeadAudienceStats, LeadFunnelStage } from "@/lib/supabase/lead-insights";
import type { DmLeadStage } from "@/types/dm-leads";

const STAGE_LABEL: Record<DmLeadStage, string> = {
  unknown: "Unknown",
  exploring: "Exploring",
  building: "Building",
  job_seeking: "Job seeking",
};

const STAGE_COLORS: Record<DmLeadStage, string> = {
  unknown: "#a1a1aa",
  exploring: "#38bdf8",
  building: "#f59e0b",
  job_seeking: "#8b5cf6",
};

const COVERED_FILL = "#10b981";
const UNCOVERED_FILL = "#6366f1";

function FunnelSection({ stages }: { stages: LeadFunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funnel</CardTitle>
        <CardDescription>
          From IG comment to converted lead. Each stage is a subset of the one
          above; % is stage-to-stage conversion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage) => (
          <div key={stage.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span>{stage.label}</span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {stage.count.toLocaleString()}
                </span>
                {stage.conversionFromPrev !== null && (
                  <> · {stage.conversionFromPrev}% of prev</>
                )}
              </span>
            </div>
            <div className="h-3 w-full rounded-sm bg-muted">
              <div
                className="h-3 rounded-sm bg-primary"
                style={{ width: `${Math.max((stage.count / max) * 100, stage.count > 0 ? 1 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function IntentCards({ audience }: { audience: LeadAudienceStats }) {
  const cards = [
    { label: "Wants PathLab", value: audience.intentCounts.wantsPathlab },
    { label: "Pay ready", value: audience.intentCounts.payReady },
    { label: "Wants community", value: audience.intentCounts.wantsCommunity },
    { label: "Wants talent track", value: audience.intentCounts.wantsTalent },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              of {audience.totalConversations.toLocaleString()} conversations
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TopInterestsChart({ audience }: { audience: LeadAudienceStats }) {
  const data = audience.interestFrequency.slice(0, 15);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top interests</CardTitle>
        <CardDescription>
          Most-mentioned fields across conversations. Green = covered by a
          PathLab seed today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No interests classified yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(data.length * 32, 160)}>
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="interest" width={160} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend
                payload={[
                  { value: "Covered by PathLab", type: "square", color: COVERED_FILL },
                  { value: "Not covered yet", type: "square", color: UNCOVERED_FILL },
                ]}
              />
              <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.interest}
                    fill={entry.covered ? COVERED_FILL : UNCOVERED_FILL}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function StageDonut({ audience }: { audience: LeadAudienceStats }) {
  const data = (Object.entries(audience.stageCounts) as [DmLeadStage, number][])
    .filter(([, count]) => count > 0)
    .map(([stage, count]) => ({ name: STAGE_LABEL[stage], value: count, fill: STAGE_COLORS[stage] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stage distribution</CardTitle>
        <CardDescription>Auto-classified stage per conversation</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
            />
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/** The loader buckets leads with no grade under an em dash; show it as a word. */
const UNGRADED_BUCKET = "\u2014";
const UNGRADED_LABEL = "Unclassified";

function GradeChart({ audience }: { audience: LeadAudienceStats }) {
  const gradeCounts = audience.gradeCounts.map((row) =>
    row.grade === UNGRADED_BUCKET ? { ...row, grade: UNGRADED_LABEL } : row,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grade distribution</CardTitle>
        <CardDescription>“{UNGRADED_LABEL}” means we have not classified a grade yet</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={gradeCounts} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" name="Leads" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ResponseLatencySection() {
  const data = [
    { range: "< 5 นาที", events: 288, continuationPct: 93, oddsRatio: "6.4x", fill: "#10b981" },
    { range: "5 - 30 นาที", events: 105, continuationPct: 89, oddsRatio: "3.7x", fill: "#0ea5e9" },
    { range: "30 - 120 นาที", events: 54, continuationPct: 78, oddsRatio: "1.7x", fill: "#f59e0b" },
    { range: "2 - 24 ชม.", events: 59, continuationPct: 78, oddsRatio: "1.7x", fill: "#f97316" },
    { range: "> 24 ชม.", events: 37, continuationPct: 68, oddsRatio: "1.0x (Base)", fill: "#ef4444" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>⚡ Response Latency Elasticity (Admin SLA vs. อัตราการคุยต่อ)</span>
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-mono text-emerald-600 dark:text-emerald-400">
            p &lt; 0.001 (Significant)
          </span>
        </CardTitle>
        <CardDescription>
          วิเคราะห์จาก 543 คู่การตอบกลับ: ตอบกลับภายใน 5 นาทีช่วยให้อัตราการคุยต่อสูงถึง 93.1% (โอกาสคุยต่อสูงกว่าตอบเกิน 24 ชม. ถึง 6.4 เท่า)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="range" tick={{ fontSize: 12 }} />
            <YAxis unit="%" domain={[0, 100]} />
            <Tooltip
              formatter={(value, name, item) => [
                `${value}% (${item.payload.events} ครั้ง, Odds: ${item.payload.oddsRatio})`,
                "อัตราการคุยต่อ (Continuation Rate)",
              ]}
            />
            <Bar dataKey="continuationPct" name="Continuation %" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.range} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function IntentTaxonomySection() {
  const intents = [
    { intent: "TCAS / รอบพอร์ต / เตรียมมหาลัย", pct: 86.7, count: 221, note: "เป้าหมายหลัก 86.7%" },
    { intent: "เริ่มจากศูนย์ / กลัวไม่มีพื้นฐาน", pct: 18.0, count: 46, note: "คลายกังวลแล้วปิดได้ 100%" },
    { intent: "เวลาเรียน / ติดสอบ / งานเยอะ", pct: 15.7, count: 40, note: "กิจกรรม Async ยืดหยุ่น" },
    { intent: "เขียนโค้ด / ทักษะ AI เชิงลึก", pct: 13.7, count: 35, note: "ต้องการทำโปรเจกต์จริง" },
    { intent: "สอบถามราคา / ค่าสมัคร / ทุน", pct: 11.0, count: 28, note: "พร้อมโอนเมื่อข้อเสนอชัด" },
    { intent: "ความน่าเชื่อถือเกียรติบัตร", pct: 7.8, count: 20, note: "เน้นชิ้นงานจริงคลิกดูได้" },
    { intent: "ต้องขอผู้ปกครอง / ถามแม่", pct: 7.8, count: 20, note: "ส่งสรุป 1 หน้าให้ผู้ปกครอง" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>🗣️ Intent Taxonomy & ความต้องการหลักของน้อง (NLP Analysis)</CardTitle>
        <CardDescription>
          สกัดจาก 255 บทสนทนาที่คุยจริง: สัดส่วนประเด็นที่น้องยกขึ้นมาถามและข้อกังวลที่ต้องตอบ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {intents.map((item) => (
          <div key={item.intent} className="space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium">{item.intent}</span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{item.pct}%</span> ({item.count} คน) · {item.note}
              </span>
            </div>
            <div className="h-2 w-full rounded-sm bg-muted">
              <div
                className="h-2 rounded-sm bg-primary/80"
                style={{ width: `${item.pct}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function LeadInsightsCharts({
  funnel,
  audience,
}: {
  funnel: LeadFunnelStage[];
  audience: LeadAudienceStats;
}) {
  return (
    <div className="space-y-6">
      <FunnelSection stages={funnel} />
      <IntentCards audience={audience} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ResponseLatencySection />
        <IntentTaxonomySection />
      </div>
      <TopInterestsChart audience={audience} />
      <div className="grid gap-6 lg:grid-cols-2">
        <StageDonut audience={audience} />
        <GradeChart audience={audience} />
      </div>
    </div>
  );
}
