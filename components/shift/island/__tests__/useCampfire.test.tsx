import { act, renderHook } from "@testing-library/react";

import { loadCampfire } from "@/app/shift/island/actions";
import type { CampfireSummary } from "@/lib/supabase/shift-quests/types";

import { CAMPFIRE_REFRESH_MS, useCampfire } from "../useCampfire";

jest.mock("@/app/shift/island/actions", () => ({ loadCampfire: jest.fn() }));

const mocked = loadCampfire as jest.MockedFunction<typeof loadCampfire>;
const JOIN = "https://discord.com/channels/111111111111111111/222222222222222222";
const START: CampfireSummary = { count: 2, joinUrl: JOIN };

type Answer = Awaited<ReturnType<typeof loadCampfire>>;
const answer = (count: number, names: string[] = []): Answer => ({ ok: true, data: { count, names, joinUrl: JOIN } });

let visibility: DocumentVisibilityState = "visible";
function setVisibility(next: DocumentVisibilityState) {
  visibility = next;
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeAll(() => {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
});

beforeEach(() => {
  jest.useFakeTimers();
  visibility = "visible";
  mocked.mockReset().mockResolvedValue(answer(2));
});

afterEach(() => {
  jest.useRealTimers();
});

/** Let the 90 s pass and the answer land. */
async function tick(ms = CAMPFIRE_REFRESH_MS) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe("useCampfire", () => {
  it("reads the count again every 90 s while the island is in view, with one timer", async () => {
    mocked.mockResolvedValueOnce(answer(5));
    const { result } = renderHook(() => useCampfire(START, true));
    expect(result.current.summary).toBe(START);
    await tick(CAMPFIRE_REFRESH_MS - 1);
    expect(mocked).not.toHaveBeenCalled();
    await tick(1);
    expect(mocked).toHaveBeenCalledWith({ names: false });
    expect(result.current.summary).toEqual({ count: 5, joinUrl: JOIN });
    // One timer: the next read is one more, 90 s later, never two.
    await tick();
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it("keeps the same summary when nothing changed, so the world does not repaint", async () => {
    const { result } = renderHook(() => useCampfire(START, true));
    await tick();
    expect(result.current.summary).toBe(START);
  });

  it("never polls without a campfire", async () => {
    const { result } = renderHook(() => useCampfire(null, true));
    await tick(CAMPFIRE_REFRESH_MS * 3);
    expect(mocked).not.toHaveBeenCalled();
    expect(result.current.summary).toBeNull();
  });

  it("stops while a sheet covers the island, and drops an answer that lands after", async () => {
    let resolve: (value: Answer) => void = () => {};
    mocked.mockImplementationOnce(() => new Promise<Answer>((r) => (resolve = r)));
    const { result, rerender } = renderHook(({ active }) => useCampfire(START, active), { initialProps: { active: true } });
    await tick();
    expect(mocked).toHaveBeenCalledTimes(1);
    rerender({ active: false });
    await act(async () => resolve(answer(9)));
    expect(result.current.summary).toBe(START);
    await tick(CAMPFIRE_REFRESH_MS * 2);
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it("clears its timer in a hidden tab and picks up again when the tab shows", async () => {
    renderHook(() => useCampfire(START, true));
    act(() => setVisibility("hidden"));
    await tick(CAMPFIRE_REFRESH_MS * 2);
    expect(mocked).not.toHaveBeenCalled();
    act(() => setVisibility("visible"));
    // More than 90 s since the last read: it reads straight away, once.
    await tick(0);
    expect(mocked).toHaveBeenCalledTimes(1);
    await tick(CAMPFIRE_REFRESH_MS - 1);
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it("clears its timer on unmount", async () => {
    const { unmount } = renderHook(() => useCampfire(START, true));
    unmount();
    await tick(CAMPFIRE_REFRESH_MS * 2);
    expect(mocked).not.toHaveBeenCalled();
  });

  it("reads the names on demand, newest request wins", async () => {
    mocked.mockResolvedValueOnce(answer(3, ["Ploy", "มิ้นต์", "Ploy"]));
    const { result } = renderHook(() => useCampfire(START, false));
    expect(result.current.names).toEqual({ state: "idle", names: [] });
    await act(async () => result.current.loadNames());
    expect(mocked).toHaveBeenCalledWith({ names: true });
    expect(result.current.names).toEqual({ state: "ready", names: ["Ploy", "มิ้นต์", "Ploy"] });
    expect(result.current.summary).toEqual({ count: 3, joinUrl: JOIN });
  });

  it("takes the campfire away when a poll says no channel is set, and stops polling", async () => {
    mocked.mockResolvedValueOnce({ ok: true, data: { none: true } });
    const { result } = renderHook(() => useCampfire(START, true));
    await tick();
    expect(result.current.summary).toBeNull();
    await tick(CAMPFIRE_REFRESH_MS * 3);
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it("keeps the last count when a poll fails", async () => {
    mocked.mockResolvedValueOnce({ ok: true, data: null }).mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useCampfire(START, true));
    await tick();
    expect(result.current.summary).toBe(START);
    await tick();
    expect(result.current.summary).toBe(START);
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it("takes the campfire away when the names read says no channel is set", async () => {
    mocked.mockResolvedValueOnce({ ok: true, data: { none: true } });
    const { result } = renderHook(() => useCampfire(START, false));
    await act(async () => result.current.loadNames());
    expect(result.current.summary).toBeNull();
    expect(result.current.names).toEqual({ state: "idle", names: [] });
  });

  it("says the names failed when the read fails or throws", async () => {
    mocked.mockResolvedValueOnce({ ok: false, code: "sq:unavailable" } as unknown as Answer);
    const { result } = renderHook(() => useCampfire(START, false));
    await act(async () => result.current.loadNames());
    expect(result.current.names.state).toBe("error");
    mocked.mockRejectedValueOnce(new Error("offline"));
    await act(async () => result.current.loadNames());
    expect(result.current.names.state).toBe("error");
    expect(result.current.summary).toBe(START);
  });
});
