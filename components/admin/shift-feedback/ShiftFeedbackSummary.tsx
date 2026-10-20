import {
  COMMUNITY_RESEARCH_PRICE,
  FEEDBACK_COMMUNITY_SIGNUP,
  FEEDBACK_CONTINUE_PROJECTS,
  FEEDBACK_DAYS,
  FEEDBACK_MOTIVATIONS,
  FEEDBACK_NEXT_STEPS,
  FEEDBACK_NEXT_STEPS_RETIRED,
  FEEDBACK_PAYERS,
  FEEDBACK_PRICE_FIT,
} from "@/lib/shift/feedback";
import type { FeedbackSummary } from "@/lib/shift/feedbackSummary";

import { FeedbackCountBars } from "./FeedbackCountBars";

/** Score tiles and per-question totals for /admin/shift/feedback. */

const daysMarking = (sessionDay: string) =>
  FEEDBACK_DAYS.map((d) => ({
    value: d.value,
    label: d.value === sessionDay ? `${d.name} (วัน session)` : d.name,
  }));

const fixed = (n: number | null) => (n === null ? "–" : n.toFixed(1));

function ScoreTile({ label, value, scale }: { label: string; value: string; scale: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-sm font-normal text-muted-foreground">{scale}</span>
      </p>
    </div>
  );
}

export function ShiftFeedbackSummary({
  summary,
  sessionDay,
}: {
  summary: FeedbackSummary;
  /** Weekday key of the alumni session ("sat"), highlighted in the day chart. */
  sessionDay: string;
}) {
  const { averages, responses, alumniAnswered, communityAnswered } = summary;
  // Retired options only get a row when an old answer used them.
  const nextSteps = [
    ...FEEDBACK_NEXT_STEPS,
    ...FEEDBACK_NEXT_STEPS_RETIRED.filter((o) => summary.nextSteps[o.value]),
  ];
  const alumniNote = alumniAnswered < responses ? `${alumniAnswered} of ${responses} were asked` : undefined;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <ScoreTile label="Responses" value={String(responses)} scale="" />
        <ScoreTile label="Satisfaction" value={fixed(averages.satisfaction)} scale="/ 5" />
        <ScoreTile label="Ownership" value={fixed(averages.ownership)} scale="/ 5" />
        <ScoreTile label="Confidence to start alone" value={fixed(averages.confidence)} scale="/ 5" />
        <ScoreTile label="Would recommend" value={fixed(averages.recommend)} scale="/ 10" />
      </div>
      {summary.recommendScores.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Recommend scores as given: {summary.recommendScores.join(", ")}
        </p>
      )}

      <h3 className="pt-2 text-base font-semibold">Alumni ask</h3>
      <div className="grid gap-3 lg:grid-cols-2">
        <FeedbackCountBars
          title="Days that suit the weekly session"
          options={daysMarking(sessionDay)}
          counts={summary.availableDays}
          total={alumniAnswered}
          highlight={sessionDay}
          note={alumniNote}
        />
        <div className="space-y-3">
          <FeedbackCountBars
            title="Project to keep going"
            options={FEEDBACK_CONTINUE_PROJECTS}
            counts={summary.continueProject}
            total={alumniAnswered}
            note={alumniNote}
          />
          <FeedbackCountBars
            title="Wants to help"
            options={nextSteps}
            counts={summary.nextSteps}
            total={responses}
          />
          <FeedbackCountBars
            title={`Community sign-up at ฿${COMMUNITY_RESEARCH_PRICE} (payment confirmed separately)`}
            options={FEEDBACK_COMMUNITY_SIGNUP}
            counts={summary.communitySignup}
            total={communityAnswered}
            note={communityAnswered < responses ? `${communityAnswered} of ${responses} were asked` : undefined}
          />
        </div>
      </div>

      <h3 className="pt-2 text-base font-semibold">Motivation and price</h3>
      <div className="grid gap-3 lg:grid-cols-3">
        <FeedbackCountBars title="Why they finished" options={FEEDBACK_MOTIVATIONS} counts={summary.motivation} total={responses} />
        <FeedbackCountBars title="Price for what they got" options={FEEDBACK_PRICE_FIT} counts={summary.priceFit} total={responses} />
        <FeedbackCountBars title="Who paid" options={FEEDBACK_PAYERS} counts={summary.payer} total={responses} />
      </div>
    </div>
  );
}
