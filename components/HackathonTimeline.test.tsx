import { render, screen } from "@testing-library/react";
import HackathonTimeline from "./HackathonTimeline";

jest.mock("gsap", () => ({
  __esModule: true,
  default: {
    set: jest.fn(),
    to: jest.fn(),
  },
}));

describe("HackathonTimeline", () => {
  test("uses deterministic rounded coordinates for SSR-safe hydration", () => {
    render(<HackathonTimeline />);

    const label = screen.getByText("03");
    const coordinateNode = label.parentElement?.parentElement as HTMLDivElement | null;

    expect(coordinateNode).not.toBeNull();
    expect(coordinateNode?.style.left).toBe("240px");
    expect(coordinateNode?.style.top).toBe("895.692194px");
  });
});
