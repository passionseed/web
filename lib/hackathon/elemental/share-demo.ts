import { SHARE_DEMO_CODE, TEACHER_DEMO_CODE, type SharePhase } from "./share";
import { shareLinkView, type ShareLinkView } from "./share-rules";
import type { StoryProofStatus } from "./story-proof";

/**
 * Made-up states for the demo pages (development and PR previews only).
 * Nothing here is real.
 *
 * Student share page: /hackathon/join/demo/share?s=<state>
 *   (none)          picking a school
 *   start           link made, nothing yet
 *   early           12 devices
 *   many            64 devices, 2 paid sign-ups through the link
 *   story           a live Instagram Story proof: every team style unlocked
 *   story-revoked   staff revoked the proof
 *   after-close     sign-up closed at 74 devices (read-only)
 * Teacher page: /hackathon/elemental/teacher/demo?s=<state>
 *   start · sharing · many
 */

const school = { schoolName: "เตรียมอุดมศึกษา", province: "กรุงเทพมหานคร" };

const student = (devices: number, paid: number, opts: { phase?: SharePhase; storyProof?: StoryProofStatus } = {}): ShareLinkView =>
  shareLinkView({
    link: { kind: "student", code: SHARE_DEMO_CODE, ...school },
    counts: { devices, paid },
    phase: opts.phase ?? "open",
    storyProof: opts.storyProof,
  });

export const STUDENT_DEMO_STATES = {
  start: () => student(0, 0),
  early: () => student(12, 0),
  many: () => student(64, 2),
  story: () => student(31, 1, { storyProof: "unlocked" }),
  "story-revoked": () => student(31, 1, { storyProof: "revoked" }),
  "after-close": () => student(74, 2, { phase: "after-close" }),
} as const;
export type StudentDemoState = keyof typeof STUDENT_DEMO_STATES;

const teacher = (devices: number, paid: number): ShareLinkView =>
  shareLinkView({ link: { kind: "teacher", code: TEACHER_DEMO_CODE, ...school }, counts: { devices, paid }, phase: "open" });

export const TEACHER_DEMO_STATES = {
  start: () => teacher(0, 0),
  sharing: () => teacher(23, 0),
  many: () => teacher(57, 1),
} as const;
export type TeacherDemoState = keyof typeof TEACHER_DEMO_STATES;

export function studentDemo(s: string | undefined): ShareLinkView | null {
  return s && s in STUDENT_DEMO_STATES ? STUDENT_DEMO_STATES[s as StudentDemoState]() : null;
}

export function teacherDemo(s: string | undefined): ShareLinkView {
  return (s && s in TEACHER_DEMO_STATES ? TEACHER_DEMO_STATES[s as TeacherDemoState] : TEACHER_DEMO_STATES.sharing)();
}
