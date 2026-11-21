/**
 * @jest-environment node
 *
 * Elemental lessons (lib/elemental/web/lessons.ts) and the lesson server
 * actions (lib/elemental/web/learn-actions.ts). Supabase is mocked: a small
 * in-memory stand-in for elemental_web_lesson_answer (E21) and the bot's
 * canvas target and write functions (E11). The SQL itself is tested under
 * pnpm test:db:elemental.
 */
import type { Note } from "../canvas";
import { saveLessonAnswer, getLessonViewer } from "../web/learn-actions";
import {
  checkAnswer,
  currentPart,
  getLesson,
  isFinalPart,
  isPartOpen,
  type Lesson,
  lessonProblems,
  LESSONS,
} from "../web/lessons";

// --- Session -----------------------------------------------------------------

/** Fixture snowflakes are built, never real: 9 followed by 17 digits. */
const MEMBER_A = "9" + "1".repeat(17);
const MEMBER_B = "9" + "2".repeat(17);
const NO_TEAM = "9" + "3".repeat(17);
const OWNER = "00000000-0000-4000-8000-0000000000aa";
const BOARD = "00000000-0000-4000-8000-0000000000bb";
const FRAME = "frame-project-1";
const GUILD = "9" + "4".repeat(17);

const mockGetUser = jest.fn();
jest.mock("@/utils/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

function signedInWithDiscord(discordId: string) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-1", identities: [{ provider: "discord", id: discordId, identity_data: {} }] } },
  });
}

// --- Database ------------------------------------------------------------------

type Progress = { id: string; member: string; team: string; lesson: string; part: number; answer: string | null; final: boolean; finished: boolean };

/** What the fake database holds, reset before each test. */
const db = {
  teamOf: new Map<string, string | null>(),
  progress: [] as Progress[],
  badges: new Set<string>(),
  linked: new Set<string>(),
  board: [] as Record<string, unknown>[],
  calls: [] as string[],
};

function sqlError(code: string, hint?: string) {
  return { code: "P0001", message: `el:${code}`, details: null, hint: hint ?? null };
}

/** elemental_web_lesson_answer, as far as these tests need it. */
function lessonAnswer(args: Record<string, unknown>) {
  const user = args.p_discord_user_id as string;
  if (!db.teamOf.has(user)) return { data: null, error: sqlError("not_claimed") };
  const team = db.teamOf.get(user);
  if (!team) return { data: null, error: sqlError("no_team") };
  const key = { member: user, lesson: args.p_lesson_id as string, part: args.p_part as number };
  let row = db.progress.find((p) => p.member === key.member && p.lesson === key.lesson && p.part === key.part);
  const wasFinished = row?.finished ?? false;
  if (!row) {
    row = { id: `0000000${db.progress.length}-0000-4000-8000-000000000001`, team, ...key, answer: null, final: false, finished: false };
    db.progress.push(row);
  }
  row.answer = (args.p_answer as string | null) ?? null;
  row.final = row.final || (args.p_final as boolean);
  row.finished = row.finished || (args.p_final as boolean);
  let badge = false;
  if (row.final) {
    const ref = `${row.team}:lesson:${row.lesson}`;
    badge = !db.badges.has(ref);
    db.badges.add(ref);
  }
  return {
    data: {
      progress_id: row.id,
      lesson_id: row.lesson,
      part: row.part,
      final: row.final,
      finished_at: row.finished ? "2026-12-05T12:00:00Z" : null,
      first_finish: row.finished && !wasFinished,
      badge_awarded: badge,
      team: { team_id: team, slot: 12, element: "fire" },
      canvas: db.linked.has(team) ? { board_id: BOARD, frame_id: FRAME, owner_id: OWNER } : null,
    },
    error: null,
  };
}

const FRAME_BOX = { x: 0, y: 0, width: 1600, height: 1000 };
const ZONE_BOX = { x: 40, y: 100, width: 600, height: 400 };

function canvasTarget(args: Record<string, unknown>) {
  const id = args.p_entry_id as string;
  const row = db.progress.find((p) => p.id === id);
  if (!row) return { data: null, error: sqlError("entry_not_found") };
  const rect = db.board.find((e) => e.id === `el-${id}-r`);
  const text = db.board.find((e) => e.id === `el-${id}-t`);
  return {
    data: {
      entry_id: id,
      kind: "reference",
      source: "lesson",
      live: true,
      linked: db.linked.has(row.team),
      board_id: BOARD,
      frame_id: FRAME,
      owner_id: OWNER,
      frame: FRAME_BOX,
      zone: ZONE_BOX,
      after_index: (db.board.map((e) => e.index as string).sort().at(-1) as string | undefined) ?? null,
      nearby: [],
      prev: rect && text ? [rect, text] : null,
      prev_on_frame: rect ? rect.frameId === FRAME : null,
    },
    error: null,
  };
}

function canvasWrite(args: Record<string, unknown>) {
  const elements = args.p_elements as Record<string, unknown>[];
  for (const el of elements) {
    const at = db.board.findIndex((e) => e.id === el.id);
    if (at >= 0) db.board[at] = el;
    else db.board.push(el);
  }
  return { data: { ok: true, status: null, reason: null, ids: elements.map((e) => e.id), dropped: [], present: true }, error: null };
}

async function fakeRpc(fn: string, args: Record<string, unknown>) {
  db.calls.push(`rpc:${fn}`);
  if (fn === "elemental_web_lesson_answer") return lessonAnswer(args);
  if (fn === "elemental_bot_canvas_target") return canvasTarget(args);
  if (fn === "elemental_bot_canvas_write") return canvasWrite(args);
  return { data: null, error: { message: "unknown function" } };
}
const mockRpc = jest.fn(fakeRpc);

/** A thenable PostgREST-like builder over the fake tables. */
function query(table: string) {
  db.calls.push(`from:${table}`);
  const filters: Record<string, unknown> = {};
  const rows = (): Record<string, unknown>[] => {
    if (table === "elemental_settings") return filters.edition === "elemental-2026" ? [{ guild_id: GUILD }] : [];
    if (table === "elemental_members") {
      const user = filters.discord_user_id as string;
      return db.teamOf.has(user) ? [{ id: `member-${user}`, team_id: db.teamOf.get(user) ?? null }] : [];
    }
    if (table === "elemental_teams") return [{ status: "active" }];
    if (table === "elemental_lesson_progress") {
      return db.progress
        .filter((p) => `member-${p.member}` === filters.member_id)
        .map((p) => ({ lesson_id: p.lesson, part: p.part, answer: p.answer, final: p.final, finished_at: p.finished ? "2026-12-05T12:00:00Z" : null }));
    }
    return [];
  };
  const builder = {
    select: () => builder,
    limit: () => builder,
    eq: (column: string, value: unknown) => {
      filters[column] = value;
      return builder;
    },
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve({ data: rows(), error: null }).then(resolve, reject),
  };
  return builder;
}

const mockFrom = jest.fn(query);
jest.mock("@/utils/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mockRpc, from: mockFrom }),
}));

let errorLog: jest.SpyInstance;
beforeEach(() => {
  db.teamOf = new Map([
    [MEMBER_A, "team-1"],
    [MEMBER_B, "team-1"],
    [NO_TEAM, null],
  ]);
  db.progress = [];
  db.badges = new Set();
  db.linked = new Set(["team-1"]);
  db.board = [];
  db.calls = [];
  mockGetUser.mockReset();
  mockRpc.mockReset();
  mockRpc.mockImplementation(fakeRpc);
  errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errorLog.mockRestore());

const L1 = LESSONS[0];
const L2 = LESSONS[1];
/** The first part of a lesson with a stop of this kind. */
const partOf = (lesson: Lesson, kind: string) => lesson.parts.findIndex((p) => p.stop?.kind === kind);
const writes = () => mockRpc.mock.calls.filter(([fn]) => fn === "elemental_bot_canvas_write");

// --- Schema ------------------------------------------------------------------

describe("lessons schema", () => {
  it("the shipped lessons are valid", () => {
    expect(lessonProblems(LESSONS)).toEqual([]);
    expect(LESSONS.length).toBeGreaterThanOrEqual(2);
  });

  it("covers every stop kind", () => {
    const kinds = new Set(LESSONS.flatMap((l) => l.parts.map((p) => p.stop?.kind)));
    expect(kinds).toEqual(new Set(["question", "choice", "do_it_now", undefined]));
  });

  const part = (stop: Lesson["parts"][number]["stop"]) => ({ title: "p", youtubeId: null, stop });
  const ask = { kind: "question", prompt: "q" } as const;

  it("refuses repeated lesson ids", () => {
    const lesson: Lesson = { id: "same", title: "t", parts: [part(null)] };
    expect(lessonProblems([lesson, lesson])).toEqual([expect.stringContaining("not unique")]);
  });

  it("refuses a part other than the last without a stop", () => {
    const lesson: Lesson = { id: "a", title: "t", parts: [part(null), part(ask)] };
    expect(lessonProblems([lesson])).toEqual([expect.stringContaining("needs a stop")]);
    expect(lessonProblems([{ ...lesson, parts: [part(ask), part(null)] }])).toEqual([]);
  });

  it("refuses bad ids, bad clips, bad choices and too many parts", () => {
    expect(lessonProblems([{ id: "Bad Id", title: "t", parts: [part(null)] }])).toHaveLength(1);
    expect(lessonProblems([{ id: "a", title: "t", parts: [{ title: "p", youtubeId: "not-a-clip", stop: null }] }])).toHaveLength(1);
    expect(lessonProblems([{ id: "a", title: "t", parts: [{ title: "p", youtubeId: "dQw4w9WgXcQ", stop: null }] }])).toEqual([]);
    const choice = { kind: "choice", prompt: "c", options: [{ id: "a", label: "A" }, { id: "a", label: "B" }] } as const;
    expect(lessonProblems([{ id: "a", title: "t", parts: [part(choice)] }])).toEqual([expect.stringContaining("option ids")]);
    expect(lessonProblems([{ id: "a", title: "t", parts: Array.from({ length: 52 }, () => part(ask)) }])).toEqual([
      expect.stringContaining("more than 51"),
    ]);
    expect(lessonProblems([{ id: "a", title: "t", parts: [] }])).toEqual([expect.stringContaining("no parts")]);
  });

  it("locks each part until the stop before it is answered", () => {
    expect(currentPart(L1, [])).toBe(0);
    expect(isPartOpen(L1, 1, [])).toBe(false);
    expect(isPartOpen(L1, 1, [0])).toBe(true);
    expect(currentPart(L1, [0, 1, 2])).toBe(L1.parts.length - 1);
    expect(isFinalPart(L1, L1.parts.length - 1)).toBe(true);
    expect(isFinalPart(L1, 0)).toBe(false);
  });

  it("checks answers against the stop", () => {
    const q = partOf(L1, "question");
    const c = partOf(L1, "choice");
    const last = L1.parts.length - 1;
    expect(checkAnswer(L1, q, "  an idea  ")).toMatchObject({ ok: true, answer: "an idea" });
    expect(checkAnswer(L1, q, "   ")).toEqual({ ok: false, error: "bad_answer" });
    expect(checkAnswer(L1, q, "x".repeat(1001))).toEqual({ ok: false, error: "bad_answer" });
    expect(checkAnswer(L1, c, "a")).toMatchObject({ ok: true, answer: "a" });
    expect(checkAnswer(L1, c, "z")).toEqual({ ok: false, error: "bad_answer" });
    expect(checkAnswer(L1, last, null)).toMatchObject({ ok: true, answer: null });
    expect(checkAnswer(L1, last, "text")).toEqual({ ok: false, error: "bad_answer" });
    expect(checkAnswer(L1, 99, "x")).toEqual({ ok: false, error: "bad_part" });
    expect(checkAnswer(L1, 1.5, "x")).toEqual({ ok: false, error: "bad_part" });
    expect(getLesson(" TODO-LESSON-1 ")).toBe(L1);
    expect(getLesson("nope")).toBeNull();
  });
});

// --- saveLessonAnswer --------------------------------------------------------------

describe("saveLessonAnswer", () => {
  it("refuses a contact before any session or database call, without echoing it", async () => {
    signedInWithDiscord(MEMBER_A);
    const phone = "081-234-5678";
    const result = await saveLessonAnswer({ lessonId: L1.id, part: partOf(L1, "do_it_now"), answer: `call ${phone}` });
    expect(result).toEqual({ ok: false, error: "pii", field: "answer", kind: "phone" });
    expect(JSON.stringify(result)).not.toContain("234");
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(db.calls).toEqual([]);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("234");
  });

  it("maps SQL's own pii refusal to the field", async () => {
    signedInWithDiscord(MEMBER_A);
    mockRpc.mockResolvedValueOnce({ data: null, error: sqlError("pii", "line") });
    const result = await saveLessonAnswer({ lessonId: L1.id, part: 0, answer: "fine words" });
    expect(result).toEqual({ ok: false, error: "pii", field: "answer", kind: "line" });
  });

  it("a viewer with no Discord identity only watches, and nothing touches the database", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-2", identities: [{ provider: "google", id: "g" }] } } });
    expect(await saveLessonAnswer({ lessonId: L1.id, part: 0, answer: "an idea" })).toEqual({
      ok: false,
      error: "watch_only",
      reason: "no_discord",
    });
    mockGetUser.mockResolvedValue({ data: { user: null } });
    expect(await saveLessonAnswer({ lessonId: L1.id, part: 0, answer: "an idea" })).toMatchObject({ reason: "signed_out" });
    expect(await getLessonViewer()).toEqual({ mode: "watch", reason: "signed_out", progress: {} });
    expect(db.calls).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("a claimed viewer with no team only watches: no answer and no canvas write", async () => {
    signedInWithDiscord(NO_TEAM);
    const result = await saveLessonAnswer({ lessonId: L1.id, part: partOf(L1, "do_it_now"), answer: "an idea" });
    expect(result).toEqual({ ok: false, error: "watch_only", reason: "no_team" });
    expect(db.calls).toEqual(["rpc:elemental_web_lesson_answer"]);
    expect(db.progress).toEqual([]);
    expect(await getLessonViewer()).toMatchObject({ mode: "watch", reason: "no_team" });
  });

  it("an unclaimed Discord account only watches", async () => {
    signedInWithDiscord("9" + "5".repeat(17));
    expect(await saveLessonAnswer({ lessonId: L1.id, part: 0, answer: "an idea" })).toMatchObject({ reason: "not_claimed" });
    expect(await getLessonViewer()).toMatchObject({ mode: "watch", reason: "not_claimed" });
  });

  it("passes the edition, the viewer and whether the part finishes the lesson", async () => {
    signedInWithDiscord(MEMBER_A);
    await saveLessonAnswer({ lessonId: L1.id, part: 0, answer: "an idea", edition: "elemental-dryrun" });
    await saveLessonAnswer({ lessonId: L1.id, part: L1.parts.length - 1, edition: "somewhere-else" });
    const answers = mockRpc.mock.calls.filter(([fn]) => fn === "elemental_web_lesson_answer").map(([, a]) => a);
    expect(answers).toEqual([
      { p_edition: "elemental-dryrun", p_discord_user_id: MEMBER_A, p_lesson_id: L1.id, p_part: 0, p_answer: "an idea", p_final: false },
      { p_edition: "elemental-2026", p_discord_user_id: MEMBER_A, p_lesson_id: L1.id, p_part: L1.parts.length - 1, p_answer: null, p_final: true },
    ]);
  });

  it("finishing twice gives the team one badge", async () => {
    const last = L1.parts.length - 1;
    signedInWithDiscord(MEMBER_A);
    const first = await saveLessonAnswer({ lessonId: L1.id, part: last });
    const again = await saveLessonAnswer({ lessonId: L1.id, part: last });
    signedInWithDiscord(MEMBER_B);
    const teammate = await saveLessonAnswer({ lessonId: L1.id, part: last });
    expect(first).toMatchObject({ ok: true, final: true, finished: true, firstFinish: true, badgeAwarded: true });
    expect(again).toMatchObject({ ok: true, finished: true, firstFinish: false, badgeAwarded: false });
    expect(teammate).toMatchObject({ ok: true, finished: true, firstFinish: true, badgeAwarded: false });
    expect(db.badges).toEqual(new Set([`team-1:lesson:${L1.id}`]));
  });

  it("puts a do-it-now answer on the team canvas as a 'reference' note from the lesson", async () => {
    signedInWithDiscord(MEMBER_A);
    const part = partOf(L1, "do_it_now");
    const result = await saveLessonAnswer({ lessonId: L1.id, part, answer: "we asked three people" });
    expect(result).toMatchObject({ ok: true, canvas: "written", final: false });
    expect(writes()).toHaveLength(1);
    const [, args] = writes()[0];
    expect(args).toMatchObject({ p_guild_id: GUILD, p_entry_id: db.progress[0].id });
    const [rect, text] = args.p_elements as Note;
    expect(rect.customData).toEqual({ card: "reference", source: "lesson", createdBy: OWNER, updatedBy: OWNER });
    expect(rect.id).toBe(`el-${db.progress[0].id}-r`);
    expect(rect.frameId).toBe(FRAME);
    expect(text.containerId).toBe(rect.id);
    expect(text.originalText).toBe(`${L1.title}\nwe asked three people`);
  });

  it("saving the do-it-now part again rewrites the same note", async () => {
    signedInWithDiscord(MEMBER_A);
    const part = partOf(L2, "do_it_now");
    await saveLessonAnswer({ lessonId: L2.id, part, answer: "first try" });
    const again = await saveLessonAnswer({ lessonId: L2.id, part, answer: "second try" });
    expect(again).toMatchObject({ ok: true, canvas: "written", final: true, badgeAwarded: false });
    expect(db.board).toHaveLength(2);
    const [rect, text] = db.board as unknown as Note;
    expect(rect.version).toBe(2);
    expect(text.originalText).toBe(`${L2.title}\nsecond try`);
  });

  it("other stops and unlinked teams write no note", async () => {
    signedInWithDiscord(MEMBER_A);
    expect(await saveLessonAnswer({ lessonId: L1.id, part: partOf(L1, "question"), answer: "an idea" })).toMatchObject({ canvas: "none" });
    expect(await saveLessonAnswer({ lessonId: L1.id, part: partOf(L1, "choice"), answer: "b" })).toMatchObject({ canvas: "none" });
    db.linked.clear();
    expect(await saveLessonAnswer({ lessonId: L1.id, part: partOf(L1, "do_it_now"), answer: "an idea" })).toMatchObject({
      ok: true,
      canvas: "not_linked",
    });
    expect(writes()).toHaveLength(0);
  });

  it("a canvas failure never fails the save", async () => {
    signedInWithDiscord(MEMBER_A);
    mockRpc.mockImplementation(async (fn: string, args: Record<string, unknown>) => {
      if (fn === "elemental_web_lesson_answer") return lessonAnswer(args);
      return { data: null, error: { code: "57014", message: "canceling statement" } };
    });
    const result = await saveLessonAnswer({ lessonId: L1.id, part: partOf(L1, "do_it_now"), answer: "an idea" });
    expect(result).toMatchObject({ ok: true, canvas: "failed" });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("an idea");
  });

  it("refuses unknown lessons, parts and answers before any call", async () => {
    signedInWithDiscord(MEMBER_A);
    expect(await saveLessonAnswer({ lessonId: "nope", part: 0, answer: "x" })).toEqual({ ok: false, error: "bad_lesson" });
    expect(await saveLessonAnswer({ lessonId: L1.id, part: 40, answer: "x" })).toEqual({ ok: false, error: "bad_part" });
    expect(await saveLessonAnswer({ lessonId: L1.id, part: partOf(L1, "choice"), answer: "z" })).toEqual({ ok: false, error: "bad_answer" });
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(db.calls).toEqual([]);
  });

  it("reports an unavailable database with a code only", async () => {
    signedInWithDiscord(MEMBER_A);
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "42883", message: "function does not exist: an idea" } });
    expect(await saveLessonAnswer({ lessonId: L1.id, part: 0, answer: "an idea" })).toEqual({ ok: false, error: "unavailable" });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("an idea");
  });
});

describe("getLessonViewer", () => {
  it("returns the member's own saved parts and finished lessons, with no Discord id", async () => {
    signedInWithDiscord(MEMBER_A);
    await saveLessonAnswer({ lessonId: L2.id, part: 0, answer: "a" });
    await saveLessonAnswer({ lessonId: L2.id, part: 1, answer: "did it" });
    signedInWithDiscord(MEMBER_B);
    await saveLessonAnswer({ lessonId: L1.id, part: 0, answer: "a teammate answer" });
    signedInWithDiscord(MEMBER_A);
    const viewer = await getLessonViewer();
    expect(viewer).toEqual({
      mode: "save",
      reason: null,
      progress: {
        [L2.id]: {
          finished: true,
          parts: [
            { part: 0, answer: "a" },
            { part: 1, answer: "did it" },
          ],
        },
      },
    });
    expect(JSON.stringify(viewer)).not.toContain(MEMBER_A);
  });
});
