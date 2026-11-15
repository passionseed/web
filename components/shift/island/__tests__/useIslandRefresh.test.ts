import { act, renderHook } from "@testing-library/react";

import { refreshIsland, useIslandRefresh } from "../useIslandRefresh";

beforeEach(() => {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});

it("reads on return, coalesces focus and visibility, and allows manual refresh immediately", () => {
  const refresh = jest.fn();
  renderHook(() => useIslandRefresh(refresh));
  expect(refresh).not.toHaveBeenCalled();
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  expect(refresh).toHaveBeenCalledTimes(1);
  act(refreshIsland);
  expect(refresh).toHaveBeenCalledTimes(2);
});

it("ignores background events and stops reading once inactive or unmounted", () => {
  const refresh = jest.fn();
  const { rerender, unmount } = renderHook(({ active }) => useIslandRefresh(refresh, active), { initialProps: { active: true } });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  expect(refresh).not.toHaveBeenCalled();
  rerender({ active: false });
  act(refreshIsland);
  expect(refresh).not.toHaveBeenCalled();
  rerender({ active: true });
  act(refreshIsland);
  expect(refresh).toHaveBeenCalledTimes(1);
  unmount();
  act(refreshIsland);
  expect(refresh).toHaveBeenCalledTimes(1);
});

it("reads again on a later return and after reconnecting", () => {
  jest.useFakeTimers();
  try {
    const refresh = jest.fn();
    renderHook(() => useIslandRefresh(refresh));
    act(() => window.dispatchEvent(new Event("focus")));
    act(() => jest.advanceTimersByTime(1_001));
    act(() => window.dispatchEvent(new Event("online")));
    expect(refresh).toHaveBeenCalledTimes(2);
  } finally {
    jest.useRealTimers();
  }
});
