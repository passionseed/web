import { render, screen } from "@testing-library/react";

import { describeSeries, Sparkline, sparklinePath } from "../Sparkline";

describe("sparklinePath", () => {
  it("spreads points across the box with the high at the top", () => {
    const geometry = sparklinePath([0, 5, 10], 100, 20, 0);
    expect(geometry).toEqual({
      line: "M0 20 L50 10 L100 0",
      area: "M0 20 L50 10 L100 0 L100 20 L0 20 Z",
      last: { x: 100, y: 0 },
    });
  });

  it("respects padding and rounds coordinates", () => {
    const geometry = sparklinePath([3, 1, 2], 30, 12, 2);
    expect(geometry?.line).toBe("M2 2 L15 10 L28 6");
  });

  it("draws a flat series as a level line through the middle", () => {
    expect(sparklinePath([4, 4, 4], 100, 20, 2)?.line).toBe("M2 10 L50 10 L98 10");
  });

  it("rests an all-zero series on the baseline", () => {
    expect(sparklinePath([0, 0, 0, 0], 90, 20, 0)?.line).toBe("M0 20 L30 20 L60 20 L90 20");
  });

  it("stretches a single point into a level line", () => {
    expect(sparklinePath([7], 100, 20, 0)?.line).toBe("M0 10 L100 10");
  });

  it("treats missing values as zero", () => {
    expect(sparklinePath([Number.NaN, 10], 10, 10, 0)?.line).toBe("M0 10 L10 0");
  });

  it("draws nothing for an empty series", () => {
    expect(sparklinePath([], 100, 20)).toBeNull();
  });
});

describe("describeSeries", () => {
  it("summarises the trend in words", () => {
    expect(describeSeries([2, 9, 4])).toBe("3-day trend: low 2, high 9, latest 4.");
    expect(describeSeries([1200, 300], (v) => `฿${v}`)).toBe(
      "2-day trend: low ฿300, high ฿1200, latest ฿300.",
    );
    expect(describeSeries([])).toBe("No trend data.");
  });
});

describe("<Sparkline />", () => {
  it("hides the drawing from assistive tech and offers the text instead", () => {
    render(<Sparkline series={[1, 3, 2]} label="3-day trend: low 1, high 3, latest 2." />);
    const svg = screen.getByTestId("sparkline");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg.querySelectorAll("path")).toHaveLength(2);
    expect(screen.getByText("3-day trend: low 1, high 3, latest 2.")).toHaveClass("sr-only");
  });

  it("renders nothing for an empty series", () => {
    const { container } = render(<Sparkline series={[]} label="nothing" />);
    expect(container).toBeEmptyDOMElement();
  });
});
