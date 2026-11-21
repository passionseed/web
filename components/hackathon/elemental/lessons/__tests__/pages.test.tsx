import { render, screen } from "@testing-library/react";

import type { LessonViewer } from "@/lib/elemental/web/learn-actions";
import { LESSONS } from "@/lib/elemental/web/lessons";

const mockViewer = jest.fn<Promise<LessonViewer>, [{ edition?: string } | undefined]>();
jest.mock("@/lib/elemental/web/learn-actions", () => ({
  getLessonViewer: (input?: { edition?: string }) => mockViewer(input),
  saveLessonAnswer: jest.fn(),
}));
jest.mock("@/lib/supabase/elemental", () => ({
  ELEMENTAL_EVENT_EDITION: "elemental-2026",
  resolvePublicEdition: (v: unknown) => (v === "elemental-dryrun" ? v : "elemental-2026"),
}));
jest.mock("@/components/hackathon/elemental/fonts", () => ({ trirong: { variable: "font-trirong" } }));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({ auth: { signInWithOAuth: jest.fn(), signOut: jest.fn() } }) }));
const mockNotFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
jest.mock("next/navigation", () => ({ notFound: () => mockNotFound() }));

import LessonPage, { dynamic as lessonDynamic, generateMetadata } from "@/app/hackathon/island/learn/[lessonId]/page";
import LearnPage, { dynamic, metadata } from "@/app/hackathon/island/learn/page";

const WATCH: LessonViewer = { mode: "watch", reason: "signed_out", progress: {} };

beforeEach(() => {
  mockViewer.mockReset().mockResolvedValue(WATCH);
  mockNotFound.mockClear();
});

describe("/hackathon/island/learn", () => {
  it("is read at request time and kept out of search", async () => {
    expect(dynamic).toBe("force-dynamic");
    expect(lessonDynamic).toBe("force-dynamic");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    const meta = await generateMetadata({ params: Promise.resolve({ lessonId: LESSONS[0].id }) });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("lists every lesson for the event edition by default", async () => {
    render(await LearnPage({ searchParams: Promise.resolve({}) }));
    expect(mockViewer).toHaveBeenCalledWith({ edition: "elemental-2026" });
    for (const lesson of LESSONS) {
      expect(screen.getByRole("link", { name: new RegExp(lesson.title.replace(/[()]/g, "\\$&")) })).toHaveAttribute(
        "href",
        `/hackathon/island/learn/${lesson.id}`,
      );
    }
  });

  it("keeps the rehearsal edition on every link", async () => {
    render(await LearnPage({ searchParams: Promise.resolve({ edition: "elemental-dryrun" }) }));
    expect(mockViewer).toHaveBeenCalledWith({ edition: "elemental-dryrun" });
    expect(screen.getByRole("link", { name: new RegExp(LESSONS[0].title.replace(/[()]/g, "\\$&")) })).toHaveAttribute(
      "href",
      `/hackathon/island/learn/${LESSONS[0].id}?edition=elemental-dryrun`,
    );
  });

  it("opens a lesson's first part", async () => {
    render(
      await LessonPage({ params: Promise.resolve({ lessonId: LESSONS[0].id }), searchParams: Promise.resolve({}) }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(LESSONS[0].title);
    expect(screen.getByTestId("lesson-part")).toHaveAttribute("data-part", "0");
  });

  it("is a 404 for an unknown lesson, with no viewer read", async () => {
    await expect(
      LessonPage({ params: Promise.resolve({ lessonId: "nope" }), searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockViewer).not.toHaveBeenCalled();
  });
});
