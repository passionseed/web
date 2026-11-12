import { render } from "@testing-library/react";
import { GUIDE_INDEX } from "@/lib/radar-guides";
import { LegacyHashRedirect, legacyRedirectTarget } from "../LegacyHashRedirect";

const LEGACY: Record<string, string> = {
  "#hook": "mythos",
  "#reality": "triage",
  "#day": "triage",
  "#ai": "firstjob",
  "#money": "money",
  "#study": "tcas",
  "#start": "tonight",
  "#outro": "next",
};

describe("legacyRedirectTarget", () => {
  it("maps every legacy deck hash to its level and keeps the query string", () => {
    for (const [hash, key] of Object.entries(LEGACY)) {
      expect(legacyRedirectTarget("cybersecurity", hash, "?utm_source=ig&utm_medium=dm")).toBe(
        `/radar/cybersecurity/${key}?utm_source=ig&utm_medium=dm`
      );
    }
  });

  it("covers every legacyHashes entry in the index", () => {
    const fromIndex = GUIDE_INDEX.cybersecurity.pages.flatMap((p) => (p.legacyHashes ?? []).map((h) => `#${h}`));
    expect(fromIndex.sort()).toEqual(Object.keys(LEGACY).sort());
  });

  it("ignores empty, unknown and non-guide hashes", () => {
    expect(legacyRedirectTarget("cybersecurity", "")).toBeNull();
    expect(legacyRedirectTarget("cybersecurity", "#")).toBeNull();
    expect(legacyRedirectTarget("cybersecurity", "#nope")).toBeNull();
    expect(legacyRedirectTarget("data-scientist", "#money")).toBeNull();
  });
});

describe("LegacyHashRedirect", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("replaces the location once and reports a pending redirect", () => {
    window.history.replaceState(null, "", "/radar/cybersecurity?utm_source=ig#money");
    const replace = jest.fn();
    const onSettled = jest.fn();
    render(<LegacyHashRedirect slug="cybersecurity" replace={replace} onSettled={onSettled} />);
    expect(replace).toHaveBeenCalledWith("/radar/cybersecurity/money?utm_source=ig");
    expect(onSettled).toHaveBeenCalledWith(true);
  });

  it("does nothing without a legacy hash", () => {
    window.history.replaceState(null, "", "/radar/cybersecurity?utm_source=ig");
    const replace = jest.fn();
    const onSettled = jest.fn();
    render(<LegacyHashRedirect slug="cybersecurity" replace={replace} onSettled={onSettled} />);
    expect(replace).not.toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalledWith(false);
  });
});
