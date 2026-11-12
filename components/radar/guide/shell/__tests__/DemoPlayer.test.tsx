import { render } from "@testing-library/react";
import { DEMO_LEAD_IN_MS, DemoPlayer, runDemoStep } from "../DemoPlayer";
import { orderFacts } from "../../SourcesSheet";
import type { Fact } from "@/lib/radar-guide/guide-types";

describe("runDemoStep", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("taps and types into [data-demo] targets, and reports missing ones", () => {
    document.body.innerHTML = `<button data-demo="go">go</button><label data-demo="name"><input /></label>`;
    const onClick = jest.fn();
    document.querySelector("button")!.addEventListener("click", onClick);
    const onInput = jest.fn();
    document.querySelector("input")!.addEventListener("input", onInput);

    expect(runDemoStep({ at: 0, action: "tap", target: "go" })).toBe(true);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(runDemoStep({ at: 0, action: "type", target: "name", text: "ls" })).toBe(true);
    expect(document.querySelector("input")!.value).toBe("ls");
    expect(onInput).toHaveBeenCalled();
    expect(runDemoStep({ at: 0, action: "tap", target: "missing" })).toBe(false);
    expect(runDemoStep({ at: 0, action: "wait" })).toBe(true);
  });
});

describe("DemoPlayer", () => {
  it("plays the script after the lead-in and marks <html> when done", () => {
    jest.useFakeTimers();
    try {
      document.body.innerHTML = `<button data-demo="go">go</button>`;
      const onClick = jest.fn();
      document.querySelector("button")!.addEventListener("click", onClick);
      render(<DemoPlayer enabled steps={[{ at: 100, action: "tap", target: "go" }]} />);
      jest.advanceTimersByTime(DEMO_LEAD_IN_MS + 99);
      expect(onClick).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(document.documentElement.dataset.demoDone).toBe("true");
    } finally {
      jest.useRealTimers();
      delete document.documentElement.dataset.demoDone;
    }
  });

  it("does nothing outside demo mode", () => {
    jest.useFakeTimers();
    try {
      document.body.innerHTML = `<button data-demo="go">go</button>`;
      const onClick = jest.fn();
      document.querySelector("button")!.addEventListener("click", onClick);
      render(<DemoPlayer steps={[{ at: 0, action: "tap", target: "go" }]} />);
      jest.advanceTimersByTime(5000);
      expect(onClick).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("orderFacts", () => {
  const fact = (id: `f.${string}`): Fact => ({ id, claimEn: id, sources: [], asOf: "2026-11-11", badge: "confirmed" });
  it("lists focused facts first and keeps the rest in order", () => {
    const facts = [fact("f.a"), fact("f.b"), fact("f.c")];
    expect(orderFacts(facts, ["f.c"]).map((f) => f.id)).toEqual(["f.c", "f.a", "f.b"]);
    expect(orderFacts(facts).map((f) => f.id)).toEqual(["f.a", "f.b", "f.c"]);
  });
});
