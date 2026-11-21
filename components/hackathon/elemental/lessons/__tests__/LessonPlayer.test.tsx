import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import type { LessonSaveInput, LessonSaveResult, LessonViewer } from "@/lib/elemental/web/learn-actions";
import type { Lesson } from "@/lib/elemental/web/lessons";

const mockSave = jest.fn<Promise<LessonSaveResult>, [LessonSaveInput]>();
jest.mock("@/lib/elemental/web/learn-actions", () => ({
  saveLessonAnswer: (input: LessonSaveInput) => mockSave(input),
  getLessonViewer: jest.fn(),
}));

const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth: mockSignIn, signOut: mockSignOut } }),
}));

import { CANVAS_COPY, LEARN_COPY, WATCH_REASON_COPY } from "../copy";
import { LessonPlayer } from "../LessonPlayer";

/** A fixture lesson: a question, a choice, a do-it-now, then a wrap-up with no stop. */
const LESSON: Lesson = {
  id: "fixture-lesson",
  title: "Fixture lesson",
  parts: [
    { title: "Part one", youtubeId: "abcdefghijk", stop: { kind: "question", prompt: "What did you notice?" } },
    {
      title: "Part two",
      youtubeId: null,
      stop: {
        kind: "choice",
        prompt: "Pick one",
        options: [
          { id: "a", label: "Option A" },
          { id: "b", label: "Option B" },
        ],
      },
    },
    { title: "Part three", youtubeId: null, stop: { kind: "do_it_now", prompt: "Try it now" } },
    { title: "Wrap up", youtubeId: null, stop: null },
  ],
};

/** A one-part lesson whose only part ends in a choice: answering it finishes the lesson. */
const SHORT: Lesson = {
  id: "fixture-short",
  title: "Short lesson",
  parts: [
    {
      title: "Only part",
      youtubeId: null,
      stop: {
        kind: "choice",
        prompt: "Pick",
        options: [
          { id: "x", label: "X" },
          { id: "y", label: "Y" },
        ],
      },
    },
  ],
};

const SAVER: LessonViewer = { mode: "save", reason: null, progress: {} };
const watcher = (reason: LessonViewer["reason"]): LessonViewer => ({ mode: "watch", reason, progress: {} });

type Saved = Extract<LessonSaveResult, { ok: true }>;

function ok(part: number, extra: Partial<Saved> = {}): Saved {
  return {
    ok: true,
    lessonId: LESSON.id,
    part,
    final: false,
    finished: false,
    firstFinish: false,
    badgeAwarded: false,
    canvas: "none",
    ...extra,
  };
}

function renderPlayer(viewer: LessonViewer, lesson: Lesson = LESSON, edition = "elemental-2026") {
  return render(
    <LessonPlayer lesson={lesson} viewer={viewer} edition={edition} listHref="/hackathon/island/learn" islandHref="/hackathon/island" />,
  );
}

function partButton(n: number): HTMLButtonElement {
  return within(screen.getByTestId("lesson-parts")).getAllByRole("button")[n - 1] as HTMLButtonElement;
}

function shownPart(): number {
  return Number(screen.getByTestId("lesson-part").getAttribute("data-part"));
}

beforeEach(() => {
  mockSave.mockReset();
  mockSignIn.mockReset().mockResolvedValue({ error: null });
  mockSignOut.mockReset().mockResolvedValue({ error: null });
});

describe("LessonPlayer, saving", () => {
  it("keeps part 2 locked until part 1 is answered, then opens it", async () => {
    mockSave.mockResolvedValueOnce(ok(0));
    renderPlayer(SAVER);

    expect(shownPart()).toBe(0);
    expect(partButton(2)).toBeDisabled();
    expect(partButton(2)).toHaveTextContent(LEARN_COPY.partLocked);
    expect(screen.getByRole("button", { name: LEARN_COPY.nextPart })).toBeDisabled();
    expect(screen.getByText(LEARN_COPY.nextLocked)).toBeInTheDocument();

    // Clicking a locked part does nothing.
    fireEvent.click(partButton(2));
    expect(shownPart()).toBe(0);

    fireEvent.change(screen.getByLabelText("What did you notice?"), { target: { value: "  It rained  " } });
    fireEvent.click(screen.getByRole("button", { name: LEARN_COPY.save }));

    await waitFor(() => expect(shownPart()).toBe(1));
    expect(mockSave).toHaveBeenCalledWith({ lessonId: LESSON.id, part: 0, answer: "It rained", edition: "elemental-2026" });
    expect(partButton(1)).toHaveTextContent(LEARN_COPY.partDone);
    expect(partButton(2)).toBeEnabled();
    expect(partButton(3)).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(LEARN_COPY.saved(1));
  });

  it("will not save an empty answer", () => {
    renderPlayer(SAVER);
    expect(screen.getByRole("button", { name: LEARN_COPY.save })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("What did you notice?"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: LEARN_COPY.save })).toBeDisabled();
  });

  it("saves a choice as its option id", async () => {
    mockSave.mockResolvedValueOnce(ok(1));
    renderPlayer({ mode: "save", reason: null, progress: { [LESSON.id]: { parts: [{ part: 0, answer: "x" }], finished: false } } });
    expect(shownPart()).toBe(1);
    fireEvent.click(screen.getByLabelText("Option B"));
    fireEvent.click(screen.getByRole("button", { name: LEARN_COPY.save }));
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ part: 1, answer: "b" })));
    await waitFor(() => expect(shownPart()).toBe(2));
  });

  it("sends the edition it was given", async () => {
    mockSave.mockResolvedValueOnce(ok(0));
    renderPlayer(SAVER, LESSON, "elemental-dryrun");
    fireEvent.change(screen.getByLabelText("What did you notice?"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: LEARN_COPY.save }));
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ edition: "elemental-dryrun" })));
  });

  it("re-opens the form on a contact, without quoting it, and keeps the next part locked", async () => {
    mockSave.mockResolvedValueOnce({ ok: false, error: "pii", field: "answer", kind: "phone" });
    renderPlayer(SAVER);
    const field = screen.getByLabelText("What did you notice?");
    fireEvent.change(field, { target: { value: "call 0812345678" } });
    fireEvent.click(screen.getByRole("button", { name: LEARN_COPY.save }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(LEARN_COPY.errorPii);
    expect(alert.textContent).not.toContain("0812345678");
    expect(field).toHaveValue("call 0812345678");
    expect(field).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(field).toHaveFocus());
    expect(shownPart()).toBe(0);
    expect(partButton(2)).toBeDisabled();
  });

  it("shows a retry line when the database is down, and when the request itself fails", async () => {
    mockSave.mockResolvedValueOnce({ ok: false, error: "unavailable" }).mockRejectedValueOnce(new Error("offline"));
    renderPlayer(SAVER);
    fireEvent.change(screen.getByLabelText("What did you notice?"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: LEARN_COPY.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent(LEARN_COPY.errorUnavailable);
    fireEvent.click(screen.getByRole("button", { name: LEARN_COPY.save }));
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("alert")).toHaveTextContent(LEARN_COPY.errorUnavailable);
    expect(shownPart()).toBe(0);
  });

  it("switches to watch only when the server says so", async () => {
    mockSave.mockResolvedValueOnce({ ok: false, error: "watch_only", reason: "no_team" });
    renderPlayer(SAVER);
    fireEvent.change(screen.getByLabelText("What did you notice?"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: LEARN_COPY.save }));
    expect(await screen.findByText(LEARN_COPY.watchOnly)).toBeInTheDocument();
    expect(screen.getByText(WATCH_REASON_COPY.no_team)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("says where a do-it-now answer went", async () => {
    mockSave.mockResolvedValueOnce(ok(2, { canvas: "not_linked" }));
    renderPlayer({
      mode: "save",
      reason: null,
      progress: { [LESSON.id]: { parts: [{ part: 0, answer: "x" }, { part: 1, answer: "a" }], finished: false } },
    });
    expect(shownPart()).toBe(2);
    expect(screen.getByText(LEARN_COPY.doItNowHint)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Try it now"), { target: { value: "Asked three friends" } });
    fireEvent.click(screen.getByRole("button", { name: LEARN_COPY.save }));
    await waitFor(() => expect(shownPart()).toBe(3));
    expect(screen.getByRole("status")).toHaveTextContent(CANVAS_COPY.not_linked);
  });

  it("resumes at the last part and finishes the lesson with no answer", async () => {
    mockSave.mockResolvedValueOnce(ok(3, { final: true, finished: true, firstFinish: true, badgeAwarded: true }));
    renderPlayer({
      mode: "save",
      reason: null,
      progress: {
        [LESSON.id]: { parts: [{ part: 0, answer: "x" }, { part: 1, answer: "a" }, { part: 2, answer: "y" }], finished: false },
      },
    });
    expect(shownPart()).toBe(3);
    expect(screen.queryByRole("button", { name: LEARN_COPY.nextPart })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: LEARN_COPY.finish }));

    const finish = await screen.findByTestId("lesson-finish");
    expect(mockSave).toHaveBeenCalledWith({ lessonId: LESSON.id, part: 3, edition: "elemental-2026" });
    expect(mockSave.mock.calls[0][0]).not.toHaveProperty("final");
    expect(within(finish).getByRole("heading", { level: 1 })).toHaveTextContent(LEARN_COPY.finishedTitle);
    expect(finish).toHaveTextContent(LEARN_COPY.badgeAwarded);
    expect(within(finish).getByRole("link", { name: LEARN_COPY.backToList })).toHaveAttribute("href", "/hackathon/island/learn");

    fireEvent.click(within(finish).getByRole("button", { name: LEARN_COPY.watchAgain }));
    expect(shownPart()).toBe(0);
    // Watching again says the lesson is already finished, and every part stays open.
    expect(screen.getByText(LEARN_COPY.finishedBefore)).toBeInTheDocument();
    for (const n of [1, 2, 3, 4]) expect(partButton(n)).toBeEnabled();
  });

  it("finishes a lesson whose last part is a stop, and says when the badge was already earned", async () => {
    mockSave.mockResolvedValueOnce({ ...ok(0, { final: true, finished: true }), lessonId: SHORT.id });
    renderPlayer(SAVER, SHORT);
    fireEvent.click(screen.getByLabelText("Y"));
    fireEvent.click(screen.getByRole("button", { name: LEARN_COPY.save }));
    const finish = await screen.findByTestId("lesson-finish");
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ lessonId: SHORT.id, part: 0, answer: "y" }));
    expect(finish).toHaveTextContent(LEARN_COPY.badgeKept);
  });

  it("opens a saved answer for editing", () => {
    renderPlayer({ mode: "save", reason: null, progress: { [LESSON.id]: { parts: [{ part: 0, answer: "First go" }], finished: false } } });
    fireEvent.click(partButton(1));
    expect(screen.getByLabelText("What did you notice?")).toHaveValue("First go");
    expect(screen.getByRole("button", { name: LEARN_COPY.saveAgain })).toBeEnabled();
  });
});

describe("LessonPlayer, clips", () => {
  it("embeds one youtube-nocookie clip at a time and a placeholder for a TODO clip", () => {
    renderPlayer(watcher("signed_out"));
    const frames = document.querySelectorAll("iframe");
    expect(frames).toHaveLength(1);
    expect(frames[0].getAttribute("src")).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/abcdefghijk\?/);

    fireEvent.click(screen.getByRole("button", { name: LEARN_COPY.nextPart }));
    expect(document.querySelectorAll("iframe")).toHaveLength(0);
    expect(within(screen.getByTestId("lesson-clip")).getByText(LEARN_COPY.clipTodo)).toBeInTheDocument();
  });
});

describe("LessonPlayer, watching", () => {
  it("tells a signed-out viewer it is watch only, offers Discord, and never saves", async () => {
    renderPlayer(watcher("signed_out"));
    const banner = screen.getByTestId("viewer-mode");
    expect(banner).toHaveAttribute("data-mode", "watch");
    expect(within(banner).getByText(LEARN_COPY.watchOnly)).toBeInTheDocument();
    expect(within(banner).getByText(WATCH_REASON_COPY.signed_out)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText(LEARN_COPY.watchStopNote)).toBeInTheDocument();
    // Every part is open to watch.
    for (const n of [1, 2, 3, 4]) expect(partButton(n)).toBeEnabled();
    fireEvent.click(partButton(4));
    expect(shownPart()).toBe(3);
    expect(screen.queryByRole("button", { name: LEARN_COPY.finish })).not.toBeInTheDocument();

    fireEvent.click(within(banner).getByRole("button", { name: LEARN_COPY.signIn }));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
    const request = mockSignIn.mock.calls[0][0];
    expect(request.provider).toBe("discord");
    const redirect = new URL(request.options.redirectTo);
    expect(redirect.pathname).toBe("/auth/callback");
    expect(redirect.searchParams.get("next")).toBe("/hackathon/island/learn");
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("tells a viewer signed in without Discord it is watch only and offers to switch", async () => {
    renderPlayer(watcher("no_discord"));
    const banner = screen.getByTestId("viewer-mode");
    expect(within(banner).getByText(LEARN_COPY.watchOnly)).toBeInTheDocument();
    fireEvent.click(within(banner).getByRole("button", { name: LEARN_COPY.switchToDiscord }));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mockSignIn.mock.calls[0][0].options.queryParams).toEqual({ prompt: "consent" });
  });

  it.each(["not_claimed", "no_team", "unavailable"] as const)("shows watch only with no sign-in button for %s", (reason) => {
    renderPlayer(watcher(reason));
    const banner = screen.getByTestId("viewer-mode");
    expect(within(banner).getByText(LEARN_COPY.watchOnly)).toBeInTheDocument();
    expect(within(banner).getByText(WATCH_REASON_COPY[reason])).toBeInTheDocument();
    expect(within(banner).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the save mode line, not watch only, to a member on a team", () => {
    renderPlayer(SAVER);
    expect(screen.getByTestId("viewer-mode")).toHaveAttribute("data-mode", "save");
    expect(screen.queryByText(LEARN_COPY.watchOnly)).not.toBeInTheDocument();
  });

  it("never renders a Discord id or the word member", () => {
    const { container } = renderPlayer(SAVER);
    expect(container.textContent).not.toMatch(/\d{17,}/);
    expect(container.innerHTML).not.toMatch(/member/i);
  });
});
