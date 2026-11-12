import { act, renderHook } from "@testing-library/react";
import {
  createGuideStore,
  eventSafeState,
  readGuideState,
  useGuideState,
  writeGuideState,
  type StorageLike,
} from "../guide-state";
import { GUIDE_STATE_KEY, type GuideIndexEntry } from "../guide-types";
import { emptyProgress } from "../story";
import { DEMO_PARAM, demoDuration, demoTargetSelector, isDemoMode, scheduleDemo, validateDemoScript } from "../demo";

const ENTRY: Pick<GuideIndexEntry, "slug" | "pages" | "story"> = {
  slug: "cybersecurity",
  pages: [{ key: "mythos", order: 1, titleTh: "บั๊ก", navLabelTh: "บั๊ก", minutes: 2, games: 1 }],
  story: {
    profileTitleTh: "โปรไฟล์",
    badges: [{ id: "mythos", nameTh: "ตาไว", descTh: "ผ่าน", icon: "bug", trigger: { on: "clear", pageKey: "mythos" } }],
    traits: [],
  },
};

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

const throwing: StorageLike = {
  getItem() {
    throw new Error("SecurityError");
  },
  setItem() {
    throw new Error("QuotaExceededError");
  },
};

describe("guide-state storage", () => {
  it("reads and writes without throwing when storage throws (private mode)", () => {
    expect(readGuideState("cybersecurity", throwing)).toEqual(emptyProgress());
    expect(writeGuideState("cybersecurity", emptyProgress(), throwing)).toBe(false);
    const store = createGuideStore(ENTRY, { storage: throwing });
    expect(() => store.dispatch({ type: "clear", pageKey: "mythos" })).not.toThrow();
    expect(store.getSnapshot().cleared).toEqual(["mythos"]);
  });

  it("resets corrupt JSON to empty", () => {
    const storage = memoryStorage();
    storage.setItem(GUIDE_STATE_KEY("cybersecurity"), "{not json");
    expect(readGuideState("cybersecurity", storage)).toEqual(emptyProgress());
    storage.setItem(GUIDE_STATE_KEY("cybersecurity"), JSON.stringify({ v: 9 }));
    expect(readGuideState("cybersecurity", storage)).toEqual(emptyProgress());
  });

  it("round-trips through storage under one key per guide", () => {
    const storage = memoryStorage();
    const store = createGuideStore(ENTRY, { storage });
    const result = store.dispatch({ type: "clear", pageKey: "mythos" });
    expect(result.earned.map((b) => b.id)).toEqual(["mythos"]);
    expect([...storage.data.keys()]).toEqual(["radar-guide:v1:cybersecurity"]);
    expect(readGuideState("cybersecurity", storage).badges).toEqual(["mythos"]);
  });

  it("never writes in demo mode", () => {
    const storage = memoryStorage();
    const store = createGuideStore(ENTRY, { storage, demo: true });
    store.dispatch({ type: "clear", pageKey: "mythos" });
    expect(store.getSnapshot().cleared).toEqual(["mythos"]);
    expect(storage.data.size).toBe(0);
  });

  it("keeps local values out of event-safe state", () => {
    const store = createGuideStore(ENTRY, { storage: null });
    store.dispatch({ type: "local", patch: { birthYear: 2010, gpax: 3.5 } });
    store.dispatch({ type: "grade", grade: "m5" });
    const safe = eventSafeState(store.getSnapshot());
    expect(safe).not.toHaveProperty("local");
    expect(JSON.stringify(safe)).not.toMatch(/2010|3\.5/);
    expect(safe.grade).toBe("m5");
  });

  it("notifies subscribers only on change", () => {
    const store = createGuideStore(ENTRY, { storage: null });
    const listener = jest.fn();
    store.subscribe(listener);
    store.dispatch({ type: "visit", pageKey: "mythos" });
    store.dispatch({ type: "visit", pageKey: "mythos" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("useGuideState", () => {
  beforeEach(() => window.localStorage.clear());

  it("dispatches, persists, reports XP and badge toasts", () => {
    const onEarned = jest.fn();
    const { result } = renderHook(() => useGuideState(ENTRY, { onEarned }));
    expect(result.current.xp.xp).toBe(0);
    act(() => {
      result.current.dispatch({ type: "clear", pageKey: "mythos" });
    });
    expect(result.current.state.cleared).toEqual(["mythos"]);
    expect(result.current.xp.xp).toBe(100);
    expect(result.current.xp.max).toBe(150);
    expect(onEarned).toHaveBeenCalledTimes(1);
    expect(onEarned.mock.calls[0][0].map((b: { id: string }) => b.id)).toEqual(["mythos"]);
    expect(window.localStorage.getItem(GUIDE_STATE_KEY("cybersecurity"))).toContain("mythos");
  });

  it("keeps demo progress in memory", () => {
    const { result } = renderHook(() => useGuideState(ENTRY, { demo: true }));
    act(() => {
      result.current.dispatch({ type: "visit", pageKey: "mythos" });
    });
    expect(result.current.state.visited).toEqual(["mythos"]);
    expect(window.localStorage.getItem(GUIDE_STATE_KEY("cybersecurity"))).toBeNull();
  });
});

describe("demo helpers", () => {
  it("detects ?demo=1 only", () => {
    expect(isDemoMode(`?${DEMO_PARAM}=1`)).toBe(true);
    expect(isDemoMode("?demo=true&utm_source=x")).toBe(true);
    expect(isDemoMode("?demo=0")).toBe(false);
    expect(isDemoMode("")).toBe(false);
  });

  it("builds selectors and validates scripts", () => {
    expect(demoTargetSelector("bin-a")).toBe('[data-demo="bin-a"]');
    expect(validateDemoScript([{ at: 0, action: "wait" }, { at: 500, action: "tap", target: "a" }], 1000)).toEqual([]);
    expect(validateDemoScript([{ at: 500, action: "tap", target: "a" }, { at: 100, action: "wait" }])).toHaveLength(1);
    expect(validateDemoScript([{ at: 2000, action: "wait" }], 1000)).toHaveLength(1);
    expect(demoDuration([{ at: 300, action: "wait" }, { at: 1200, action: "wait" }])).toBe(1200);
  });

  it("schedules steps on timers and cancels", () => {
    jest.useFakeTimers();
    const run = jest.fn();
    const cancel = scheduleDemo([{ at: 100, action: "wait" }, { at: 300, action: "tap", target: "a" }], run);
    jest.advanceTimersByTime(150);
    expect(run).toHaveBeenCalledTimes(1);
    cancel();
    jest.advanceTimersByTime(500);
    expect(run).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
