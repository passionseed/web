import { render } from "@testing-library/react";

import { HUD_BOTTOM_VAR, Hud } from "../IslandHud";

describe("Hud", () => {
  const root = () => document.documentElement.style.getPropertyValue(HUD_BOTTOM_VAR);

  it("tells the world how much of the screen its bottom bar covers, so a scroll lands above the next-step card", () => {
    const top = jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: window.innerHeight - 165 } as DOMRect);
    try {
      const { unmount } = render(<Hud chip={<button type="button">chip</button>} buttons={null} bottom={<div>card</div>} />);
      expect(root()).toBe("165px");
      unmount();
      // Gone with the HUD: the world falls back to its fixed reserve.
      expect(root()).toBe("");
    } finally {
      top.mockRestore();
    }
  });
});
