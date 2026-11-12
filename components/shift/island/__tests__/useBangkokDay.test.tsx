import { act, renderHook } from "@testing-library/react";

import { bangkokDay } from "@/lib/shift-island/festival";

import { useBangkokDay } from "../useBangkokDay";

describe("useBangkokDay", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("is today's Bangkok date and rolls over at Bangkok midnight", () => {
    jest.useFakeTimers();
    // 27 Nov, 23:59:58 in Bangkok.
    const eve = Date.UTC(2026, 10, 27, 16, 59, 58);
    jest.setSystemTime(eve);
    const { result } = renderHook(() => useBangkokDay());
    expect(result.current).toBe(bangkokDay(eve));
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(result.current).toBe(bangkokDay(eve) + 1);
    // And again the next night, with one timer re-armed.
    act(() => {
      jest.advanceTimersByTime(86_400_000);
    });
    expect(result.current).toBe(bangkokDay(eve) + 2);
  });

  it("clears its timer on unmount", () => {
    jest.useFakeTimers();
    const { unmount } = renderHook(() => useBangkokDay());
    expect(jest.getTimerCount()).toBe(1);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
