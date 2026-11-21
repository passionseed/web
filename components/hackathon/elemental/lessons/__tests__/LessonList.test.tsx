import { render, screen, within } from "@testing-library/react";

import type { LessonViewer } from "@/lib/elemental/web/learn-actions";
import type { Lesson } from "@/lib/elemental/web/lessons";

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({ auth: { signInWithOAuth: jest.fn(), signOut: jest.fn() } }) }));

import { LEARN_COPY } from "../copy";
import { LessonList } from "../LessonList";

const q = { kind: "question" as const, prompt: "q" };
const LESSONS: Lesson[] = [
  { id: "one", title: "Lesson one", parts: [{ title: "a", youtubeId: null, stop: q }, { title: "b", youtubeId: null, stop: null }] },
  { id: "two", title: "Lesson two", parts: [{ title: "a", youtubeId: null, stop: q }, { title: "b", youtubeId: null, stop: q }] },
  { id: "three", title: "Lesson three", parts: [{ title: "a", youtubeId: null, stop: q }] },
];

function renderList(viewer: LessonViewer) {
  render(<LessonList lessons={LESSONS} viewer={viewer} lessonHref={(id) => `/l/${id}`} islandHref="/hackathon/island" />);
}

describe("LessonList", () => {
  it("shows each lesson with the viewer's own progress", () => {
    renderList({
      mode: "save",
      reason: null,
      progress: {
        one: { parts: [{ part: 0, answer: "x" }, { part: 1, answer: null }], finished: true },
        two: { parts: [{ part: 0, answer: "x" }], finished: false },
      },
    });
    const cards = within(screen.getByTestId("lesson-list")).getAllByRole("link");
    expect(cards.map((c) => c.getAttribute("href"))).toEqual(["/l/one", "/l/two", "/l/three"]);
    expect(cards[0]).toHaveTextContent(LEARN_COPY.statusFinished);
    expect(cards[1]).toHaveTextContent(LEARN_COPY.statusProgress(1, 2));
    expect(cards[2]).toHaveTextContent(LEARN_COPY.statusNew);
    expect(screen.getByTestId("viewer-mode")).toHaveAttribute("data-mode", "save");
  });

  it("tells an unlinked viewer it is watch only", () => {
    renderList({ mode: "watch", reason: "no_discord", progress: {} });
    const banner = screen.getByTestId("viewer-mode");
    expect(banner).toHaveAttribute("data-mode", "watch");
    expect(within(banner).getByText(LEARN_COPY.watchOnly)).toBeInTheDocument();
    expect(within(banner).getByRole("button", { name: LEARN_COPY.switchToDiscord })).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(LEARN_COPY.statusNew))).toHaveLength(3);
  });

  it("links back to the island", () => {
    renderList({ mode: "watch", reason: "signed_out", progress: {} });
    expect(screen.getByRole("link", { name: LEARN_COPY.toIsland })).toHaveAttribute("href", "/hackathon/island");
  });
});
