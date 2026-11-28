import { SHARE_DEMO_CODE, TEACHER_DEMO_CODE, type SharePhase } from "./share";
import { shareLinkView, type ShareLinkView } from "./share-rules";
import type { StoryProofStatus } from "./story-proof";

/**
 * Made-up states for the demo pages (development and PR previews only).
 * Nothing here is real.
 *
 * Student share page: /hackathon/join/demo/share?s=<state> (team devices in brackets;
 * STUDENT_DEMO_TEAM_DEVICES, styles open at 10 / 25 / 50)
 *   (none)            picking a school
 *   start             link made, nothing yet [0]
 *   early             6 devices on this link [6]: 4 more for colours
 *   colors-unlocked   9 on this link [14]: colours open, fonts next
 *   fonts-unlocked    12 on this link [31]: fonts open, effects next
 *   all-unlocked      40 on this link [64]: every style open by devices
 *   story-unlocked    8 on this link [14], a live Story proof: every style open
 *   story-revoked     8 on this link [14], staff revoked the proof
 *   after-close       sign-up closed, 30 on this link [52] (read-only)
 *   many · story      older names, kept for links already sent around
 * Teacher page: /hackathon/elemental/teacher/demo?s=<state>
 *   start · sharing · many · after-close
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
  early: () => student(6, 0),
  "colors-unlocked": () => student(9, 1),
  "fonts-unlocked": () => student(12, 1),
  "all-unlocked": () => student(40, 2),
  "story-unlocked": () => student(8, 1, { storyProof: "unlocked" }),
  "story-revoked": () => student(8, 1, { storyProof: "revoked" }),
  "after-close": () => student(30, 2, { phase: "after-close" }),
  many: () => student(64, 2),
  story: () => student(31, 1, { storyProof: "unlocked" }),
} as const;
export type StudentDemoState = keyof typeof STUDENT_DEMO_STATES;

/** The team's devices in each student state (every member's link together). */
export const STUDENT_DEMO_TEAM_DEVICES: Record<StudentDemoState, number> = {
  start: 0,
  early: 6,
  "colors-unlocked": 14,
  "fonts-unlocked": 31,
  "all-unlocked": 64,
  "story-unlocked": 14,
  "story-revoked": 14,
  "after-close": 52,
  many: 64,
  story: 31,
};

const teacher = (devices: number, paid: number, phase: SharePhase = "open"): ShareLinkView =>
  shareLinkView({ link: { kind: "teacher", code: TEACHER_DEMO_CODE, ...school }, counts: { devices, paid }, phase });

export const TEACHER_DEMO_STATES = {
  start: () => teacher(0, 0),
  sharing: () => teacher(23, 0),
  many: () => teacher(57, 1),
  "after-close": () => teacher(61, 1, "after-close"),
} as const;
export type TeacherDemoState = keyof typeof TEACHER_DEMO_STATES;

export function studentDemo(s: string | undefined): ShareLinkView | null {
  return s && s in STUDENT_DEMO_STATES ? STUDENT_DEMO_STATES[s as StudentDemoState]() : null;
}

export function teacherDemo(s: string | undefined): ShareLinkView {
  return (s && s in TEACHER_DEMO_STATES ? TEACHER_DEMO_STATES[s as TeacherDemoState] : TEACHER_DEMO_STATES.sharing)();
}
