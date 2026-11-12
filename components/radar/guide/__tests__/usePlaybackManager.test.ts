import {
  PLAYBACK_DWELL_MS,
  PlaybackManager,
  SOUND_ON_STORAGE_KEY,
  type PlaybackEnv,
  type PlaybackHandle,
} from "../usePlaybackManager";

/** A mocked HTMLMediaElement: play() resolves unless the policy rejects it. */
class FakeMedia {
  muted = true;
  paused = true;
  currentTime = 0;
  /** Simulates iOS: unmuted play without a tap on the element is rejected. */
  rejectUnmuted = false;
  rejectAll = false;
  play = jest.fn(() => {
    if (this.rejectAll || (this.rejectUnmuted && !this.muted)) {
      return Promise.reject(new DOMException("blocked", "NotAllowedError"));
    }
    this.paused = false;
    return Promise.resolve();
  });
  pause = jest.fn(() => {
    this.paused = true;
  });
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

function setup({
  canAutoplayMuted = true,
  storage = memoryStorage(),
}: { canAutoplayMuted?: boolean; storage?: ReturnType<typeof memoryStorage> | null } = {}) {
  const env: PlaybackEnv = {
    storage,
    canAutoplayMuted: () => canAutoplayMuted,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  };
  const manager = new PlaybackManager(env);
  const add = (id: string) => {
    const media = new FakeMedia();
    const handle = { media, setNeedsTap: jest.fn(), onUnmute: jest.fn() };
    manager.register(id, handle as unknown as PlaybackHandle);
    return { media, handle };
  };
  return { manager, add, storage };
}

/** Lets rejected play() promises settle. */
const flush = () => Promise.resolve().then(() => undefined);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("dwell", () => {
  test("autoplays only after 700ms at 60% or more", () => {
    const { manager, add } = setup();
    const a = add("a");
    manager.setVisibility("a", 0.6);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS - 1);
    expect(a.media.play).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(a.media.play).toHaveBeenCalledTimes(1);
    expect(a.media.muted).toBe(true);
  });

  test("dropping below 60% before the dwell cancels it", () => {
    const { manager, add } = setup();
    const a = add("a");
    manager.setVisibility("a", 0.8);
    jest.advanceTimersByTime(400);
    manager.setVisibility("a", 0.5);
    jest.advanceTimersByTime(1000);
    expect(a.media.play).not.toHaveBeenCalled();
  });

  test("below 40% a playing video pauses", () => {
    const { manager, add } = setup();
    const a = add("a");
    manager.setVisibility("a", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    expect(a.media.paused).toBe(false);
    manager.setVisibility("a", 0.5);
    expect(a.media.paused).toBe(false);
    manager.setVisibility("a", 0.3);
    expect(a.media.pause).toHaveBeenCalled();
    expect(a.media.paused).toBe(true);
  });
});

describe("first video autoplays muted, later ones do not", () => {
  test("only the first video in a visit autoplays muted", () => {
    const { manager, add } = setup();
    const a = add("a");
    const b = add("b");
    manager.setVisibility("a", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    expect(a.media.play).toHaveBeenCalledTimes(1);
    manager.setVisibility("a", 0);

    manager.setVisibility("b", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    expect(b.media.play).not.toHaveBeenCalled();
    expect(b.handle.setNeedsTap).toHaveBeenLastCalledWith(true);
  });

  test("the first video may resume muted when scrolled back to", () => {
    const { manager, add } = setup();
    const a = add("a");
    manager.setVisibility("a", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    manager.setVisibility("a", 0);
    manager.setVisibility("a", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    expect(a.media.play).toHaveBeenCalledTimes(2);
  });

  test("reduced motion or Save-Data: no muted autoplay, the play button shows", () => {
    const { manager, add } = setup({ canAutoplayMuted: false });
    const a = add("a");
    const b = add("b");
    manager.setVisibility("a", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    expect(a.media.play).not.toHaveBeenCalled();
    expect(a.handle.setNeedsTap).toHaveBeenLastCalledWith(true);
    manager.setVisibility("b", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    expect(b.media.play).not.toHaveBeenCalled();
  });

  test("a rejected muted autoplay shows the play button", async () => {
    const { manager, add } = setup();
    const a = add("a");
    a.media.rejectAll = true;
    manager.setVisibility("a", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    await flush();
    expect(a.handle.setNeedsTap).toHaveBeenLastCalledWith(true);
  });
});

describe("soundOn", () => {
  test("after the visitor turns sound on, later videos try unmuted play", () => {
    const { manager, add, storage } = setup();
    add("a");
    const b = add("b");
    manager.setVisibility("a", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    manager.tap("a");
    expect(manager.soundOn).toBe(true);
    expect(storage?.data.get(SOUND_ON_STORAGE_KEY)).toBe("1");
    manager.setVisibility("a", 0);

    manager.setVisibility("b", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    expect(b.media.play).toHaveBeenCalledTimes(1);
    expect(b.media.muted).toBe(false);
  });

  test("a rejected unmuted play shows the play button, never muted autoplay", async () => {
    const { manager, add } = setup({ storage: memoryStorage({ [SOUND_ON_STORAGE_KEY]: "1" }) });
    const b = add("b");
    b.media.rejectUnmuted = true;
    manager.setVisibility("b", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    await flush();
    expect(b.media.play).toHaveBeenCalledTimes(1);
    expect(b.media.muted).toBe(false);
    expect(b.media.paused).toBe(true);
    expect(b.handle.setNeedsTap).toHaveBeenLastCalledWith(true);
  });

  test("storage that throws is tolerated", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      data: new Map<string, string>(),
    };
    const { manager, add } = setup({ storage: throwing });
    const a = add("a");
    expect(manager.soundOn).toBe(false);
    expect(() => manager.playWithSound("a")).not.toThrow();
    expect(manager.soundOn).toBe(true);
    expect(a.media.play).toHaveBeenCalled();
  });

  test("turning sound off clears soundOn", () => {
    const { manager, add } = setup();
    const a = add("a");
    manager.playWithSound("a");
    manager.setMuted("a", true);
    expect(a.media.muted).toBe(true);
    expect(manager.soundOn).toBe(false);
  });
});

describe("taps", () => {
  test("tapping a muted video unmutes it, rewinds on the first unmute, and reports it", () => {
    const { manager, add } = setup();
    const a = add("a");
    manager.setVisibility("a", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    a.media.currentTime = 4.2;
    manager.tap("a");
    expect(a.media.muted).toBe(false);
    expect(a.media.currentTime).toBe(0);
    expect(a.handle.onUnmute).toHaveBeenCalledTimes(1);
  });

  test("only the first unmute in a visit rewinds", () => {
    const { manager, add } = setup();
    add("a");
    const b = add("b");
    manager.setVisibility("a", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    manager.tap("a");
    manager.setMuted("a", true);
    b.media.muted = true;
    b.media.paused = false;
    b.media.currentTime = 3;
    manager.tap("b");
    expect(b.media.currentTime).toBe(3);
  });

  test("tapping a video playing with sound toggles play and pause", () => {
    const { manager, add } = setup();
    const a = add("a");
    manager.playWithSound("a");
    expect(a.media.paused).toBe(false);
    manager.tap("a");
    expect(a.media.paused).toBe(true);
    manager.tap("a");
    expect(a.media.paused).toBe(false);
  });

  test("a video the visitor paused is not restarted by visibility", () => {
    const { manager, add } = setup();
    const a = add("a");
    manager.playWithSound("a");
    manager.tap("a");
    a.media.play.mockClear();
    manager.setVisibility("a", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS * 2);
    expect(a.media.play).not.toHaveBeenCalled();
  });

  test("the play button plays with sound", () => {
    const { manager, add } = setup();
    const a = add("a");
    manager.playWithSound("a");
    expect(a.media.muted).toBe(false);
    expect(a.media.play).toHaveBeenCalled();
    expect(a.handle.setNeedsTap).toHaveBeenCalledWith(false);
  });

  test("an ended video is not autoplayed again; replay rewinds and plays", () => {
    const { manager, add } = setup();
    const a = add("a");
    manager.setVisibility("a", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    a.media.paused = true;
    manager.markEnded("a");
    a.media.play.mockClear();
    manager.setVisibility("a", 0);
    manager.setVisibility("a", 1);
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    expect(a.media.play).not.toHaveBeenCalled();
    a.media.currentTime = 30;
    manager.replay("a");
    expect(a.media.currentTime).toBe(0);
    expect(a.media.play).toHaveBeenCalledTimes(1);
  });
});

describe("one active video", () => {
  test("starting one video pauses every other", () => {
    const { manager, add } = setup();
    const a = add("a");
    const b = add("b");
    manager.playWithSound("a");
    expect(a.media.paused).toBe(false);
    manager.playWithSound("b");
    expect(a.media.pause).toHaveBeenCalled();
    expect(a.media.paused).toBe(true);
    expect(b.media.paused).toBe(false);
  });

  test("unregister clears the pending dwell", () => {
    const { manager, add } = setup();
    const a = add("a");
    manager.setVisibility("a", 1);
    manager.dispose();
    jest.advanceTimersByTime(PLAYBACK_DWELL_MS);
    expect(a.media.play).not.toHaveBeenCalled();
  });
});
