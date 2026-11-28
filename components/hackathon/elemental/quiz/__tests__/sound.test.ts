/** @jest-environment jsdom */

export {};

// The music's notes are tested in quiz-sfx.test.ts; here only when bars get scheduled matters.
jest.mock("@/lib/hackathon/elemental/quiz-music", () => ({ ALL_LAYERS: ["pad", "keys", "bass", "drums"], barSeconds: () => 3, musicBar: jest.fn() }));
const musicBar = () => (jest.requireMock("@/lib/hackathon/elemental/quiz-music") as { musicBar: jest.Mock }).musicBar;

type ParamEvent = { kind: string; value: number; at: number };

/** Just enough of an AudioContext to see what the quiz's sound player does with it. */
class FakeParam {
  value = 1;
  events: ParamEvent[] = [];
  setValueAtTime(value: number, at: number) {
    this.events.push({ kind: "set", value, at });
  }
  linearRampToValueAtTime(value: number, at: number) {
    this.events.push({ kind: "linear", value, at });
  }
  exponentialRampToValueAtTime(value: number, at: number) {
    this.events.push({ kind: "exp", value, at });
  }
  cancelScheduledValues() {
    this.events.push({ kind: "cancel", value: 0, at: 0 });
  }
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  disconnected = false;
  connect<T>(next: T) {
    return next;
  }
  disconnect() {
    this.disconnected = true;
  }
}
const gains: FakeNode[] = [];
class FakeAudioContext {
  static made = 0;
  state = "running";
  currentTime = 5;
  destination = new FakeNode();
  constructor() {
    FakeAudioContext.made++;
  }
  createGain() {
    const g = new FakeNode();
    gains.push(g);
    return g;
  }
  createBiquadFilter() {
    return new FakeNode();
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
}

function load() {
  jest.resetModules();
  gains.length = 0;
  FakeAudioContext.made = 0;
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- a fresh copy of the module for each test
  return require("../sound") as typeof import("../sound");
}

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
});

describe("Elemental quiz sound player", () => {
  it("plays nothing, and makes no audio context, when sound is off", () => {
    const sound = load();
    sound.setSoundOn(false);
    const recipe = jest.fn();
    sound.play(recipe);
    expect(recipe).not.toHaveBeenCalled();
    expect(FakeAudioContext.made).toBe(0);
    expect(window.localStorage.getItem("elemental-quiz-sound")).toBe("off");
  });

  it("schedules a sound just after now, on its channel's own bus", () => {
    const sound = load();
    const recipe = jest.fn();
    sound.play(recipe, { channel: "preview" });
    expect(recipe).toHaveBeenCalledTimes(1);
    const [out, t] = recipe.mock.calls[0];
    expect(t).toBeCloseTo(5.01, 5);
    expect(out.dest).toBe(gains.at(-1));
  });

  it("cuts what is playing when sound is turned off: a 12 ms fade, never a click", () => {
    const sound = load();
    sound.play(() => {}, { channel: "preview" });
    const bus = gains.at(-1)!;
    sound.setSoundOn(false);
    expect(bus.gain.events.map((e) => e.kind)).toEqual(["cancel", "set", "linear"]);
    expect(bus.gain.events.at(-1)).toMatchObject({ value: 0, at: 5.012 });
  });

  it("replaces the last preview instead of stacking taps", () => {
    const sound = load();
    sound.play(() => {}, { channel: "preview", replace: true });
    const first = gains.at(-1)!;
    sound.play(() => {}, { channel: "preview", replace: true });
    expect(first.gain.events.at(-1)).toMatchObject({ kind: "linear", value: 0 });
    expect(gains.at(-1)).not.toBe(first);
  });

  it("never throws into the quiz, even when audio itself fails", () => {
    const sound = load();
    expect(() =>
      sound.play(() => {
        throw new Error("oscillator failed");
      }),
    ).not.toThrow();
    Object.defineProperty(navigator, "audioSession", {
      configurable: true,
      get: () => ({
        set type(_: string) {
          throw new Error("not allowed");
        },
      }),
    });
    const fresh = load();
    const recipe = jest.fn();
    expect(() => fresh.play(recipe)).not.toThrow();
    expect(recipe).toHaveBeenCalled();
  });

  describe("background music", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("schedules the first bar just ahead and fades in, then keeps a bar ahead as time passes", () => {
      const sound = load();
      sound.startMusic("quiz");
      const bus = gains.at(-1)!;
      expect(bus.gain.events.at(-1)).toMatchObject({ kind: "linear", value: 1, at: 6.5 });
      expect(musicBar()).toHaveBeenCalledTimes(1);
      expect(musicBar().mock.calls[0][1]).toBeCloseTo(5.3, 5);
      expect(musicBar().mock.calls[0][2]).toBe(0);
      sound.stopMusic();
    });

    it("fades out over 0.6 s and stops scheduling when stopped", () => {
      const sound = load();
      sound.startMusic("quiz");
      const bus = gains.at(-1)!;
      sound.stopMusic();
      expect(bus.gain.events.at(-1)).toMatchObject({ kind: "linear", value: 0, at: 5.6 });
      const calls = musicBar().mock.calls.length;
      jest.advanceTimersByTime(5000);
      expect(musicBar().mock.calls.length).toBe(calls);
    });

    it("stops with the speaker button and comes back when sound is turned on again", () => {
      const sound = load();
      sound.startMusic("quiz");
      sound.setSoundOn(false);
      const calls = musicBar().mock.calls.length;
      jest.advanceTimersByTime(5000);
      expect(musicBar().mock.calls.length).toBe(calls);
      sound.setSoundOn(true);
      expect(musicBar().mock.calls.length).toBe(calls + 1);
      sound.stopMusic();
    });

    it("plays the song it's asked for, and crossfades to a new one", () => {
      const sound = load();
      sound.startMusic("title");
      const titleBus = gains.at(-1)!;
      expect(musicBar().mock.calls[0][3]).toBe("title");
      sound.startMusic("quiz");
      expect(titleBus.gain.events.at(-1)).toMatchObject({ kind: "linear", value: 0 });
      expect(musicBar().mock.calls.at(-1)[3]).toBe("quiz");
      sound.stopMusic();
    });

    it("never starts audio cold from a page load: it only carries on audio a tap started", () => {
      const sound = load();
      sound.startMusic("fire", undefined, { ifRunning: true });
      expect(FakeAudioContext.made).toBe(0);
      expect(musicBar()).not.toHaveBeenCalled();
      // The first tap (the icon) starts it.
      sound.startMusic("fire");
      expect(musicBar().mock.calls.at(-1)[3]).toBe("fire");
      sound.stopMusic();
    });

    it("lets a page stop only its own songs", () => {
      const sound = load();
      sound.startMusic("fire");
      const fireBus = gains.at(-1)!;
      sound.stopMusic({ only: ["title", "quiz"] });
      expect(fireBus.gain.events.at(-1)).toMatchObject({ kind: "linear", value: 1 });
      sound.stopMusic({ only: ["fire"] });
      expect(fireBus.gain.events.at(-1)).toMatchObject({ kind: "linear", value: 0 });
    });

    it("waits while the tab is hidden", () => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      const sound = load();
      sound.startMusic("quiz");
      expect(musicBar()).not.toHaveBeenCalled();
    });
  });
});
