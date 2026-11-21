import { YOUTUBE_ID_PATTERN, type Lesson } from "@/lib/elemental/web/lessons";
import type { LessonViewer } from "@/lib/elemental/web/learn-actions";

/** Where the lessons live. */
export const LEARN_PATH = "/hackathon/island/learn";
export const ISLAND_PATH = "/hackathon/island";

/**
 * A path with ?edition= kept when it is not the event's own edition, so a
 * rehearsal viewer stays in the rehearsal edition from page to page.
 */
export function withEdition(path: string, edition: string, eventEdition: string): string {
  return edition === eventEdition ? path : `${path}?${new URLSearchParams({ edition }).toString()}`;
}

/** A lesson's player path. */
export function lessonPath(lessonId: string): string {
  return `${LEARN_PATH}/${encodeURIComponent(lessonId)}`;
}

/** The parts the viewer has saved for a lesson, as currentPart wants them. */
export function savedParts(viewer: LessonViewer, lessonId: string): number[] {
  return viewer.progress[lessonId]?.parts.map((p) => p.part) ?? [];
}

/** The parts of a lesson that end in a stop. */
export function stopCount(lesson: Lesson): number {
  return lesson.parts.filter((p) => p.stop !== null).length;
}

export type LessonListStatus =
  | { kind: "finished" }
  | { kind: "progress"; done: number; total: number }
  | { kind: "new" };

/** What a lesson card says for this viewer. Watchers have no saved progress, so every lesson is new to them. */
export function lessonStatus(lesson: Lesson, viewer: LessonViewer): LessonListStatus {
  const progress = viewer.progress[lesson.id];
  if (progress?.finished) return { kind: "finished" };
  const stops = new Set(lesson.parts.flatMap((p, i) => (p.stop ? [i] : [])));
  const done = (progress?.parts ?? []).filter((p) => stops.has(p.part)).length;
  return done > 0 ? { kind: "progress", done, total: stops.size } : { kind: "new" };
}

/**
 * The privacy-enhanced embed URL for a clip, or null when the id is missing
 * (the clip is still TODO) or not a YouTube id.
 */
export function clipUrl(youtubeId: string | null): string | null {
  if (!youtubeId || !YOUTUBE_ID_PATTERN.test(youtubeId)) return null;
  const params = new URLSearchParams({ rel: "0", playsinline: "1", modestbranding: "1" });
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`;
}

/** The OAuth return URL that brings the viewer back to `next` (0.0.0.0 and [::] become localhost, where the PKCE cookie lives). */
export function learnCallbackUrl(origin: string, next: string): string {
  const url = new URL("/auth/callback", origin);
  if (url.hostname === "0.0.0.0" || url.hostname === "[::]") url.hostname = "localhost";
  url.searchParams.set("next", next.startsWith(LEARN_PATH) ? next : LEARN_PATH);
  return url.toString();
}
