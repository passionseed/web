import { SHARE_DEMO_CODE, TEACHER_DEMO_CODE } from "./share";
import { seatProgressView, type SeatRow, type SeatSlotStatus, type SeatProgressView, type ShareLinkView } from "./share-rules";

/**
 * Made-up states for the demo pages (development and PR previews only).
 * Nothing here is real; the numbers follow SEAT_RULE (50 devices + 1 paid
 * per seat, up to 2 per link).
 *
 * Student share page: /hackathon/join/demo/share?s=<state>
 *   (none)               picking a school
 *   start                link made, nothing yet
 *   early                12 devices, 0 paid
 *   close                44 devices, 0 paid (the last 10 cells)
 *   devices-done         53 devices, 0 paid (the grid is clean, the paid sign-up isn't in)
 *   seat1-ready          seat 1 earned (53 + 1), the unpaid student's own, staff checking
 *   seat1-given          seat 1 confirmed: their sign-up is free; heading for seat 2
 *   seat2-progress       76 devices + 1 paid, seat 1 given, 24 devices + 1 paid to seat 2
 *   maxed                both seats: own given, a friend's given
 *   paid-naming-friend   a paid student earned seat 1: types a friend's code
 *   after-close          sign-up closed with seat 1 given (read-only)
 *   gifted               a friend already gave this student a seat: their own seat 1 goes to another friend
 *   seats-closed         seat 1 given, then no more seats event-wide (the cap): no next goal
 *   friend-paid          a paid student named a friend who has paid since: name someone else
 *   link-rejected        staff shut the link: no next goal, the open seat turned down
 * Pay page card: /hackathon/join/demo?share=<same state> (&share=1: no school yet)
 * Teacher page: /hackathon/elemental/teacher/demo?s=<state>
 *   start · sharing · invited · invite-sent · seat-naming · named · given
 */

const OWN_ID = `${SHARE_DEMO_CODE}-0000-4000-8000-000000000001`;
const FRIEND_ID = "5e6f7a8b-0000-4000-8000-000000000002";
const FRIEND2_ID = "9c0d1e2f-0000-4000-8000-000000000003";
const school = { name: "เตรียมอุดมศึกษา", province: "กรุงเทพมหานคร" };

const row = (index: number, status: SeatSlotStatus, recipient: string | null = null, recipientStatus: string | null = null): SeatRow => ({
  id: `demo-${index}`,
  index,
  status,
  recipientRegistrationId: recipient,
  recipientStatus,
});

type SeatOpts = Pick<Parameters<typeof seatProgressView>[0], "giftedToYou" | "seatsClosedReason" | "linkRejected"> & {
  own?: string | null;
  selfPaid?: boolean;
  phase?: SeatProgressView["phase"];
};

function seats(devices: number, paid: number, rows: SeatRow[], opts: SeatOpts = {}) {
  return seatProgressView({
    progress: { devices, paid },
    rows,
    ownRegistrationId: opts.own ?? null,
    selfPaid: opts.selfPaid ?? false,
    phase: opts.phase ?? "open",
    giftedToYou: opts.giftedToYou,
    seatsClosedReason: opts.seatsClosedReason,
    linkRejected: opts.linkRejected,
  });
}

const student = (view: SeatProgressView, selfPaid = false): ShareLinkView => ({
  kind: "student",
  code: SHARE_DEMO_CODE,
  school,
  canChangeSchool: view.phase === "open",
  selfPaid,
  verified: false,
  invited: false,
  seats: view,
});

export const STUDENT_DEMO_STATES = {
  start: () => student(seats(0, 0, [], { own: OWN_ID })),
  early: () => student(seats(12, 0, [], { own: OWN_ID })),
  close: () => student(seats(44, 0, [], { own: OWN_ID })),
  "devices-done": () => student(seats(53, 0, [], { own: OWN_ID })),
  "seat1-ready": () => student(seats(53, 1, [row(1, "qualified", OWN_ID)], { own: OWN_ID })),
  "seat1-given": () => student(seats(58, 1, [row(1, "confirmed", OWN_ID)], { own: OWN_ID, selfPaid: true }), true),
  "seat2-progress": () => student(seats(76, 1, [row(1, "confirmed", OWN_ID)], { own: OWN_ID, selfPaid: true }), true),
  maxed: () => student(seats(112, 3, [row(1, "confirmed", OWN_ID), row(2, "confirmed", FRIEND_ID)], { own: OWN_ID, selfPaid: true }), true),
  "paid-naming-friend": () => student(seats(51, 1, [row(1, "needs_recipient")], { own: OWN_ID, selfPaid: true }), true),
  "after-close": () => student(seats(74, 1, [row(1, "confirmed", OWN_ID)], { own: OWN_ID, selfPaid: true, phase: "after-close" }), true),
  gifted: () => student(seats(54, 1, [row(1, "needs_recipient")], { own: OWN_ID, giftedToYou: true })),
  "seats-closed": () => student(seats(62, 1, [row(1, "confirmed", OWN_ID)], { own: OWN_ID, selfPaid: true, seatsClosedReason: "cap" }), true),
  "friend-paid": () => student(seats(57, 1, [row(1, "qualified", FRIEND_ID, "paid")], { own: OWN_ID, selfPaid: true }), true),
  "link-rejected": () => student(seats(61, 1, [row(1, "rejected", OWN_ID)], { own: OWN_ID, linkRejected: true })),
} as const;
export type StudentDemoState = keyof typeof STUDENT_DEMO_STATES;

const teacher = (view: SeatProgressView, invited = false, verified = invited): ShareLinkView => ({
  kind: "teacher",
  code: TEACHER_DEMO_CODE,
  school,
  canChangeSchool: false,
  selfPaid: false,
  verified,
  invited,
  seats: view,
});

export const TEACHER_DEMO_STATES = {
  start: () => teacher(seats(0, 0, [])),
  sharing: () => teacher(seats(23, 0, [])),
  invited: () => teacher(seats(57, 0, [])),
  "invite-sent": () => teacher(seats(64, 0, []), true),
  "seat-naming": () => teacher(seats(61, 1, [row(1, "needs_recipient")]), true),
  named: () => teacher(seats(61, 1, [row(1, "qualified", FRIEND_ID)]), true),
  given: () => teacher(seats(108, 2, [row(1, "confirmed", FRIEND_ID), row(2, "confirmed", FRIEND2_ID)]), true),
} as const;
export type TeacherDemoState = keyof typeof TEACHER_DEMO_STATES;

export function studentDemo(s: string | undefined): ShareLinkView | null {
  return s && s in STUDENT_DEMO_STATES ? STUDENT_DEMO_STATES[s as StudentDemoState]() : null;
}

export function teacherDemo(s: string | undefined): ShareLinkView {
  return (s && s in TEACHER_DEMO_STATES ? TEACHER_DEMO_STATES[s as TeacherDemoState] : TEACHER_DEMO_STATES.sharing)();
}
