import { Badge } from "@/components/ui/badge";
import {
  COMMUNITY_JOIN_VALUES,
  FEEDBACK_COMMUNITY_SIGNUP,
  FEEDBACK_COMMUNITY_SIGNUP_RETIRED,
  FEEDBACK_CONTINUE_PROJECTS,
  FEEDBACK_DAYS,
  FEEDBACK_MOTIVATIONS,
  FEEDBACK_NEXT_STEPS,
  FEEDBACK_NEXT_STEPS_RETIRED,
  FEEDBACK_PAYERS,
  FEEDBACK_PRICE_FIT,
} from "@/lib/shift/feedback";
import type { ShiftFeedbackRow } from "@/lib/supabase/shift-feedback";

import { optionLabel } from "./FeedbackCountBars";

/**
 * Every answer, one card per student, newest first. Minors' answers: quote
 * them only as their quote setting allows (shown on each card).
 */

const DAYS = FEEDBACK_DAYS.map((d) => ({ value: d.value, label: d.label }));
const NEXT_STEPS = [...FEEDBACK_NEXT_STEPS, ...FEEDBACK_NEXT_STEPS_RETIRED];
const COMMUNITY = [...FEEDBACK_COMMUNITY_SIGNUP, ...FEEDBACK_COMMUNITY_SIGNUP_RETIRED];

const submittedAt = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function quoteSetting(row: ShiftFeedbackRow): string {
  if (row.quote_mode === "named") return `Quote as "${row.quote_name ?? row.nickname}"`;
  if (row.quote_mode === "anonymous") return "Quote without a name";
  return "Do not quote";
}

function Answer({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm">{value}</dd>
    </div>
  );
}

function Scores({ row }: { row: ShiftFeedbackRow }) {
  const items = [
    ["Satisfaction", `${row.satisfaction}/5`],
    ["Ownership", `${row.ownership}/5`],
    ["Confidence", `${row.confidence}/5`],
    ["Recommend", `${row.recommend}/10`],
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {items.map(([label, value]) => (
        <span key={label}>
          <span className="text-muted-foreground">{label}</span> <span className="font-semibold tabular-nums">{value}</span>
        </span>
      ))}
    </div>
  );
}

function AlumniAnswers({ row }: { row: ShiftFeedbackRow }) {
  if (row.continue_project === null) return null;
  const days = (row.available_days ?? []).map((d) => optionLabel(DAYS, d)).join(" ");
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <Badge variant="secondary">{optionLabel(FEEDBACK_CONTINUE_PROJECTS, row.continue_project)}</Badge>
      {row.continue_project_note && <span className="text-muted-foreground">({row.continue_project_note})</span>}
      <Badge variant="outline">วัน: {days || "–"}</Badge>
      {row.community_signup && (
        <Badge variant={COMMUNITY_JOIN_VALUES.includes(row.community_signup) ? "default" : "outline"}>
          คอมมูนิตี้: {optionLabel(COMMUNITY, row.community_signup)}
        </Badge>
      )}
    </div>
  );
}

function ResponseCard({ row }: { row: ShiftFeedbackRow }) {
  return (
    <article className="space-y-3 rounded-lg border p-4">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="font-semibold">{row.nickname}</h4>
        <span className="text-xs text-muted-foreground">
          {row.cohort} · {submittedAt(row.created_at)}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{quoteSetting(row)}</span>
      </header>
      <Scores row={row} />
      <AlumniAnswers row={row} />
      <div className="flex flex-wrap gap-1.5">
        {row.next_steps.map((step) => (
          <Badge key={step} variant="outline">
            {optionLabel(NEXT_STEPS, step)}
          </Badge>
        ))}
        <Badge variant="outline">{optionLabel(FEEDBACK_MOTIVATIONS, row.motivation)}</Badge>
        <Badge variant="outline">ราคา: {optionLabel(FEEDBACK_PRICE_FIT, row.price_fit)}</Badge>
        <Badge variant="outline">จ่าย: {optionLabel(FEEDBACK_PAYERS, row.payer)}</Badge>
      </div>
      <dl className="grid gap-3 md:grid-cols-2">
        <Answer label="ตอนนี้ทำอะไรได้ ที่วันแรกทำไม่ได้" value={row.can_do_now} />
        <Answer label="ตอนที่ตัดสินใจเอง" value={row.own_decision} />
        <Answer label="ส่วนที่มีค่าที่สุด" value={row.most_valuable} />
        <Answer label="รอบหน้าควรเปลี่ยน" value={row.change_next} />
      </dl>
    </article>
  );
}

export function ShiftFeedbackResponses({ rows }: { rows: ShiftFeedbackRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <ResponseCard key={row.id} row={row} />
      ))}
    </div>
  );
}
