import type { ReactNode } from "react";
import { CalendarPlus } from "lucide-react";

import { MISREG_TEXT, INK } from "@/components/shift/poster/riso";
import { RisoIcon, type RisoIconName } from "@/components/shift/poster/RisoIcons";
import {
  googleCalendarUrl,
  longThaiDate,
  sessionDetails,
  sessionSteps,
  timeRangeLabel,
  type AlumniDefaults,
  type AlumniSession,
  type SessionStep,
} from "@/lib/content/shift-alumni";

import { DEFAULT_TOPIC, TIME_TBD } from "./AlumniSessionCard";

/**
 * The next alumni session as the hero of /shift/alumni: big date, the run of
 * the night as numbered steps (a topic written "a · b · c"), then RSVP.
 * Shared look with the session poster, so the link and the poster match.
 */

const paper = (alpha: string) => `${INK.paper}${alpha}`;

/** Icons for the steps, in order; cycles for longer runs. */
export const STEP_ICONS: RisoIconName[] = ["sparkle", "mic", "people", "hammer", "rocket"];
export const STEP_INKS = [INK.yellow, INK.orange, INK.pink, INK.paper, INK.yellow];

/** English label as a tilted print sticker, so each part reads at a glance. */
export function StepLabel({ children, index, size = 13 }: { children: string; index: number; size?: number }) {
  return (
    <span
      className="inline-block rounded-[4px] px-2 py-0.5 font-kodchasan font-bold uppercase leading-tight tracking-wide"
      style={{
        fontSize: size,
        backgroundColor: STEP_INKS[index % STEP_INKS.length],
        color: INK.black,
        transform: `rotate(${index % 2 === 0 ? -2 : 1.5}deg)`,
        boxShadow: `-2px 2px 0 ${INK.blue}`,
      }}
    >
      {children}
    </span>
  );
}

/** Round step number with an off-register shadow, like the poster stamps. */
function StepNumber({ n, hot }: { n: number; hot: boolean }) {
  return (
    <span
      className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full font-kodchasan text-base font-bold"
      style={{
        backgroundColor: hot ? INK.orange : INK.paper,
        color: INK.black,
        boxShadow: `-3px 2px 0 ${hot ? INK.pink : INK.blue}`,
      }}
    >
      {n}
    </span>
  );
}

function Steps({ steps }: { steps: SessionStep[] }) {
  return (
    <ol className="mt-7 grid gap-3">
      {steps.map((step, i) => (
        <li
          key={`${step.label}-${step.text}`}
          className="flex items-center gap-4 rounded-xl px-4 py-3.5"
          style={{ backgroundColor: paper("0a"), boxShadow: `inset 0 0 0 1px ${paper("1f")}` }}
        >
          <StepNumber n={i + 1} hot={i === 0} />
          <span className="min-w-0">
            {step.label && <StepLabel index={i}>{step.label}</StepLabel>}
            <span className="mt-1 block font-kodchasan text-base font-semibold leading-snug sm:text-lg">{step.text}</span>
          </span>
          <RisoIcon
            name={STEP_ICONS[i % STEP_ICONS.length]}
            ink={STEP_INKS[i % STEP_INKS.length]}
            size={36}
            className="ml-auto"
          />
        </li>
      ))}
    </ol>
  );
}

export function NextSessionFeature({
  session,
  defaults,
  rsvp,
}: {
  session: AlumniSession;
  defaults: AlumniDefaults;
  /** The RSVP button (and, for admins, who said yes). */
  rsvp: ReactNode;
}) {
  const { startTime, endTime, place } = sessionDetails(session, defaults);
  const steps = sessionSteps(session.topic);
  const calendarUrl = googleCalendarUrl(session, defaults);
  const first = session.date === defaults.firstDate;

  return (
    <section
      aria-labelledby="next-session"
      className="relative rounded-2xl p-6 sm:p-8"
      style={{
        backgroundColor: paper("0d"),
        boxShadow: `inset 0 0 0 1.5px ${paper("26")}, -6px 5px 0 ${INK.pink}`,
      }}
    >
      <p className="font-kodchasan text-sm font-semibold" style={{ color: INK.yellow }}>
        นัดต่อไป{first ? " · ครั้งแรก" : ""}
      </p>
      <h2 id="next-session" className="mt-1 font-kodchasan text-5xl font-bold leading-tight sm:text-6xl" style={MISREG_TEXT}>
        {longThaiDate(session.date)}
      </h2>
      <p className="mt-2 text-lg" style={{ color: paper("cc") }}>
        {timeRangeLabel(startTime, endTime) ?? TIME_TBD}
        {place && <span style={{ color: paper("80") }}> · {place}</span>}
      </p>

      {steps.length > 1 ? (
        <Steps steps={steps} />
      ) : (
        <p className="mt-6 font-kodchasan text-xl font-semibold">{steps[0]?.text || DEFAULT_TOPIC}</p>
      )}

      {session.note && (
        <p className="mt-5 leading-relaxed" style={{ color: paper("b3") }}>
          {session.note}
        </p>
      )}
      {session.host && (
        <p className="mt-3 text-sm" style={{ color: paper("99") }}>
          co-host: {session.host}
        </p>
      )}

      {rsvp}

      {calendarUrl && (
        <a
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
          style={{ color: INK.yellow }}
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          เพิ่มลง Google Calendar
        </a>
      )}
    </section>
  );
}
