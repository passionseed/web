import { act, fireEvent, render, screen } from "@testing-library/react";
import { CONTACT } from "@/lib/content/pathlab-page";
import type { GuideTracker } from "@/lib/radar-guide/types";
import { FollowButton } from "../FollowButton";
import { ShareButtons } from "../ShareButtons";

function makeTracker(): GuideTracker & { track: jest.Mock } {
  return { visitId: null, track: jest.fn(), submitCareerRequest: jest.fn(async () => "ok" as const) };
}

const SHARE_URL =
  "https://passionseed.org/radar/cybersecurity?utm_source=share&utm_medium=share&utm_campaign=radar&utm_content=cybersecurity";

const nav = navigator as Navigator & { share?: unknown; canShare?: unknown; clipboard?: unknown };
const originalShare = nav.share;
const originalCanShare = nav.canShare;
const originalClipboard = nav.clipboard;

function mockNavigator({
  share,
  canShare,
  writeText,
}: {
  share?: jest.Mock;
  canShare?: jest.Mock;
  writeText?: jest.Mock;
}) {
  Object.defineProperty(navigator, "share", { value: share, configurable: true, writable: true });
  Object.defineProperty(navigator, "canShare", { value: canShare, configurable: true, writable: true });
  Object.defineProperty(navigator, "clipboard", {
    value: writeText ? { writeText } : undefined,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  Object.defineProperty(navigator, "share", { value: originalShare, configurable: true, writable: true });
  Object.defineProperty(navigator, "canShare", { value: originalCanShare, configurable: true, writable: true });
  Object.defineProperty(navigator, "clipboard", { value: originalClipboard, configurable: true, writable: true });
});

describe("ShareButtons", () => {
  test("navigator.share is not used in Instagram's in-app browser", () => {
    const share = jest.fn(async () => undefined);
    mockNavigator({ share, canShare: jest.fn(() => true) });
    render(
      <ShareButtons fieldSlug="cybersecurity" fieldNameTh="นักความปลอดภัยไซเบอร์" uaApp="instagram" tracker={makeTracker()} />
    );
    expect(screen.getByRole("link", { name: "ส่งใน LINE" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /คัดลอกลิงก์/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ส่งให้เพื่อน/ })).toBeNull();
  });

  test("navigator.share replaces the buttons when canShare is true elsewhere", async () => {
    const share = jest.fn(async () => undefined);
    mockNavigator({ share, canShare: jest.fn(() => true) });
    const tracker = makeTracker();
    render(<ShareButtons fieldSlug="cybersecurity" fieldNameTh={null} uaApp="line" tracker={tracker} />);
    const button = await screen.findByRole("button", { name: /ส่งให้เพื่อน/ });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: SHARE_URL }));
    expect(tracker.track).toHaveBeenCalledWith(expect.objectContaining({ type: "share_click", target: "native" }));
  });

  test("no native share when canShare is missing", () => {
    mockNavigator({ share: jest.fn() });
    render(<ShareButtons fieldSlug="cybersecurity" fieldNameTh={null} uaApp={null} tracker={makeTracker()} />);
    expect(screen.getByRole("link", { name: "ส่งใน LINE" })).toBeInTheDocument();
  });

  test("the LINE link carries the share URL and fires share_click line", () => {
    mockNavigator({});
    const tracker = makeTracker();
    render(<ShareButtons fieldSlug="cybersecurity" fieldNameTh={null} uaApp="instagram" tracker={tracker} placement="mid" />);
    const link = screen.getByRole("link", { name: "ส่งใน LINE" });
    expect(decodeURIComponent(link.getAttribute("href")!.split("text=")[1])).toContain(SHARE_URL);
    fireEvent.click(link);
    expect(tracker.track).toHaveBeenCalledWith({
      type: "share_click",
      chapterKey: undefined,
      target: "line",
      metadata: { placement: "mid" },
    });
  });

  test("copy success shows คัดลอกแล้ว", async () => {
    const writeText = jest.fn(async () => undefined);
    mockNavigator({ writeText });
    const tracker = makeTracker();
    render(<ShareButtons fieldSlug="cybersecurity" fieldNameTh={null} uaApp="instagram" tracker={tracker} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /คัดลอกลิงก์/ }));
    });
    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
    expect(screen.getByRole("button", { name: /คัดลอกแล้ว/ })).toBeInTheDocument();
    expect(tracker.track).toHaveBeenCalledWith(expect.objectContaining({ target: "copy" }));
  });

  test("copy failure shows a selectable field with the link", async () => {
    const writeText = jest.fn(async () => {
      throw new Error("denied");
    });
    mockNavigator({ writeText });
    render(<ShareButtons fieldSlug="cybersecurity" fieldNameTh={null} uaApp="instagram" tracker={makeTracker()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /คัดลอกลิงก์/ }));
    });
    const field = screen.getByRole("textbox", { name: "ลิงก์หน้านี้" });
    expect(field).toHaveValue(SHARE_URL);
    expect(field).toHaveAttribute("readOnly");
  });

  test("no clipboard API also falls back to the field", async () => {
    mockNavigator({});
    render(<ShareButtons fieldSlug="cybersecurity" fieldNameTh={null} uaApp="instagram" tracker={makeTracker()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /คัดลอกลิงก์/ }));
    });
    expect(screen.getByRole("textbox", { name: "ลิงก์หน้านี้" })).toHaveValue(SHARE_URL);
  });
});

describe("FollowButton", () => {
  const tiktokUrl = "https://www.tiktok.com/@example";

  test("TikTok visitors get the TikTok link when it is set", () => {
    const tracker = makeTracker();
    render(<FollowButton uaApp="tiktok" utmSource={null} tracker={tracker} tiktokUrl={tiktokUrl} />);
    const link = screen.getByRole("link", { name: /ติดตามใน TikTok/ });
    expect(link).toHaveAttribute("href", tiktokUrl);
    fireEvent.click(link);
    expect(tracker.track).toHaveBeenCalledWith(expect.objectContaining({ type: "follow_click", target: "tiktok" }));
  });

  test("a tiktok-* last touch counts as a TikTok visitor", () => {
    render(<FollowButton uaApp="other" utmSource="tiktok-alias" tracker={makeTracker()} tiktokUrl={tiktokUrl} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", tiktokUrl);
  });

  test("TikTok visitors get the IG link while the TikTok URL is unset", () => {
    render(<FollowButton uaApp="tiktok" utmSource="tiktok-bio" tracker={makeTracker()} tiktokUrl={null} />);
    expect(screen.getByRole("link", { name: /ติดตาม @passion_seed.th/ })).toHaveAttribute("href", CONTACT.href);
  });

  test("everyone else follows the IG account", () => {
    const tracker = makeTracker();
    render(<FollowButton uaApp="instagram" utmSource="ig-comment-dm" tracker={tracker} tiktokUrl={tiktokUrl} />);
    const link = screen.getByRole("link", { name: "ติดตาม @passion_seed.th จะได้ไม่พลาดอาชีพถัดไป" });
    expect(link).toHaveAttribute("href", CONTACT.href);
    fireEvent.click(link);
    expect(tracker.track).toHaveBeenCalledWith(expect.objectContaining({ type: "follow_click", target: "instagram" }));
  });
});
