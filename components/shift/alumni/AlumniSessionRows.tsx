import { INK } from "@/components/shift/poster/riso";
import {
  isWeeklySession,
  longThaiDate,
  stepsLine,
  timeRangeLabel,
  type AlumniDefaults,
  type AlumniSession,
} from "@/lib/content/shift-alumni";

import { Badge, DEFAULT_TOPIC } from "./AlumniSessionCard";

/**
 * Sessions other than the next one, as a compact schedule: date, topic, and
 * only what differs from the usual (own time, co-host, cancelled, one-off).
 */

const paper = (alpha: string) => `${INK.paper}${alpha}`;

const topicLine = (session: AlumniSession) => stepsLine(session.topic) || DEFAULT_TOPIC;

function SessionRow({ session, defaults }: { session: AlumniSession; defaults: AlumniDefaults }) {
  const ownTime = session.startTime ? timeRangeLabel(session.startTime, session.endTime) : null;
  const oneOff = !isWeeklySession(session.date, defaults.firstDate);
  return (
    <li className="flex gap-4 py-3.5 sm:gap-6">
      <span className="w-28 shrink-0 font-kodchasan font-semibold sm:w-32">{longThaiDate(session.date)}</span>
      <span className="min-w-0 flex-1">
        <span
          className={session.cancelled ? "line-through" : undefined}
          style={{ color: session.cancelled ? paper("66") : paper("cc") }}
        >
          {topicLine(session)}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: paper("80") }}>
          {session.cancelled && <Badge color={paper("80")}>งดครั้งนี้</Badge>}
          {oneOff && !session.cancelled && <Badge color={INK.orange}>นัดพิเศษ</Badge>}
          {ownTime && !session.cancelled && <span>{ownTime}</span>}
          {session.host && !session.cancelled && <span>co-host: {session.host}</span>}
          {session.note && session.cancelled && <span>{session.note}</span>}
        </span>
      </span>
    </li>
  );
}

export function AlumniSessionRows({
  sessions,
  defaults,
  faded = false,
}: {
  sessions: AlumniSession[];
  defaults: AlumniDefaults;
  faded?: boolean;
}) {
  return (
    <ul className={`divide-y divide-[rgba(242,234,217,0.12)] ${faded ? "opacity-60" : ""}`}>
      {sessions.map((session) => (
        <SessionRow key={session.date} session={session} defaults={defaults} />
      ))}
    </ul>
  );
}

/** A session that was called off before the next one, e.g. the Friday that
 *  moved to Saturday: one line above the feature, not a card of its own. */
export function CancelledNotice({ session }: { session: AlumniSession }) {
  return (
    <p
      className="mb-4 rounded-lg px-4 py-2.5 text-sm"
      style={{ backgroundColor: paper("0a"), color: paper("b3"), boxShadow: `inset 0 0 0 1px ${paper("1f")}` }}
    >
      <span className="font-semibold line-through" style={{ color: paper("80") }}>
        {longThaiDate(session.date)}
      </span>{" "}
      งดครั้งนี้{session.note ? ` · ${session.note}` : ""}
    </p>
  );
}
