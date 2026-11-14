import { act, render, screen } from "@testing-library/react";

import { closeupGrid, gridToRgba, type CloseupInput } from "@/lib/shift-island/tree-closeup";
import { DEFAULT_STYLE } from "@/lib/shift-island/tree-style";

import { growFrames, TreeCanvas } from "../tree/TreeCanvas";

const mockReduced = { on: false };
jest.mock("../useReducedMotion", () => ({ useReducedMotion: () => mockReduced.on }));

const INPUT: CloseupInput = {
  style: { ...DEFAULT_STYLE, leaf: "leaf:autumn" },
  stage: 4,
  seeded: true,
  roots: { count: 8, recent: 4 },
};

/** A 2D context that keeps every frame put on the canvas. */
function fakeContext() {
  const frames: { width: number; height: number; data: Uint8ClampedArray }[] = [];
  const context = {
    createImageData: (width: number, height: number) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
    putImageData: jest.fn((image: { width: number; height: number; data: Uint8ClampedArray }) => frames.push(image)),
  };
  return { context, frames };
}

const bytes = (input: CloseupInput, rows?: [number, number]) => {
  const grid = closeupGrid(input);
  return Array.from(gridToRgba(rows ? grid.slice(...rows) : grid, 1).data);
};

let getContext: jest.SpyInstance;

beforeEach(() => {
  mockReduced.on = false;
  jest.useFakeTimers();
});

afterEach(() => {
  getContext?.mockRestore();
  jest.useRealTimers();
});

function withContext() {
  const fake = fakeContext();
  getContext = jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => fake.context) as never);
  return fake;
}

describe("TreeCanvas", () => {
  it("draws the close-up once, at one canvas pixel per grid pixel, shown pixelated at a whole-number scale", () => {
    const { frames } = withContext();
    const { container } = render(<TreeCanvas input={INPUT} scale={2} label="ต้นไม้ของทีม" />);
    const canvas = container.querySelector("canvas")!;
    expect([canvas.width, canvas.height]).toEqual([96, 150]);
    expect(canvas.style.width).toBe("192px");
    expect(screen.getByRole("img", { name: "ต้นไม้ของทีม" })).toBe(canvas);
    expect(frames).toHaveLength(1);
    expect(Array.from(frames[0].data)).toEqual(bytes(INPUT));
  });

  it("is hidden from screen readers without a label", () => {
    withContext();
    const { container } = render(<TreeCanvas input={INPUT} scale={1} />);
    expect(container.querySelector("canvas")).toHaveAttribute("aria-hidden", "true");
  });

  it("crops to a square around the tree for previews", () => {
    const { frames } = withContext();
    const { container } = render(<TreeCanvas input={INPUT} scale={1} view="tree" />);
    const canvas = container.querySelector("canvas")!;
    expect([canvas.width, canvas.height]).toEqual([96, 96]);
    expect(Array.from(frames[0].data)).toEqual(bytes(INPUT, [4, 100]));
  });

  it("shows a 48 pixel square of the leaves at twice the scale for leaf shapes", () => {
    const { frames } = withContext();
    const { container } = render(<TreeCanvas input={INPUT} scale={2} view="canopy" />);
    const canvas = container.querySelector("canvas")!;
    expect([canvas.width, canvas.height, canvas.style.width]).toEqual([48, 48, "96px"]);
    const leaves = closeupGrid(INPUT)
      .slice(14, 62)
      .map((row) => row.slice(24, 72));
    expect(Array.from(frames[0].data)).toEqual(Array.from(gridToRgba(leaves, 1).data));
  });

  it("grows in from the seed, stage by stage, then rests on the tree", () => {
    const { frames } = withContext();
    render(<TreeCanvas input={INPUT} scale={2} grow />);
    expect(frames).toHaveLength(1);
    act(() => {
      jest.runAllTimers();
    });
    expect(frames).toHaveLength(growFrames(INPUT).length);
    expect(Array.from(frames[0].data)).toEqual(bytes(growFrames(INPUT)[0]));
    expect(Array.from(frames.at(-1)!.data)).toEqual(bytes(INPUT));
  });

  it("skips the grow-in when the visitor asks for less motion", () => {
    mockReduced.on = true;
    const { frames } = withContext();
    render(<TreeCanvas input={INPUT} scale={2} grow />);
    act(() => {
      jest.runAllTimers();
    });
    expect(frames).toHaveLength(1);
    expect(Array.from(frames[0].data)).toEqual(bytes(INPUT));
  });

  it("grows in only once: a new look is drawn at once", () => {
    const { frames } = withContext();
    const { rerender } = render(<TreeCanvas input={INPUT} scale={2} grow />);
    act(() => {
      jest.runAllTimers();
    });
    const before = frames.length;
    const gold = { ...INPUT, style: { ...INPUT.style, leaf: "leaf:gold" } };
    rerender(<TreeCanvas input={gold} scale={2} grow />);
    act(() => {
      jest.runAllTimers();
    });
    expect(frames).toHaveLength(before + 1);
    expect(Array.from(frames.at(-1)!.data)).toEqual(bytes(gold));
  });

  it("draws nothing and never throws without a 2D canvas", () => {
    getContext = jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => null) as never);
    expect(() => render(<TreeCanvas input={INPUT} scale={2} grow />)).not.toThrow();
  });
});

describe("growFrames", () => {
  it("steps from the seed to the tree's stage with the roots growing along", () => {
    const frames = growFrames(INPUT);
    expect(frames.map((f) => f.stage)).toEqual([0, 1, 2, 3, 4]);
    expect(frames.every((f) => f.seeded)).toBe(true);
    expect(frames.map((f) => f.roots.count)).toEqual([0, 2, 4, 6, 8]);
    expect(frames.at(-1)).toEqual(INPUT);
  });

  it("has one frame for an empty plot or a seed", () => {
    expect(growFrames({ ...INPUT, stage: 0, seeded: false })).toHaveLength(1);
    expect(growFrames({ ...INPUT, stage: 0 })).toHaveLength(1);
  });
});
