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
 * and the three workshops.
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

function slots() {
  const of = (kind: Slot["kind"]) => ELEMENTAL.schedule.filter((s) => s.kind === kind);
  const [opening] = of("open");
  const [interview, build, pitch] = of("workshop");
  const [due] = of("due");
  if (!opening || !interview || !build || !pitch || !due) {
    throw new Error("journey-steps: ELEMENTAL.schedule needs an opening, three workshops and a deadline");
  }
  return { opening, interview, build, pitch, due };
}

export function journeySteps(): JourneyStep[] {
  const { opening, interview, build, pitch, due } = slots();
  const weekday = (iso: string) => thaiDayDate(iso).split(" ")[0];
  return [
    {
      icon: "pick",
      doTh: "เลือกโจทย์",
      whenTh: "ตอนนี้",
      helpTh: `ทุกธาตุมีโจทย์เริ่มง่าย ทำจบได้ใน ${ELEMENTAL.days} วัน`,
      link: "board",
    },
    {
      icon: "signup",
      doTh: `สมัคร ชวนเพื่อน ${ELEMENTAL.teamMin}–${ELEMENTAL.teamMax} คน`,
      whenTh: `ภายใน ${thaiDayDate(ELEMENTAL.registrationClosesOn)}`,
      helpTh: "มาคนเดียวได้ เราจับคู่ทีมให้",
      link: "join",
    },
    {
      icon: "discord",
      doTh: "เข้า Discord มาเปิดงาน",
      whenTh: `${thaiDayDate(opening.date)} ${opening.time}`,
      helpTh: "มีพี่เลี้ยงช่วยตลอดงาน",
    },
    {
      icon: "talk",
      doTh: "คุยกับคนที่เจอปัญหาจริง",
      whenTh: thaiDayDate(interview.date),
      helpTh: `เวิร์กช็อปสอนสัมภาษณ์ ${startTime(interview.time)}`,
    },
    {
      icon: "build",
      doTh: "สร้าง แล้วให้เขาลองใช้",
      whenTh: `${thaiDayDate(build.date)} ถึง ${thaiDayDate(pitch.date)}`,
      helpTh: `เวิร์กช็อปพาสร้าง ${weekday(build.date)} ${startTime(build.time)}`,
    },
    {
      icon: "submit",
      doTh: "อัดคลิป ส่งผลงาน",
      whenTh: `${thaiDayDate(due.date)} ก่อน ${due.time}`,
      helpTh: `เวิร์กช็อปการนำเสนอ ${weekday(pitch.date)} ${startTime(pitch.time)}`,
    },
  ];
}
