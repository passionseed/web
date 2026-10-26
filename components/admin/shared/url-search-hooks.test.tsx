import { act, renderHook } from "@testing-library/react";

import { usePendingQuery } from "./usePendingQuery";
import { useUrlSearchDraft } from "./useUrlSearchDraft";

const DELAY = 250;

describe("useUrlSearchDraft", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function setup(initialUrl = "") {
    const commit = jest.fn();
    const hook = renderHook(
      ({ url }: { url: string }) =>
        useUrlSearchDraft(url, commit, { delayMs: DELAY }),
      { initialProps: { url: initialUrl } },
    );
    const type = (text: string) => act(() => hook.result.current[1](text));
    const wait = (ms = DELAY) => act(() => jest.advanceTimersByTime(ms));
    return { commit, hook, type, wait };
  }

  it("commits the trimmed text once after a pause", () => {
    const { commit, hook, type, wait } = setup();
    type("a");
    type("ab ");
    wait(DELAY - 1);
    expect(commit).not.toHaveBeenCalled();
    wait(1);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith("ab");
    expect(hook.result.current[0]).toBe("ab ");
  });

  it("keeps a letter typed while its own URL write is still landing", () => {
    const { commit, hook, type, wait } = setup();
    type("ab");
    wait();
    expect(commit).toHaveBeenLastCalledWith("ab");

    // "c" arrives before the URL (and so urlValue) has caught up.
    type("abc");
    hook.rerender({ url: "ab" });
    expect(hook.result.current[0]).toBe("abc");

    wait();
    expect(commit).toHaveBeenLastCalledWith("abc");
  });

  it("takes the URL's value when it changes from outside", () => {
    const { commit, hook, type, wait } = setup("pim");
    type("pimm");
    hook.rerender({ url: "" }); // Back, a link, or Clear
    expect(hook.result.current[0]).toBe("");
    wait();
    expect(commit).not.toHaveBeenCalled();
  });

  it("uses a custom normalizer", () => {
    const commit = jest.fn();
    const hook = renderHook(() =>
      useUrlSearchDraft("", commit, {
        delayMs: DELAY,
        normalize: (value) => value.replace(/\s+/g, " ").trim(),
      }),
    );
    act(() => hook.result.current[1]("  som   chai "));
    act(() => jest.advanceTimersByTime(DELAY));
    expect(commit).toHaveBeenCalledWith("som chai");
  });
});

describe("usePendingQuery", () => {
  type Query = { q: string; role: string | null; page: number };
  const rendered: Query = { q: "", role: null, page: 1 };

  it("merges a second change into the pending one, not the rendered one", () => {
    const hook = renderHook(
      ({ query, key }: { query: Query; key: string }) =>
        usePendingQuery(query, key),
      { initialProps: { query: rendered, key: "" } },
    );
    expect(hook.result.current({ q: "somchai", page: 1 })).toEqual({
      q: "somchai",
      role: null,
      page: 1,
    });
    // The navigation is still pending: the rendered query has no q.
    expect(hook.result.current({ role: "admin" })).toEqual({
      q: "somchai",
      role: "admin",
      page: 1,
    });
  });

  it("follows the rendered query once the URL moves", () => {
    const hook = renderHook(
      ({ query, key }: { query: Query; key: string }) =>
        usePendingQuery(query, key),
      { initialProps: { query: rendered, key: "" } },
    );
    hook.result.current({ q: "somchai" });

    // Back moved the URL somewhere else entirely.
    const back: Query = { q: "", role: "expert", page: 2 };
    hook.rerender({ query: back, key: "role=expert&page=2" });
    expect(hook.result.current({ page: 3 })).toEqual({
      q: "",
      role: "expert",
      page: 3,
    });
  });
});
