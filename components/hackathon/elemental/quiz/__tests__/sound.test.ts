/** @jest-environment jsdom */

export {};

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

beforeEach(() => window.localStorage.clear());

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
});
