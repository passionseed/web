import { render, screen } from "@testing-library/react";

import { GUIDE_SECTIONS, ShiftCanvasGuide } from "./ShiftCanvasGuide";

describe("ShiftCanvasGuide", () => {
  it("has a section for every role link at the top", () => {
    const { container } = render(<ShiftCanvasGuide />);
    for (const s of GUIDE_SECTIONS) {
      expect(screen.getByRole("link", { name: s.label })).toHaveAttribute("href", `#${s.id}`);
      expect(container.querySelector(`section#${s.id}`)).not.toBeNull();
    }
  });

  it("names the buttons people will look for", () => {
    const { container } = render(<ShiftCanvasGuide />);
    const text = container.textContent ?? "";
    for (const label of ["+ แคนวาสโปรเจกต์", "เก็บเป็น v", "ให้เป็นเจ้าของ", "Summarize this canvas", "Save to Tracker", "Snapshot now", "Grant"]) {
      expect(text).toContain(label);
    }
  });

  it("uses no em dashes in its copy", () => {
    const { container } = render(<ShiftCanvasGuide />);
    expect(container.textContent).not.toContain("—");
  });
});
