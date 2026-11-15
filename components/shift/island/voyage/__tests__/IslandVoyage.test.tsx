import { act, fireEvent, render, screen } from "@testing-library/react";

import { VOYAGE_COPY } from "../copy";
import { IslandVoyage } from "../IslandVoyage";
import { VOYAGE } from "../timeline";

function mockReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn((query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

/** requestAnimationFrame on the fake clock: one frame every 16 ms. */
function frames(ms: number) {
  act(() => void jest.advanceTimersByTime(ms));
}

beforeEach(() => {
  jest.useFakeTimers();
  mockReducedMotion(false);
  // jsdom has no 2D canvas: the cutscene still runs its clock, lines and buttons.
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  let id = 0;
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    id += 1;
    const handle = id;
    timers.set(handle, setTimeout(() => cb(performance.now()), 16));
    return handle;
  });
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation((handle) => {
    clearTimeout(timers.get(handle));
    timers.delete(handle);
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const line = () => screen.getByText((_, element) => element?.tagName === "P" && VOYAGE_COPY.lines.includes(element.textContent as never));

describe("IslandVoyage", () => {
  it("is a dialog with the student's name over the ship and the first line", () => {
    render(<IslandVoyage open name="มายด์" onDone={jest.fn()} />);
    expect(screen.getByRole("dialog", { name: VOYAGE_COPY.dialog })).toBeInTheDocument();
    expect(screen.getByText("มายด์")).toBeInTheDocument();
    expect(line()).toHaveTextContent(VOYAGE_COPY.lines[0]);
  });

  it("walks through its lines, opens the circle, then hands over", () => {
    const onReveal = jest.fn();
    const onDone = jest.fn();
    render(<IslandVoyage open name="มายด์" onReveal={onReveal} onDone={onDone} />);
    frames(VOYAGE.sea + 200);
    expect(line()).toHaveTextContent(VOYAGE_COPY.lines[1]);
    frames(VOYAGE.land - VOYAGE.sea);
    expect(line()).toHaveTextContent(VOYAGE_COPY.lines[2]);
    expect(onReveal).not.toHaveBeenCalled();
    frames(VOYAGE.iris - VOYAGE.land);
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
    frames(VOYAGE.end - VOYAGE.iris + 200);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("skips ahead to the arrival on a tap", () => {
    const onReveal = jest.fn();
    render(<IslandVoyage open name="มายด์" onReveal={onReveal} onDone={jest.fn()} />);
    frames(200);
    fireEvent.click(document.querySelector("canvas") as HTMLCanvasElement);
    frames(VOYAGE.iris - VOYAGE.dock + 600);
    expect(onReveal).toHaveBeenCalled();
  });

  it("ends at once on skip or Escape", () => {
    const onDone = jest.fn();
    const { unmount } = render(<IslandVoyage open name="มายด์" onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: VOYAGE_COPY.skip }));
    expect(onDone).toHaveBeenCalledTimes(1);
    unmount();

    const onEscape = jest.fn();
    render(<IslandVoyage open name="มายด์" onDone={onEscape} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("shows one still frame and a button ashore under reduced motion", () => {
    mockReducedMotion(true);
    const onDone = jest.fn();
    render(<IslandVoyage open name="มายด์" onDone={onDone} />);
    expect(line()).toHaveTextContent(VOYAGE_COPY.lines[2]);
    frames(VOYAGE.end + 500);
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: VOYAGE_COPY.ashore }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("renders nothing while closed", () => {
    render(<IslandVoyage open={false} name="มายด์" onDone={jest.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
