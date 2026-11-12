import { act, fireEvent, render, screen } from "@testing-library/react";
import type { GuideIndexPage } from "@/lib/radar-guide/guide-types";
import { emptyProgress, type BadgeDef, type ProfileCard as ProfileCardData } from "@/lib/radar-guide/story";
import { BadgeToast } from "../BadgeToast";
import { Cutscene } from "../Cutscene";
import { DialogueBox } from "../DialogueBox";
import { LevelMap } from "../LevelMap";
import { PixelScene } from "../PixelScene";
import { ProfileCard } from "../ProfileCard";
import { XpBar } from "../XpBar";
import { dismissBadge, enqueueBadges } from "../useGuideProgress";

jest.mock("html-to-image", () => ({ toBlob: jest.fn(async () => new Blob(["png"], { type: "image/png" })) }));

const PAGES: GuideIndexPage[] = [
  { key: "mythos", order: 1, titleTh: "ด่านหนึ่ง", navLabelTh: "หนึ่ง", minutes: 2, games: 1, cutscene: true },
  { key: "doors", order: 2, titleTh: "ด่านสอง", navLabelTh: "สอง", minutes: 2, games: 0 },
  { key: "triage", order: 3, titleTh: "ด่านสาม", navLabelTh: "สาม", minutes: 1 },
];

const BADGE: BadgeDef = { id: "mythos", nameTh: "ตาไวกว่าบั๊ก", descTh: "ผ่านด่านแรก", icon: "bug", trigger: { on: "clear", pageKey: "mythos" } };

describe("DialogueBox", () => {
  it("types, finishes on tap, advances, and calls onDone once", () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    render(<DialogueBox speaker="host" lines={["บรรทัดแรก", "บรรทัดสอง"]} onDone={onDone} />);
    const box = screen.getByRole("button");
    expect(box).toHaveAccessibleName("แสดงทั้งประโยค");
    fireEvent.click(box); // finish typing
    expect(box).toHaveAccessibleName("อ่านต่อ");
    fireEvent.click(box); // next box
    expect(screen.getByText("2/2")).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(2000); // types to the end by itself
    });
    expect(box).toHaveAccessibleName("จบบทพูด");
    fireEvent.click(box);
    expect(onDone).toHaveBeenCalledTimes(1);
    fireEvent.click(box);
    expect(onDone).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it("shows whole boxes under reduced motion and names the speaker", () => {
    render(<DialogueBox speaker="player" lines={["ฉันพร้อม"]} reducedMotion />);
    expect(screen.getByText("เธอ")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAccessibleName("จบบทพูด");
    expect(screen.getAllByText("ฉันพร้อม").length).toBeGreaterThan(0);
  });

  it("draws the host NPC only for host lines", () => {
    const { container, rerender } = render(<DialogueBox speaker="host" lines={["สวัสดี"]} reducedMotion />);
    expect(container.querySelector(".rgs-npc")).not.toBeNull();
    rerender(<DialogueBox speaker="system" lines={["หมายเหตุ"]} reducedMotion />);
    expect(container.querySelector(".rgs-npc")).toBeNull();
  });

  it("reads on from an outside signal, and with doneWhenRead finishes once the last box shows", () => {
    const onDone = jest.fn();
    const box = (signal: number) => (
      <DialogueBox speaker="host" lines={["หนึ่ง", "สอง"]} reducedMotion advanceSignal={signal} doneWhenRead onDone={onDone} />
    );
    const { rerender } = render(box(4)); // the value it mounts with is ignored
    expect(screen.getByRole("button")).toHaveTextContent("1/2");
    rerender(box(5));
    expect(screen.getByRole("button")).toHaveTextContent("2/2");
    expect(onDone).toHaveBeenCalledTimes(1);
    rerender(box(6));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe("Cutscene", () => {
  const base = { hookTh: "ฉากพิเศษ", scriptLinesTh: ["บรรทัดหนึ่ง", "บรรทัดสอง"], reducedMotion: true };

  it("renders nothing while closed", () => {
    render(<Cutscene {...base} open={false} media={null} onDone={jest.fn()} />);
    expect(screen.queryByTestId("cutscene")).toBeNull();
  });

  it("falls back to the host saying the script when there is no clip", () => {
    const onDone = jest.fn();
    render(<Cutscene {...base} open media={null} onDone={onDone} />);
    expect(screen.getByRole("dialog")).toHaveAccessibleName("ฉากพิเศษ");
    const box = screen.getByTestId("dialogue").querySelector("button") as HTMLButtonElement;
    fireEvent.click(box);
    fireEvent.click(box);
    expect(onDone).toHaveBeenCalledWith("watched");
  });

  it("skips with the skip button or Escape, once", () => {
    const onDone = jest.fn();
    render(<Cutscene {...base} open media={null} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "ข้าม ▶▶" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith("skipped");
  });

  it("starts the video with sound on tap, shows captions, and reports watched at the end", async () => {
    const play = jest.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
      return Promise.resolve();
    });
    jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const onDone = jest.fn();
    const onEvent = jest.fn();
    render(
      <Cutscene
        {...base}
        open
        media={{ videoUrl: "https://cdn.passionseed.org/radar/guide/cybersecurity/mythos.abcdef12.mp4", posterUrl: "https://cdn.passionseed.org/p.webp" }}
        cues={[{ start: 0, end: 2, text: "คำบรรยาย" }]}
        onDone={onDone}
        onEvent={onEvent}
      />
    );
    const video = screen.getByTestId("cutscene-video") as HTMLVideoElement;
    expect(video).toHaveAttribute("playsinline");
    fireEvent.click(screen.getByRole("button", { name: /แตะเพื่อดู/ }));
    expect(play).toHaveBeenCalled();
    expect(video.muted).toBe(false);
    await act(async () => {});
    fireEvent.playing(video);
    fireEvent.timeUpdate(video);
    expect(screen.getByTestId("cutscene-cue")).toHaveTextContent("คำบรรยาย");
    fireEvent.ended(video);
    expect(onDone).toHaveBeenCalledWith("watched");
    expect(onEvent).toHaveBeenCalledWith("play", expect.anything());
    expect(onEvent).toHaveBeenCalledWith("complete", expect.anything());
    jest.restoreAllMocks();
  });

  it("switches to the host dialogue when the video errors", () => {
    render(<Cutscene {...base} open media={{ videoUrl: "https://cdn.passionseed.org/x.mp4" }} onDone={jest.fn()} />);
    fireEvent.error(screen.getByTestId("cutscene-video"));
    expect(screen.getByTestId("dialogue")).toBeInTheDocument();
  });
});

describe("LevelMap", () => {
  it("shows every level as tappable, with statuses", () => {
    const onJump = jest.fn();
    const progress = { ...emptyProgress(), cleared: ["mythos"] };
    render(<LevelMap pages={PAGES} progress={progress} currentKey="doors" onJump={onJump} reducedMotion />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAccessibleName(/ผ่านแล้ว/);
    expect(buttons[1]).toHaveAttribute("aria-current", "step");
    expect(buttons[2]).toHaveAccessibleName(/แตะเพื่อไปได้เลย/);
    fireEvent.click(buttons[2]);
    expect(onJump).toHaveBeenCalledWith("triage");
  });

  it("renders links when given hrefFor and no onJump", () => {
    render(<LevelMap pages={PAGES} progress={emptyProgress()} hrefFor={(k) => `/radar/cybersecurity/${k}`} />);
    expect(screen.getAllByRole("link")[2]).toHaveAttribute("href", "/radar/cybersecurity/triage");
  });
});

describe("XpBar and BadgeToast", () => {
  it("exposes XP as a progressbar", () => {
    render(<XpBar xp={150} max={600} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "150");
    expect(bar).toHaveAttribute("aria-valuemax", "600");
    expect(bar.querySelectorAll(".rgs-xp__seg--on")).toHaveLength(3);
  });

  it("shows the badge name and description", () => {
    render(<BadgeToast badge={BADGE} />);
    expect(screen.getByText("ได้ตราใหม่")).toBeInTheDocument();
    expect(screen.getByText("ตาไวกว่าบั๊ก")).toBeInTheDocument();
  });

  it("queues badges one at a time without repeats", () => {
    const b2 = { ...BADGE, id: "doors" };
    let q = enqueueBadges({ current: null, queue: [] }, [BADGE, b2]);
    expect(q.current?.id).toBe("mythos");
    q = enqueueBadges(q, [BADGE]);
    expect(q.queue).toHaveLength(1);
    q = dismissBadge(q);
    expect(q.current?.id).toBe("doors");
    q = dismissBadge(q);
    expect(q).toEqual({ current: null, queue: [] });
  });
});

describe("PixelScene", () => {
  it("swaps to the CSS night when the art fails", () => {
    render(<PixelScene src="/radar/guides/cybersecurity/mythos.webp" level={1} total={11} titleTh="ด่านหนึ่ง" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ด่านหนึ่ง");
    expect(screen.getByLabelText("ด่าน 1 จาก 11")).toBeInTheDocument();
    const img = screen.getByTestId("pixel-scene").querySelector("img") as HTMLImageElement;
    fireEvent.error(img);
    expect(screen.getByTestId("pixel-scene-fallback")).toBeInTheDocument();
  });
});

describe("ProfileCard", () => {
  const card: ProfileCardData = {
    slug: "cybersecurity",
    careerTh: "ไซเบอร์",
    titleTh: "โปรไฟล์สายไซเบอร์ของฉัน",
    traits: [
      { id: "a", labelTh: "ชอบหาจุดพัง", icon: "bug", when: [{ always: true }] },
      { id: "b", labelTh: "ตาคมจับผิด AI", icon: "radar", when: [{ always: true }] },
      { id: "c", labelTh: "ลงมือคืนนี้", icon: "flag", when: [{ always: true }] },
    ],
    xp: 900,
    maxXp: 1600,
    levelsCleared: 7,
    levelsTotal: 11,
    badges: [BADGE],
  };

  it("shows the title, three traits and the stats", () => {
    render(<ProfileCard card={card} accent="#5cff5c" shareUrl="https://passionseed.org/r/cyber" shareLabel="passionseed.org/r/cyber" />);
    expect(screen.getByText("โปรไฟล์สายไซเบอร์ของฉัน")).toBeInTheDocument();
    for (const t of card.traits) expect(screen.getByText(t.labelTh)).toBeInTheDocument();
    expect(screen.getByText("ผ่าน 7/11 ด่าน")).toBeInTheDocument();
    expect(screen.getByText("passionseed.org/r/cyber")).toBeInTheDocument();
  });

  const waitForPng = () => act(() => new Promise((r) => setTimeout(r, 700)));
  const clearShare = () => {
    delete (navigator as unknown as Record<string, unknown>).share;
    delete (navigator as unknown as Record<string, unknown>).canShare;
  };

  it("shares the PNG through Web Share when files are supported and the PNG is ready", async () => {
    const share = jest.fn(async () => {});
    Object.assign(navigator, { share, canShare: () => true });
    const onShare = jest.fn();
    render(<ProfileCard card={card} accent="#5cff5c" shareUrl="https://passionseed.org/r/cyber" onShare={onShare} />);
    await waitForPng();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "แชร์การ์ดนี้" }));
    });
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.any(File)] }));
    expect(onShare).toHaveBeenCalledWith("files");
    clearShare();
  });

  it("shares the link inside the tap while the PNG is still rendering", async () => {
    const share = jest.fn(async () => {});
    Object.assign(navigator, { share, canShare: () => true });
    const onShare = jest.fn();
    render(<ProfileCard card={card} accent="#5cff5c" shareUrl="https://passionseed.org/r/cyber" onShare={onShare} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "แชร์การ์ดนี้" }));
    });
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: "https://passionseed.org/r/cyber" }));
    expect(onShare).toHaveBeenCalledWith("url");
    clearShare();
  });

  it("inside Instagram, never opens the share sheet: shows the PNG to long-press", async () => {
    const share = jest.fn(async () => {});
    Object.assign(navigator, { share, canShare: () => true });
    const createObjectURL = jest.fn(() => "blob:card");
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const onShare = jest.fn();
    render(<ProfileCard card={card} accent="#5cff5c" shareUrl="https://passionseed.org/r/cyber" onShare={onShare} uaApp="instagram" />);
    await waitForPng();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "แชร์การ์ดนี้" }));
    });
    expect(share).not.toHaveBeenCalled();
    expect(screen.getByTestId("profile-overlay")).toBeInTheDocument();
    expect(screen.getByAltText(card.titleTh)).toHaveAttribute("src", "blob:card");
    expect(onShare).toHaveBeenCalledWith("overlay");
    fireEvent.click(screen.getByRole("button", { name: "ปิด" }));
    expect(screen.queryByTestId("profile-overlay")).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:card");
    clearShare();
  });

  it("บันทึกรูป in an in-app browser shows the long-press overlay instead of a download", async () => {
    Object.assign(URL, { createObjectURL: jest.fn(() => "blob:card"), revokeObjectURL: jest.fn() });
    render(<ProfileCard card={card} accent="#5cff5c" shareUrl="https://passionseed.org/r/cyber" uaApp="tiktok" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "บันทึกรูป" }));
    });
    expect(screen.getByTestId("profile-overlay")).toBeInTheDocument();
  });

  it("falls back to a pre-selected text field when the clipboard is blocked", async () => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn(async () => Promise.reject(new Error("blocked"))) } });
    render(<ProfileCard card={card} accent="#5cff5c" shareUrl="https://passionseed.org/r/cyber" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "คัดลอกลิงก์" }));
    });
    expect(screen.getByLabelText("ลิงก์สำหรับคัดลอก")).toHaveValue("https://passionseed.org/r/cyber");
  });
});
