/**
 * The funnel pieces inside the guide shell: pixel game look, the level's page
 * key on every event, and share links that open the level (mid) or the cover
 * (outro). Outside the shell they keep the deck look (GuideOutro.test.tsx).
 */
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { GUIDE_INDEX } from "@/lib/radar-guides";
import { emptyProgress, type ProgressAction } from "@/lib/radar-guide/story";
import type { GuideTracker } from "@/lib/radar-guide/types";
import { FollowButton } from "../FollowButton";
import { GuideIntentButton, GuideOutro, GuideProgramLine } from "../GuideOutro";
import { MidShareCard } from "../MidShareCard";
import { ShareButtons } from "../ShareButtons";
import { GuideShellContext, type GuideShellValue } from "../shell/shell-context";

function makeTracker(): GuideTracker & { track: jest.Mock } {
  return { visitId: null, track: jest.fn(), submitCareerRequest: jest.fn(async () => "ok" as const) };
}

/**
 * The parts of the shell the funnel pieces read. The rest is filler, cast so
 * that fields the shell adds later do not break this test.
 */
function shell(pageKey: string, dispatch = jest.fn((_: ProgressAction) => ({}) as never)): GuideShellValue {
  const index = GUIDE_INDEX.cybersecurity;
  const value: Partial<GuideShellValue> = {
    slug: "cybersecurity",
    index,
    pageKey,
    page: index.pages.find((p) => p.key === pageKey) ?? null,
    demo: false,
    ready: true,
    reducedMotion: true,
    tracker: makeTracker(),
    attribution: null,
    progress: emptyProgress(),
    xp: {} as GuideShellValue["xp"],
    dispatch,
    registerSteps: jest.fn(),
    cursor: () => 0,
    advance: jest.fn(),
    advanceLabelTh: "ต่อ",
    markStepDone: jest.fn(),
    readyToAdvance: false,
    openMap: jest.fn(),
    sources: { open: false, focus: [] },
    openSources: jest.fn(),
    closeSources: jest.fn(),
  };
  return value as GuideShellValue;
}

function inShell(value: GuideShellValue, node: ReactNode) {
  return render(<GuideShellContext.Provider value={value}>{node}</GuideShellContext.Provider>);
}

const pages = GUIDE_INDEX.cybersecurity.pages.map((p) => p.key);
const midPage = pages[Math.min(4, pages.length - 1)];
const lastPage = pages[pages.length - 1];

test("the mid-run card is a pixel panel that shares the level the student is on", () => {
  const tracker = makeTracker();
  const { container } = inShell(
    shell(midPage),
    <MidShareCard fieldSlug="cybersecurity" fieldNameTh="ไซเบอร์" uaApp="instagram" utmSource={null} tracker={tracker} />
  );
  expect(container.querySelector(".rgf-panel")).not.toBeNull();
  expect(container.querySelector(".radar-guide-card")).toBeNull();
  const line = screen.getByRole("link", { name: "ส่งใน LINE" });
  expect(decodeURIComponent(line.getAttribute("href") ?? "")).toContain(
    `/radar/cybersecurity/${midPage}?utm_source=share&utm_medium=share&utm_campaign=radar&utm_content=cybersecurity-${midPage}`
  );
  fireEvent.click(line);
  expect(tracker.track).toHaveBeenCalledWith({
    type: "share_click",
    pageKey: midPage,
    target: "line",
    metadata: { placement: "mid" },
  });
  fireEvent.click(screen.getByRole("link", { name: /ติดตาม/ }));
  expect(tracker.track).toHaveBeenLastCalledWith(
    expect.objectContaining({ type: "follow_click", pageKey: midPage, target: "instagram" })
  );
});

test("outro share lands a friend on the cover, and every event carries the page key", () => {
  const tracker = makeTracker();
  const { container } = inShell(
    shell(lastPage),
    <GuideOutro fieldSlug="cybersecurity" fieldNameTh="ไซเบอร์" tracker={tracker} uaApp={null} utmSource={null} />
  );
  expect(container.querySelector(".radar-guide-outro")).toBeNull();
  const href = decodeURIComponent(screen.getByRole("link", { name: "ส่งใน LINE" }).getAttribute("href") ?? "");
  expect(href).toContain("/radar/cybersecurity?utm_source=share");
  expect(href).not.toContain(`/radar/cybersecurity/${lastPage}`);

  const other = screen.getAllByRole("link").find((a) => a.getAttribute("data-demo")?.startsWith("other-"));
  expect(other).toBeDefined();
  fireEvent.click(other!);
  expect(tracker.track).toHaveBeenLastCalledWith(
    expect.objectContaining({ type: "cta_click", pageKey: lastPage, target: "other-career" })
  );
  // No 1:1 channel anywhere in the outro.
  expect(container.textContent).not.toMatch(/นัดคุย|ทักมาคุย|แชทส่วนตัว|QR/);
});

test("the intent choice is three-way and saved to progress", () => {
  const tracker = makeTracker();
  const dispatch = jest.fn((_: ProgressAction) => ({}) as never);
  const onIntent = jest.fn();
  inShell(shell(lastPage, dispatch), <GuideIntentButton tracker={tracker} onIntent={onIntent} />);
  fireEvent.click(screen.getByRole("button", { name: "ไม่ใช่ฉัน" }));
  expect(tracker.track).toHaveBeenCalledWith({
    type: "interactive_tap",
    pageKey: lastPage,
    target: `${lastPage}:intent-no`,
  });
  expect(dispatch).toHaveBeenCalledWith({ type: "choice", key: `${lastPage}:intent`, value: "no" });
  expect(onIntent).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /สนใจสายนี้/ }));
  expect(tracker.track).toHaveBeenCalledWith({ type: "cta_click", pageKey: lastPage, target: "intent" });
  expect(screen.getByRole("button", { name: /บันทึกแล้ว/ })).toBeDisabled();
});

test("the program line and an explicit look prop", () => {
  const tracker = makeTracker();
  inShell(shell(lastPage), <GuideProgramLine tracker={tracker} lineTh="SHIFT เปิดรับ" linkLabelTh="ดู SHIFT" href="/shift" />);
  fireEvent.click(screen.getByRole("link", { name: /ดู SHIFT/ }));
  expect(tracker.track).toHaveBeenCalledWith({ type: "cta_click", pageKey: lastPage, target: "program" });

  // `look="deck"` wins over the shell.
  const { container } = inShell(
    shell(lastPage),
    <ShareButtons fieldSlug="cybersecurity" fieldNameTh={null} uaApp={null} tracker={tracker} look="deck" />
  );
  expect(container.querySelector(".radar-guide-share")).not.toBeNull();
  expect(container.querySelector(".rgf-share")).toBeNull();
});

test("outside the shell nothing gets a page key", () => {
  const tracker = makeTracker();
  render(<FollowButton uaApp={null} utmSource={null} tracker={tracker} />);
  fireEvent.click(screen.getByRole("link", { name: /ติดตาม/ }));
  expect(tracker.track.mock.calls[0][0]).not.toHaveProperty("pageKey");
});
