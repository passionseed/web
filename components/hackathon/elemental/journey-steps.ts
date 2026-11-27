import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";

/**
 * What a student does, start to finish, in six steps: shown near the top of
 * /hackathon/elemental and above the problem board. Big, 2026-11-26: students
 * read the page and still don't know what they're doing, and beginners don't
 * know if they can make it. So each step is one action, when it happens, and
 * the help they get for it.
 *
 * Every date and time comes from ELEMENTAL (facts.ts). The help lines reuse
 * what the page already promises: a starter brief that finishes in the
 * hackathon's days, solo sign-ups matched into teams, mentors throughout,
 * and the three workshops (their times once facts.ts has them).
 */

export type StepIcon = "pick" | "signup" | "discord" | "talk" | "build" | "submit";

export interface JourneyStep {
  icon: StepIcon;
  /** The action, a few words. */
  doTh: string;
  /** When it happens. */
  whenTh: string;
  /** The help a beginner gets for this step. */
  helpTh: string;
  /** Where the step happens on the site, if anywhere. */
  link?: "board" | "join";
}

const WEEKDAY_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."] as const;

/** "ศ. 4 ธ.ค.": a short Thai date with its weekday. */
export function thaiDayDate(iso: string): string {
  const weekday = WEEKDAY_TH[new Date(`${iso}T00:00:00Z`).getUTCDay()];
  return `${weekday} ${formatThaiDate(iso, false)}`;
}

/** "10:00–11:00" → "10:00". */
const startTime = (time: string) => time.split("–")[0];

type Slot = (typeof ELEMENTAL.schedule)[number];

/**
 * The slots the steps need. The workshops are optional: their times are
 * (fill in) since the 12 Dec extension, so facts.ts lists none for now. Once
 * they are added back there, in the order interview, build, pitch, their
 * times show up in the help lines on their own.
 */
function slots() {
  const of = (kind: Slot["kind"]) => ELEMENTAL.schedule.filter((s) => s.kind === kind);
  const [opening] = of("open");
  const builds = of("build");
  // The last deadline is the final hand-in; the first is sign-up closing.
  const handIn = of("due").at(-1);
  const [interview, build, pitch] = of("workshop");
  if (!opening?.time || builds.length === 0 || !handIn?.time) {
    throw new Error("journey-steps: ELEMENTAL.schedule needs a timed opening, build days and a timed hand-in");
  }
  return {
    opening: { date: opening.date, time: opening.time },
    buildFrom: builds[0].date,
    buildTo: handIn.date,
    handIn: { date: handIn.date, time: handIn.time },
    interview,
    build,
    pitch,
  };
}

/** "เวิร์กช็อปพาทำ ส. 19:00", or "มีเวิร์กช็อปพาทำ" while its time isn't set. */
function workshopHelp(nameTh: string, slot: Slot | undefined, withWeekday: boolean): string {
  if (!slot?.time) return `มี${nameTh}`;
  const day = withWeekday ? `${thaiDayDate(slot.date).split(" ")[0]} ` : "";
  return `${nameTh} ${day}${startTime(slot.time)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How many days teams build: the first build day to the final hand-in,
 * counting both (Sat 5 to Thu 10 Dec is 6). Not ELEMENTAL.days, which runs
 * to the Demo Day, after the hand-in.
 */
export function buildDayCount(): number {
  const { buildFrom, buildTo } = slots();
  return Math.round((Date.parse(buildTo) - Date.parse(buildFrom)) / DAY_MS) + 1;
}

export function journeySteps(): JourneyStep[] {
  const { opening, buildFrom, buildTo, handIn, interview, build, pitch } = slots();
  return [
    {
      icon: "pick",
      doTh: "เลือกโจทย์",
      whenTh: "ตอนนี้",
      helpTh: `ทุกธาตุมีโจทย์ตั้งต้น ทำจบได้ใน ${buildDayCount()} วัน`,
      link: "board",
    },
    {
      icon: "signup",
      doTh: `สมัคร ทีมละ ${ELEMENTAL.teamMin}–${ELEMENTAL.teamMax} คน`,
      whenTh: `ภายใน ${thaiDayDate(ELEMENTAL.registrationClosesOn)}`,
      helpTh: "มาคนเดียวได้ เราหาทีมให้",
      link: "join",
    },
    {
      icon: "discord",
      doTh: "เข้า Discord ร่วมเปิดงาน",
      whenTh: `${thaiDayDate(opening.date)} ${opening.time}`,
      helpTh: "มีพี่เลี้ยงช่วยตลอดงาน",
    },
    {
      icon: "talk",
      doTh: "คุยกับคนที่เจอปัญหาจริง",
      whenTh: thaiDayDate(interview?.date ?? buildFrom),
      helpTh: workshopHelp("เวิร์กช็อปสอนสัมภาษณ์", interview, false),
    },
    {
      icon: "build",
      doTh: "สร้าง แล้วให้คนที่เจอปัญหาลองใช้",
      whenTh: `${thaiDayDate(buildFrom)} ถึง ${thaiDayDate(buildTo)}`,
      helpTh: workshopHelp("เวิร์กช็อปพาทำ", build, true),
    },
    {
      icon: "submit",
      doTh: "อัดคลิป ส่งผลงาน",
      whenTh: `${thaiDayDate(handIn.date)} ภายใน ${handIn.time}`,
      helpTh: workshopHelp("เวิร์กช็อปการนำเสนอ", pitch, true),
    },
  ];
}
