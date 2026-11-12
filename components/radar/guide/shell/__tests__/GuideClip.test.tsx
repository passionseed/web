/**
 * The shell side of a level's cutscene: auto-open on first reveal, the host
 * fallback without media, progress (watched/skipped) and video_* events with
 * pageKey. The Cutscene itself (U7) is stubbed here; its own tests cover it.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import type { GuideIndexEntry } from "@/lib/radar-guide/guide-types";
import { GUIDE_HOST } from "@/lib/radar-guide/story";
import { GuideShellProvider } from "../GuideShellProvider";
import { GuideClip, type GuideClipData } from "../GuideClip";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
  useSelectedLayoutSegment: () => "mythos",
}));

const track = jest.fn();
const TRACKER = { visitId: "visit-1", track, submitCareerRequest: jest.fn() };
jest.mock("@/lib/radar-guide/use-radar-visit", () => ({
  useRadarVisit: () => ({ tracker: TRACKER, attribution: null }),
}));

jest.mock("@/components/radar/guide/story", () => {
  const actual = jest.requireActual("@/components/radar/guide/story");
  return {
    ...actual,
    Cutscene: ({
      open,
      media,
      scriptLinesTh,
      onDone,
      onEvent,
    }: {
      open: boolean;
      media: { videoUrl: string } | null;
      scriptLinesTh: readonly string[];
      onDone(s: "watched" | "skipped"): void;
      onEvent?(name: string): void;
    }) =>
      open ? (
        <div data-testid="cutscene">
          {media ? <video data-testid="cutscene-video" src={media.videoUrl} /> : <p>{scriptLinesTh[0]}</p>}
          <button type="button" onClick={() => onEvent?.("play")}>
            play
          </button>
          <button type="button" onClick={() => onDone("skipped")}>
            skip
          </button>
          <button type="button" onClick={() => onDone("watched")}>
            end
          </button>
        </div>
      ) : null,
  };
});

const INDEX: GuideIndexEntry = {
  slug: "cybersecurity",
  alias: "cyber",
  nameTh: "ไซเบอร์",
  nameEn: "Cyber",
  accent: "#5cff5c",
  status: "draft",
  asOf: "2026-11-11",
  intentPathSlug: "interested",
  pages: [{ key: "mythos", order: 1, titleTh: "ด่านแรก", navLabelTh: "แรก", minutes: 2, cutscene: true }],
};

const SLOT = {
  seconds: 20,
  hookTh: "บั๊กนี้อายุมากกว่าเธอ",
  scriptLinesTh: ["บรรทัดแรกของคลิป", "บรรทัดสอง"],
  required: true,
  safety: false,
  factIds: [],
};

const VIDEO = "https://cdn.passionseed.org/radar/guide/cybersecurity/mythos.abcd1234.mp4";
const WITH_MEDIA: GuideClipData = {
  slot: SLOT,
  media: {
    videoUrl: VIDEO,
    posterUrl: "https://cdn.passionseed.org/radar/guide/cybersecurity/mythos.abcd1234.webp",
    captionsFile: "clips/mythos.vtt",
    durationS: 20,
    sha8: "abcd1234",
    recordedAt: "2026-11-11",
    scriptHash: "x",
  },
  cues: [{ start: 0, end: 2, text: "บรรทัดแรกของคลิป" }],
};

function renderClip(clip: GuideClipData) {
  return render(
    <GuideShellProvider index={INDEX} chrome={false}>
      <GuideClip pageKey="mythos" stepId="clip" titleTh="ด่านแรก" clip={clip} />
    </GuideShellProvider>
  );
}

function saved() {
  return JSON.parse(window.localStorage.getItem("radar-guide:v1:cybersecurity") ?? "{}");
}

beforeEach(() => {
  track.mockReset();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/radar/cybersecurity/mythos");
});

describe("GuideClip", () => {
  it("without media: the host tells it, the cutscene opens by itself, skipping is recorded", () => {
    renderClip({ slot: SLOT, media: null, cues: [] });
    expect(screen.getByText(`${GUIDE_HOST.nameTh} เล่าให้ฟัง`)).toBeInTheDocument();
    expect(screen.getByTestId("cutscene")).toHaveTextContent("บรรทัดแรกของคลิป");
    fireEvent.click(screen.getByText("skip"));
    expect(screen.queryByTestId("cutscene")).toBeNull();
    expect(saved().cutscenes).toEqual({ mythos: "skipped" });
    expect(screen.getByText("ดูอีกครั้ง")).toBeInTheDocument();
    // No media: no video events.
    expect(track.mock.calls.filter(([e]) => String(e.type).startsWith("video"))).toEqual([]);
  });

  it("does not auto-open a cutscene this device has already seen", () => {
    window.localStorage.setItem(
      "radar-guide:v1:cybersecurity",
      JSON.stringify({ v: 1, visited: ["mythos"], games: {}, choices: {}, cutscenes: { mythos: "watched" } })
    );
    renderClip({ slot: SLOT, media: null, cues: [] });
    expect(screen.queryByTestId("cutscene")).toBeNull();
    fireEvent.click(screen.getByText("ดูอีกครั้ง"));
    expect(screen.getByTestId("cutscene")).toBeInTheDocument();
  });

  it("with media: video_play, progress milestones and complete carry the pageKey", () => {
    renderClip(WITH_MEDIA);
    fireEvent.click(screen.getByText("play"));
    expect(track).toHaveBeenCalledWith({ type: "video_play", pageKey: "mythos", metadata: { muted: false } });

    const video = screen.getByTestId("cutscene-video") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { value: 20, configurable: true });
    Object.defineProperty(video, "currentTime", { value: 19.5, configurable: true, writable: true });
    fireEvent(video, new Event("timeupdate"));
    fireEvent(video, new Event("timeupdate"));

    const types = track.mock.calls.map(([e]) => [e.type, e.pageKey, e.valueInt]);
    expect(types).toEqual(
      expect.arrayContaining([
        ["video_progress", "mythos", 25],
        ["video_progress", "mythos", 50],
        ["video_progress", "mythos", 75],
        ["video_complete", "mythos", undefined],
      ])
    );
    expect(types.filter(([t]) => t === "video_complete")).toHaveLength(1);

    fireEvent.click(screen.getByText("end"));
    expect(saved().cutscenes).toEqual({ mythos: "watched" });
    expect(screen.getByText("อ่านสิ่งที่พูด")).toBeInTheDocument();
  });
});
