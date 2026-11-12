import { act, renderHook, waitFor } from "@testing-library/react";

import { loadQuestCanvas } from "@/app/shift/island/actions";
import type { CanvasLinkState, QuestCanvasContext } from "@/lib/shift-island/quest-canvas";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";

import { useQuestCanvas } from "../useQuestCanvas";

jest.mock("@/app/shift/island/actions", () => ({ loadQuestCanvas: jest.fn() }));

const mockedLoad = loadQuestCanvas as jest.MockedFunction<typeof loadQuestCanvas>;

const LINKED: CanvasLinkState = { linked: true, linkedAt: "2026-11-11T01:00:00Z" };
const m1 = { ref: { kind: "main", milestone: 1 } as BoardRef, slug: "find-something-worth-fixing" };
const m3 = { ref: { kind: "main", milestone: 3 } as BoardRef, slug: "let-reality-surprise-you" };
const ready = (title: string): QuestCanvasContext => ({
  state: "ready",
  canvas: { title, boardTitle: "b", lastEdited: null },
  context: [],
  hints: [],
  notes: [],
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => mockedLoad.mockReset());

describe("useQuestCanvas", () => {
  it.each([
    ["no quest open", null, LINKED, { state: "no_zones" }],
    ["a quest without zones", { ref: { kind: "main", milestone: 5 } as BoardRef, slug: "take-the-keys" }, LINKED, { state: "no_zones" }],
    ["a proposed quest", { ref: { kind: "proposed", instanceId: "x" } as BoardRef, slug: null }, LINKED, { state: "no_zones" }],
    ["no link", m1, { linked: false } as CanvasLinkState, { state: "unlinked" }],
  ])("answers %s without a server call", (_label, target, link, expected) => {
    const { result } = renderHook(() => useQuestCanvas(target, link));
    expect(result.current).toEqual({ context: expected, loading: false, reload: expect.any(Function) });
    expect(mockedLoad).not.toHaveBeenCalled();
  });

  it("loads once per open quest, not on every render", async () => {
    mockedLoad.mockResolvedValue({ ok: true, data: ready("A") });
    const { result, rerender } = renderHook(({ target }) => useQuestCanvas(target, LINKED), {
      initialProps: { target: { ...m1 } },
    });
    expect(result.current).toMatchObject({ context: null, loading: true });
    await waitFor(() => expect(result.current.context).toEqual(ready("A")));
    expect(result.current.loading).toBe(false);
    rerender({ target: { ...m1 } });
    rerender({ target: { ...m1 } });
    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(mockedLoad).toHaveBeenCalledWith({ ref: m1.ref, slug: m1.slug });
  });

  it("reloads on demand, keeping the last answer until the new one lands", async () => {
    mockedLoad.mockResolvedValueOnce({ ok: true, data: ready("A") });
    const { result } = renderHook(() => useQuestCanvas(m1, LINKED));
    await waitFor(() => expect(result.current.context).toEqual(ready("A")));
    const next = deferred<Awaited<ReturnType<typeof loadQuestCanvas>>>();
    mockedLoad.mockReturnValueOnce(next.promise);
    act(() => result.current.reload());
    expect(result.current).toMatchObject({ context: ready("A"), loading: true });
    await act(async () => next.resolve({ ok: true, data: ready("B") }));
    expect(result.current).toMatchObject({ context: ready("B"), loading: false });
  });

  it("ignores a stale answer for a quest that is no longer open", async () => {
    const first = deferred<Awaited<ReturnType<typeof loadQuestCanvas>>>();
    const second = deferred<Awaited<ReturnType<typeof loadQuestCanvas>>>();
    mockedLoad.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(({ target }) => useQuestCanvas(target, LINKED), { initialProps: { target: m1 } });
    rerender({ target: m3 });
    await act(async () => second.resolve({ ok: true, data: ready("three") }));
    await act(async () => first.resolve({ ok: true, data: ready("one") }));
    expect(result.current.context).toEqual(ready("three"));
  });

  it("loads again when the link changes", async () => {
    mockedLoad.mockResolvedValue({ ok: true, data: ready("A") });
    const { rerender } = renderHook(({ link }) => useQuestCanvas(m1, link), { initialProps: { link: LINKED } });
    await waitFor(() => expect(mockedLoad).toHaveBeenCalledTimes(1));
    rerender({ link: { linked: true, linkedAt: "2026-11-12T01:00:00Z" } });
    await waitFor(() => expect(mockedLoad).toHaveBeenCalledTimes(2));
  });

  it("turns a failed or refused load into the error state", async () => {
    mockedLoad.mockResolvedValueOnce({ ok: false, code: "unknown", error: "x" });
    const { result } = renderHook(() => useQuestCanvas(m1, LINKED));
    await waitFor(() => expect(result.current.context).toEqual({ state: "error" }));
    mockedLoad.mockRejectedValueOnce(new Error("network"));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.context).toEqual({ state: "error" });
  });
});
