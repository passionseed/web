import type { PublishSlot } from "../types";

/**
 * When each post goes out, Bangkok time. LinkedIn is the founder's own
 * profile, so one post a weekday at 08:30, when Thai educators open it on
 * the commute. X is @PassionSeed_th, where students read at lunch and
 * after 20:00, so up to two a day, front-loaded before SHIFT[2] starts.
 *
 * SHIFT[3] (24 Oct to 9 Nov): launch on the first weekend, proof, guides,
 * parents and objections through the middle, the pair push before the
 * last week, last call two days before the apply deadline, a plain reminder
 * on deadline day, then a no-apply day-1 post when the round starts. The
 * three SHIFT[3] founder posts take Mon, Thu and the next Tue; the other
 * weekdays stay open until new LinkedIn posts exist. The test in
 * __tests__/publish.test.ts pins the deadline and day-1 slots to
 * SHIFT_COHORT_3, so moving the round breaks the test, not the plan.
 * Publishing uses each site's own scheduler (the social-publish skill), so
 * every slot stays visible and cancellable in the app until it goes live.
 */
export const PUBLISH_PLAN: PublishSlot[] = [
  { platform: "x", post: "x-shift2-new-date", at: "2026-10-11T12:00:00+07:00" },
  { platform: "x", post: "x-tester-hunt", at: "2026-10-11T20:00:00+07:00" },
  { platform: "linkedin", post: "li-post-students-told-us", at: "2026-10-12T08:30:00+07:00" },
  { platform: "x", post: "x-questions-that-lie", at: "2026-10-12T12:15:00+07:00" },
  { platform: "x", post: "x-cert-vs-proof", at: "2026-10-12T20:00:00+07:00" },
  { platform: "linkedin", post: "li-post-fishing-rod", at: "2026-10-13T08:30:00+07:00" },
  { platform: "x", post: "x-port-one-page", at: "2026-10-13T12:15:00+07:00" },
  { platform: "x", post: "x-ai-not-proxy", at: "2026-10-13T20:00:00+07:00" },
  { platform: "linkedin", post: "li-post-scam-copy", at: "2026-10-14T08:30:00+07:00" },
  { platform: "x", post: "x-shift2-last-call", at: "2026-10-14T09:00:00+07:00" },
  { platform: "linkedin", post: "li-post-school-offer", at: "2026-10-15T08:30:00+07:00" },
  { platform: "x", post: "x-problem-at-home", at: "2026-10-15T20:00:00+07:00" },
  { platform: "linkedin", post: "li-post-distribution", at: "2026-10-16T08:30:00+07:00" },
  { platform: "x", post: "x-introvert-interviews", at: "2026-10-16T20:00:00+07:00" },
  { platform: "x", post: "x-scope-cut", at: "2026-10-17T11:00:00+07:00" },
  { platform: "linkedin", post: "li-post-grandpa", at: "2026-10-19T08:30:00+07:00" },
  { platform: "linkedin", post: "li-post-trojan-horse", at: "2026-10-20T08:30:00+07:00" },
  { platform: "linkedin", post: "li-post-cert-vs-proof", at: "2026-10-21T08:30:00+07:00" },

  // SHIFT[3], week 1: launch and proof.
  { platform: "x", post: "x-shift3-launch", at: "2026-10-24T12:15:00+07:00" },
  { platform: "x", post: "x-shift3-proof", at: "2026-10-25T20:00:00+07:00" },
  { platform: "linkedin", post: "li-post-three-rounds", at: "2026-10-26T08:30:00+07:00" },
  { platform: "x", post: "x-shift3-pick-a-problem", at: "2026-10-26T20:00:00+07:00" },
  { platform: "x", post: "x-shift3-pair", at: "2026-10-27T12:15:00+07:00" },
  { platform: "x", post: "x-shift3-no-code", at: "2026-10-28T20:00:00+07:00" },
  { platform: "linkedin", post: "li-post-interview-fear", at: "2026-10-29T08:30:00+07:00" },
  { platform: "x", post: "x-shift3-ai-in-thai", at: "2026-10-29T20:00:00+07:00" },
  { platform: "x", post: "x-shift3-parents", at: "2026-10-30T20:00:00+07:00" },
  // SHIFT[3], week 2: guides and objections, then the close.
  { platform: "x", post: "x-shift3-interview-story", at: "2026-11-01T20:00:00+07:00" },
  { platform: "x", post: "x-shift3-busy", at: "2026-11-02T12:15:00+07:00" },
  { platform: "linkedin", post: "li-post-30-seats", at: "2026-11-03T08:30:00+07:00" },
  { platform: "x", post: "x-shift3-last-call", at: "2026-11-05T20:00:00+07:00" },
  { platform: "x", post: "x-shift3-deadline-day", at: "2026-11-07T12:15:00+07:00" },
  // SHIFT[3] day 1: applications are closed, so this post has no apply ask.
  { platform: "x", post: "x-shift3-day-1", at: "2026-11-09T12:15:00+07:00" },
];
