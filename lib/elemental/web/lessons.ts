/**
 * Elemental lessons: short YouTube clips, each part ending in a stop the
 * student answers before the next part opens. Static, typed data plus the
 * pure rules the lesson player (E28) and the server action
 * (./learn-actions.ts) share. No imports, so the player can bundle it.
 *
 * The model is the old hackathon app's interactive lessons, read from ps_app
 * (app/(hackathon)/module/[moduleId].tsx and activity/[nodeId].tsx, last
 * touched at 9d84216):
 * - A module is an ordered list of activities, and the first one not done is
 *   the current one. Here a lesson is an ordered list of parts.
 * - One clip per screen, from a YouTube id. The old screen pulled the id out
 *   of a URL; here the file stores the id itself.
 * - The next activity stays locked until every assessment on the current one
 *   is submitted. Here part n+1 opens once part n's stop is answered.
 * - A text answer can be sent again and replaces the earlier one. The same
 *   goes here: saving a part again overwrites it (one row per member, lesson
 *   and part in SQL).
 * - Left behind: file and image uploads, teammates' answers, NPC chats and
 *   webtoons. A "do it now" stop takes their place: the answer becomes a
 *   'reference' note on the team's project canvas.
 *
 * Saved answers live in elemental_lesson_progress (E09, E21). Lesson and part
 * ids are part of that data, and of the team's 'lesson' badge (ref = lesson
 * id), so never renumber a lesson's parts or rename a lesson once students
 * have saved answers.
 */

/** As elemental_lesson_progress.lesson_id allows (SQL lowercases and trims first). */
export const LESSON_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
/** A YouTube video id. */
export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
/** Parts are numbered 0..50 in SQL. */
export const LESSON_PARTS_MAX = 51;
/** elemental_lesson_progress.answer is at most 1000 characters. */
export const LESSON_ANSWER_MAX = 1000;
/** Choice option ids: short and stable, they are what gets saved. */
export const CHOICE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;

/** A written answer to a question about the clip. */
export interface QuestionStop {
  kind: "question";
  prompt: string;
  placeholder?: string;
}

export interface ChoiceOption {
  /** What gets saved as the answer. */
  id: string;
  label: string;
}

/** One pick from a short list. Reflective: there is no right answer. */
export interface ChoiceStop {
  kind: "choice";
  prompt: string;
  options: readonly ChoiceOption[];
}

/** Try it now, then write what came of it: the answer goes on the team's project canvas. */
export interface DoItNowStop {
  kind: "do_it_now";
  prompt: string;
  placeholder?: string;
}

export type LessonStop = QuestionStop | ChoiceStop | DoItNowStop;
export type LessonStopKind = LessonStop["kind"];

export interface LessonPart {
  title: string;
  /** The clip, or null while it is still to be picked (TODO): the player shows a placeholder. */
  youtubeId: string | null;
  /** Every part but the last must have one. On the last it is optional. */
  stop: LessonStop | null;
}

export interface Lesson {
  id: string;
  title: string;
  parts: readonly LessonPart[];
}

/**
 * The lessons. Both are placeholders: TODO real clips (youtubeId null) and
 * real wording. Every Thai string is a functional placeholder for review.
 */
export const LESSONS: readonly Lesson[] = [
  {
    // TODO: the real lesson id and clips.
    id: "todo-lesson-1",
    // [TH-REVIEW] placeholder title: lesson 1, content to come.
    title: "บทเรียนที่ 1 (รอเนื้อหา)",
    parts: [
      {
        // [TH-REVIEW] placeholder part title: part 1.
        title: "ช่วงที่ 1",
        youtubeId: null, // TODO clip
        stop: {
          kind: "question",
          // [TH-REVIEW] placeholder: a question about this clip, content to come.
          prompt: "คำถามท้ายช่วงนี้ (รอเนื้อหา)",
          // [TH-REVIEW] placeholder: type your answer.
          placeholder: "พิมพ์คำตอบ",
        },
      },
      {
        // [TH-REVIEW] placeholder part title: part 2.
        title: "ช่วงที่ 2",
        youtubeId: null, // TODO clip
        stop: {
          kind: "choice",
          // [TH-REVIEW] placeholder: pick one, content to come.
          prompt: "เลือกหนึ่งข้อ (รอเนื้อหา)",
          options: [
            // [TH-REVIEW] placeholder option labels: option A, option B, option C.
            { id: "a", label: "ตัวเลือก ก" },
            { id: "b", label: "ตัวเลือก ข" },
            { id: "c", label: "ตัวเลือก ค" },
          ],
        },
      },
      {
        // [TH-REVIEW] placeholder part title: part 3.
        title: "ช่วงที่ 3",
        youtubeId: null, // TODO clip
        stop: {
          kind: "do_it_now",
          // [TH-REVIEW] placeholder: try it now, then write what you found; it goes on your team's canvas.
          prompt: "ลองทำตอนนี้ แล้วเขียนสิ่งที่ได้ (ขึ้นแคนวาสของทีม) (รอเนื้อหา)",
          // [TH-REVIEW] placeholder: what did you find?
          placeholder: "ได้อะไรมาบ้าง",
        },
      },
      {
        // [TH-REVIEW] placeholder part title: wrap-up.
        title: "สรุป",
        youtubeId: null, // TODO clip
        stop: null,
      },
    ],
  },
  {
    // TODO: the real lesson id and clips.
    id: "todo-lesson-2",
    // [TH-REVIEW] placeholder title: lesson 2, content to come.
    title: "บทเรียนที่ 2 (รอเนื้อหา)",
    parts: [
      {
        // [TH-REVIEW] placeholder part title: part 1.
        title: "ช่วงที่ 1",
        youtubeId: null, // TODO clip
        stop: {
          kind: "choice",
          // [TH-REVIEW] placeholder: pick one, content to come.
          prompt: "เลือกหนึ่งข้อ (รอเนื้อหา)",
          options: [
            // [TH-REVIEW] placeholder option labels: option A, option B.
            { id: "a", label: "ตัวเลือก ก" },
            { id: "b", label: "ตัวเลือก ข" },
          ],
        },
      },
      {
        // [TH-REVIEW] placeholder part title: part 2.
        title: "ช่วงที่ 2",
        youtubeId: null, // TODO clip
        stop: {
          kind: "do_it_now",
          // [TH-REVIEW] placeholder: try it now, then write what you found; it goes on your team's canvas.
          prompt: "ลองทำตอนนี้ แล้วเขียนสิ่งที่ได้ (ขึ้นแคนวาสของทีม) (รอเนื้อหา)",
          // [TH-REVIEW] placeholder: what did you find?
          placeholder: "ได้อะไรมาบ้าง",
        },
      },
    ],
  },
];

/** The lesson with this id (trimmed, lowercased like SQL), or null. */
export function getLesson(id: unknown, lessons: readonly Lesson[] = LESSONS): Lesson | null {
  if (typeof id !== "string") return null;
  const key = id.trim().toLowerCase();
  return lessons.find((l) => l.id === key) ?? null;
}

/** True when `part` is the lesson's last part: saving it finishes the lesson. */
export function isFinalPart(lesson: Lesson, part: number): boolean {
  return part === lesson.parts.length - 1;
}

/** Why the lessons are not valid, one line each; empty when they are. */
export function lessonProblems(lessons: readonly Lesson[] = LESSONS): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const [i, lesson] of lessons.entries()) {
    const at = `lesson ${i} (${lesson.id})`;
    if (!LESSON_ID_PATTERN.test(lesson.id)) problems.push(`${at}: id must match ${LESSON_ID_PATTERN}`);
    if (seen.has(lesson.id)) problems.push(`${at}: id is not unique`);
    seen.add(lesson.id);
    if (!lesson.title.trim()) problems.push(`${at}: title is empty`);
    if (lesson.parts.length < 1) problems.push(`${at}: has no parts`);
    if (lesson.parts.length > LESSON_PARTS_MAX) problems.push(`${at}: more than ${LESSON_PARTS_MAX} parts`);
    lesson.parts.forEach((part, p) => {
      const where = `${at} part ${p}`;
      const last = p === lesson.parts.length - 1;
      if (!part.title.trim()) problems.push(`${where}: title is empty`);
      if (part.youtubeId !== null && !YOUTUBE_ID_PATTERN.test(part.youtubeId)) {
        problems.push(`${where}: youtubeId is not a YouTube id`);
      }
      if (!part.stop) {
        if (!last) problems.push(`${where}: every part but the last needs a stop`);
        return;
      }
      if (!part.stop.prompt.trim()) problems.push(`${where}: stop prompt is empty`);
      if (part.stop.kind === "choice") {
        const ids = part.stop.options.map((o) => o.id);
        if (ids.length < 2) problems.push(`${where}: a choice needs at least 2 options`);
        if (new Set(ids).size !== ids.length) problems.push(`${where}: option ids are not unique`);
        for (const o of part.stop.options) {
          if (!CHOICE_ID_PATTERN.test(o.id)) problems.push(`${where}: option id must match ${CHOICE_ID_PATTERN}`);
          if (!o.label.trim()) problems.push(`${where}: option label is empty`);
        }
      } else if (part.stop.kind !== "question" && part.stop.kind !== "do_it_now") {
        problems.push(`${where}: unknown stop kind`);
      }
    });
  }
  return problems;
}

export type AnswerCheck =
  | { ok: true; answer: string | null; stop: LessonStop | null }
  | { ok: false; error: "bad_part" | "bad_answer" };

/**
 * The answer to save for a part, or why it cannot be saved. A part with a
 * stop needs an answer (trimmed, at most LESSON_ANSWER_MAX characters; a
 * choice must be one of its option ids). The last part without a stop takes
 * no answer: saving it only finishes the lesson.
 */
export function checkAnswer(lesson: Lesson, part: unknown, raw: unknown): AnswerCheck {
  if (typeof part !== "number" || !Number.isInteger(part) || part < 0 || part >= lesson.parts.length) {
    return { ok: false, error: "bad_part" };
  }
  const stop = lesson.parts[part].stop;
  if (raw !== null && raw !== undefined && typeof raw !== "string") return { ok: false, error: "bad_answer" };
  const answer = typeof raw === "string" ? raw.trim() : "";
  if (!stop) return answer ? { ok: false, error: "bad_answer" } : { ok: true, answer: null, stop };
  if (!answer || Array.from(answer).length > LESSON_ANSWER_MAX) return { ok: false, error: "bad_answer" };
  if (stop.kind === "choice" && !stop.options.some((o) => o.id === answer)) return { ok: false, error: "bad_answer" };
  return { ok: true, answer, stop };
}

/**
 * The first part the student cannot pass yet: the first one whose stop is
 * unanswered, or the last part once every stop before it is answered.
 * Parts up to and including it are open; later ones are locked.
 */
export function currentPart(lesson: Lesson, answered: Iterable<number>): number {
  const done = new Set(answered);
  for (let p = 0; p < lesson.parts.length - 1; p++) {
    if (!done.has(p)) return p;
  }
  return lesson.parts.length - 1;
}

/** Whether a part is open to watch and answer: every stop before it is answered. */
export function isPartOpen(lesson: Lesson, part: number, answered: Iterable<number>): boolean {
  return part >= 0 && part < lesson.parts.length && part <= currentPart(lesson, answered);
}

/** A do-it-now answer as its canvas note: the lesson's title, then the answer. */
export function lessonNoteText(lesson: Lesson, answer: string): string {
  return `${lesson.title}\n${answer}`;
}
