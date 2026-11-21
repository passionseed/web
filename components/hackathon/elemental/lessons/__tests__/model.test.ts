/**
 * @jest-environment node
 */
import { LESSONS, type Lesson } from "@/lib/elemental/web/lessons";

import { clipUrl, learnCallbackUrl, lessonPath, lessonStatus, savedParts, stopCount, withEdition } from "../model";

const LESSON: Lesson = {
  id: "fixture",
  title: "Fixture",
  parts: [
    { title: "a", youtubeId: null, stop: { kind: "question", prompt: "q" } },
    { title: "b", youtubeId: null, stop: { kind: "question", prompt: "q" } },
    { title: "c", youtubeId: null, stop: null },
  ],
};

describe("lesson player model", () => {
  it("keeps ?edition only off the event edition", () => {
    expect(withEdition("/hackathon/island/learn", "elemental-2026", "elemental-2026")).toBe("/hackathon/island/learn");
    expect(withEdition("/hackathon/island", "elemental-dryrun", "elemental-2026")).toBe("/hackathon/island?edition=elemental-dryrun");
  });

  it("builds lesson paths for every lesson id", () => {
    for (const lesson of LESSONS) expect(lessonPath(lesson.id)).toBe(`/hackathon/island/learn/${lesson.id}`);
  });

  it("embeds only real YouTube ids, on youtube-nocookie", () => {
    expect(clipUrl(null)).toBeNull();
    expect(clipUrl("short")).toBeNull();
    expect(clipUrl('abc"><scrip')).toBeNull();
    const url = new URL(clipUrl("dQw4w9WgXcQ")!);
    expect(url.origin).toBe("https://www.youtube-nocookie.com");
    expect(url.pathname).toBe("/embed/dQw4w9WgXcQ");
    expect(url.searchParams.get("playsinline")).toBe("1");
  });

  it("returns to the lesson after Discord sign-in, never to another site", () => {
    const back = new URL(learnCallbackUrl("http://0.0.0.0:3000", "/hackathon/island/learn/todo-lesson-1?edition=elemental-dryrun"));
    expect(back.host).toBe("localhost:3000");
    expect(back.searchParams.get("next")).toBe("/hackathon/island/learn/todo-lesson-1?edition=elemental-dryrun");
    expect(new URL(learnCallbackUrl("https://x.test", "//evil.test")).searchParams.get("next")).toBe("/hackathon/island/learn");
  });

  it("counts a viewer's progress per lesson", () => {
    const watch = { mode: "watch" as const, reason: "signed_out" as const, progress: {} };
    expect(lessonStatus(LESSON, watch)).toEqual({ kind: "new" });
    expect(savedParts(watch, LESSON.id)).toEqual([]);
    expect(stopCount(LESSON)).toBe(2);

    const halfway = { mode: "save" as const, reason: null, progress: { fixture: { parts: [{ part: 0, answer: "x" }], finished: false } } };
    expect(lessonStatus(LESSON, halfway)).toEqual({ kind: "progress", done: 1, total: 2 });
    expect(savedParts(halfway, LESSON.id)).toEqual([0]);

    const done = { mode: "save" as const, reason: null, progress: { fixture: { parts: [{ part: 2, answer: null }], finished: true } } };
    expect(lessonStatus(LESSON, done)).toEqual({ kind: "finished" });
  });
});
