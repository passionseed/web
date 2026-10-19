import type { PublishSlot } from "../types";

/**
 * When each post goes out, Bangkok time. LinkedIn is the founder's own
 * profile, so one post a weekday at 08:30, when Thai educators open it on
 * the commute. X is @PassionSeed_th, where students read at lunch and
 * after 20:00, so up to two a day, front-loaded before SHIFT[2] starts.
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
];
