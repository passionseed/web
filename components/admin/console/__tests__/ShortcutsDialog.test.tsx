import { fireEvent, render, screen } from "@testing-library/react";

import { ShortcutsDialog } from "../ShortcutsDialog";

describe("ShortcutsDialog", () => {
  it("keeps Enter and letters inside the dialog, away from page shortcuts", () => {
    // Stands in for CampaignReviewQueue, where Enter sends the campaign DM.
    const pageKeys: string[] = [];
    const pageHandler = (event: KeyboardEvent) => pageKeys.push(event.key);
    window.addEventListener("keydown", pageHandler);
    try {
      render(<ShortcutsDialog open onOpenChange={jest.fn()} />);
      const close = screen.getByRole("button", { name: "Close" });
      fireEvent.keyDown(close, { key: "Enter" });
      fireEvent.keyDown(close, { key: "s" });

      expect(pageKeys).toEqual([]);
    } finally {
      window.removeEventListener("keydown", pageHandler);
    }
  });

  it("lists every chord", () => {
    render(<ShortcutsDialog open onOpenChange={jest.fn()} />);
    expect(screen.getByText("DM leads")).toBeInTheDocument();
    expect(screen.getByText("PathLabs")).toBeInTheDocument();
  });
});
