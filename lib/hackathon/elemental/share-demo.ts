import { SHARE_DEMO_CODE, TEACHER_DEMO_CODE } from "./share";
import type { Race, SeatView, ShareLinkView } from "./share-rules";

/**
 * Made-up states for the demo pages (development and PR previews only):
 * /hackathon/join/demo/share?s=<state>, /hackathon/join/demo?share=<state>
 * and /hackathon/elemental/teacher/demo?s=<state>. Nothing here is real.
 */

const FRIEND_CODE = "5e6f7a8b";
const school = { name: "เตรียมอุดมศึกษา", province: "กรุงเทพมหานคร" };

/** Made-up races: 4 links at the school, someone else ahead, unless you lead. */
const race = (devices: number, paid: number, lead = { devices: 31, paid: 1 }): Race =>
  devices + paid * 17 >= lead.devices + lead.paid * 17
    ? { links: 4, leader: { devices, paid }, youLead: true }
    : { links: 4, leader: lead, youLead: false };

const student = (devices: number, paid: number, seat: SeatView, selfPaid = false): ShareLinkView => ({
  kind: "student",
  code: SHARE_DEMO_CODE,
  school,
  progress: { devices, paid },
  seat,
  canChangeSchool: devices < 5 && paid === 0 && (seat.state === "open" || seat.state === "taken"),
  selfPaid,
  verified: false,
  invited: false,
  race: race(devices, paid),
});

export const STUDENT_DEMO_STATES = {
  start: () => student(0, 0, { state: "open" }),
  early: () => student(12, 0, { state: "open" }),
  close: () => student(44, 2, { state: "open" }),
  qualified: () => student(53, 3, { state: "checking", recipient: { who: "self" } }),
  taken: () => student(31, 1, { state: "taken" }),
  given: () => student(58, 4, { state: "given", recipient: { who: "self" } }, false),
  friend: () => student(51, 3, { state: "checking", recipient: { who: "none" } }, true),
  "friend-named": () => student(51, 3, { state: "checking", recipient: { who: "other", code: FRIEND_CODE } }, true),
  "friend-given": () => student(55, 3, { state: "given", recipient: { who: "other", code: FRIEND_CODE } }, true),
  rejected: () => student(50, 3, { state: "rejected" }),
} as const;
export type StudentDemoState = keyof typeof STUDENT_DEMO_STATES;

const teacher = (devices: number, paid: number, seat: SeatView, invited = false, verified = invited): ShareLinkView => ({
  kind: "teacher",
  code: TEACHER_DEMO_CODE,
  school,
  progress: { devices, paid },
  seat,
  canChangeSchool: false,
  selfPaid: false,
  verified,
  invited,
  race: race(devices, paid),
});

export const TEACHER_DEMO_STATES = {
  start: () => teacher(0, 0, { state: "open" }),
  sharing: () => teacher(23, 1, { state: "open" }),
  invited: () => teacher(57, 2, { state: "open" }),
  verified: () => teacher(60, 2, { state: "open" }, false, true),
  "invite-sent": () => teacher(64, 2, { state: "open" }, true),
  seat: () => teacher(61, 3, { state: "checking", recipient: { who: "none" } }, true),
  named: () => teacher(61, 3, { state: "checking", recipient: { who: "other", code: FRIEND_CODE } }, true),
  given: () => teacher(70, 4, { state: "given", recipient: { who: "other", code: FRIEND_CODE } }, true),
  taken: () => teacher(52, 1, { state: "taken" }),
} as const;
export type TeacherDemoState = keyof typeof TEACHER_DEMO_STATES;

export function studentDemo(s: string | undefined): ShareLinkView | null {
  return s && s in STUDENT_DEMO_STATES ? STUDENT_DEMO_STATES[s as StudentDemoState]() : null;
}

export function teacherDemo(s: string | undefined): ShareLinkView {
  return (s && s in TEACHER_DEMO_STATES ? TEACHER_DEMO_STATES[s as TeacherDemoState] : TEACHER_DEMO_STATES.sharing)();
}
