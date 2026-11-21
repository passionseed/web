import { shortDate } from "./bangkok-date";
import { ELEMENT_LABEL, type PipelineElement } from "./pipeline";

/**
 * The one line the team pastes into chat each day. Totals only: no names of
 * students, sponsors or speakers. Pure, so it is tested. Each part is left
 * out when its source did not load, rather than showing a false zero.
 */

export type SummaryInput = {
  today: string;
  seats: {
    paid: number;
    target: number;
    paidToday: number;
    /** The next checkpoint and the seats a day it needs; null after the last one. */
    need: { perDay: number; seats: number; by: string } | null;
  } | null;
  money: {
    cashSigned: number;
    prizePool: number;
    sponsorsSigned: number;
    sponsorsTalking: number;
  } | null;
  voices: { covered: number; target: number; missing: readonly PipelineElement[] } | null;
  overdue: { tasks: number | null; followUps: number | null };
};

const n = (v: number) => v.toLocaleString("en-US");

export function dailySummary(input: SummaryInput): string {
  const parts: string[] = [];
  const { seats, money, voices, overdue } = input;

  if (seats) {
    const extra = [`+${n(seats.paidToday)} today`];
    if (seats.need && seats.need.perDay > 0) {
      extra.push(`need ${n(seats.need.perDay)}/day for ${n(seats.need.seats)} by ${shortDate(seats.need.by)}`);
    }
    parts.push(`${n(seats.paid)}/${n(seats.target)} paid (${extra.join(", ")}).`);
  }

  if (money) {
    parts.push(
      `Cash ${n(money.cashSigned)}/${n(money.prizePool)}, ${n(money.sponsorsSigned)} signed, ${n(money.sponsorsTalking)} talking.`,
    );
  }

  if (voices) {
    const missing = voices.missing.map((e) => ELEMENT_LABEL[e].toLowerCase());
    parts.push(
      missing.length > 0
        ? `Voices ${voices.covered}/${voices.target}, missing ${missing.join(", ")}.`
        : `Voices ${voices.covered}/${voices.target}.`,
    );
  }

  const late: string[] = [];
  if (overdue.tasks !== null) late.push(`${n(overdue.tasks)} ${overdue.tasks === 1 ? "task" : "tasks"}`);
  if (overdue.followUps !== null) late.push(`${n(overdue.followUps)} ${overdue.followUps === 1 ? "follow-up" : "follow-ups"}`);
  if (late.length > 0) parts.push(`Overdue: ${late.join(", ")}.`);

  return `${shortDate(input.today)}: ${parts.join(" ")}`.trim();
}
