import type { ReactNode } from "react";
import { CalendarPlus } from "lucide-react";

import { INK } from "@/components/shift/poster/riso";
import type { RisoIconName } from "@/components/shift/poster/RisoIcons";
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

import styles from "./alumni.module.css";

import { DEFAULT_TOPIC, TIME_TBD } from "./AlumniSessionCard";

/**
 * The next session agenda below the RSVP panel. Poster exports continue to
 * use the shared icon names and inks; the web agenda uses the cosmos palette.
 */

const paper = (alpha: string) => `${INK.paper}${alpha}`;

/** Icons for the steps, in order; cycles for longer runs. */
export const STEP_ICONS: RisoIconName[] = ["sparkle", "mic", "people", "hammer", "rocket"];
export const STEP_INKS = [INK.yellow, INK.orange, INK.pink, INK.paper, INK.yellow];

function Steps({ steps }: { steps: SessionStep[] }) {
  return (
    <ol className={styles.steps}>
      {steps.map((step, i) => (
        <li key={`${step.label}-${step.text}`} className={styles.step}>
          <span className={styles.stepNumber} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
          <span className="min-w-0">
            {step.label && <span className={styles.stepLabel}>{step.label}</span>}
            <span className="block font-kodchasan text-base font-medium leading-relaxed sm:text-lg">{step.text}</span>
          </span>
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
  /** Optional extra under the details. RSVP lives at the top of the page. */
  rsvp?: ReactNode;
}) {
  const { startTime, endTime, place } = sessionDetails(session, defaults);
  const steps = sessionSteps(session.topic);
  const calendarUrl = googleCalendarUrl(session, defaults);
  const first = session.date === defaults.firstDate;

  return (
    <section
      aria-labelledby="next-session"
      className={styles.session}
    >
      <p className={`${styles.sessionDate} text-sm font-medium`}>
        {longThaiDate(session.date)}{first ? " · ครั้งแรก" : ""}
      </p>
      <h2 id="next-session" className="mt-2 font-kodchasan text-3xl font-medium leading-tight sm:text-4xl">
        มีอะไรบ้าง
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
          style={{ color: "var(--aurora)" }}
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          เพิ่มลง Google Calendar
        </a>
      )}
    </section>
  );
}
