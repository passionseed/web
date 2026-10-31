import { fireEvent, render } from "@testing-library/react";

import { CHORD_TIMEOUT_MS, useAdminHotkeys } from "../useAdminHotkeys";

const handlers = {
  onTogglePalette: jest.fn(),
  onShowShortcuts: jest.fn(),
  onNavigate: jest.fn(),
};

function Harness() {
  useAdminHotkeys(handlers);
  return (
    <div>
      <input aria-label="field" />
      <p>page</p>
    </div>
  );
}

/** Stands in for a page handler such as the DM inbox or round review. */
const pageKeys: string[] = [];
const pageHandler = (event: KeyboardEvent) => pageKeys.push(event.key);

beforeEach(() => {
  pageKeys.length = 0;
  window.addEventListener("keydown", pageHandler);
});
afterEach(() => {
  window.removeEventListener("keydown", pageHandler);
  jest.useRealTimers();
});

const body = () => document.body;

describe("useAdminHotkeys", () => {
  it("navigates on a g chord and swallows only the matched second key", () => {
    render(<Harness />);
    fireEvent.keyDown(body(), { key: "g" });
    const second = fireEvent.keyDown(body(), { key: "d" });

    expect(handlers.onNavigate).toHaveBeenCalledWith("/admin/dm-leads");
    expect(second).toBe(false); // preventDefault was called
    expect(pageKeys).toEqual(["g"]); // "g" passes through, "d" does not
  });

  it("lets a non-matching second key through untouched", () => {
    render(<Harness />);
    fireEvent.keyDown(body(), { key: "g" });
    const second = fireEvent.keyDown(body(), { key: "g" });

    expect(handlers.onNavigate).not.toHaveBeenCalled();
    expect(second).toBe(true);
    expect(pageKeys).toEqual(["g", "g"]);
  });

  it("leaves gg to the page without re-arming, so the next key is the page's", () => {
    render(<Harness />);
    fireEvent.keyDown(body(), { key: "g" });
    fireEvent.keyDown(body(), { key: "g" });
    const third = fireEvent.keyDown(body(), { key: "o" });

    expect(handlers.onNavigate).not.toHaveBeenCalled();
    expect(third).toBe(true);
    expect(pageKeys).toEqual(["g", "g", "o"]);

    // A fresh "g" after that still arms a chord.
    fireEvent.keyDown(body(), { key: "g" });
    fireEvent.keyDown(body(), { key: "u" });
    expect(handlers.onNavigate).toHaveBeenCalledWith("/admin/users");
  });

  it("works on a Thai layout by falling back to the physical key", () => {
    render(<Harness />);
    // Thai Kedmanee: G types "เ", D types "ก", Shift+/ types "ฦ".
    fireEvent.keyDown(body(), { key: "เ", code: "KeyG" });
    fireEvent.keyDown(body(), { key: "ก", code: "KeyD" });
    expect(handlers.onNavigate).toHaveBeenCalledWith("/admin/dm-leads");

    fireEvent.keyDown(body(), { key: "ฦ", code: "Slash", shiftKey: true });
    expect(handlers.onShowShortcuts).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(body(), { key: "า", code: "KeyK", ctrlKey: true });
    expect(handlers.onTogglePalette).toHaveBeenCalledTimes(1);
  });

  it("keeps the typed key on Latin layouts such as Dvorak", () => {
    render(<Harness />);
    // Dvorak: the physical G position types "i".
    fireEvent.keyDown(body(), { key: "i", code: "KeyG" });
    fireEvent.keyDown(body(), { key: "u", code: "KeyF" });
    expect(handlers.onNavigate).not.toHaveBeenCalled();
  });

  it("does not fire chords or ? while typing", () => {
    const { getByLabelText } = render(<Harness />);
    const input = getByLabelText("field");
    fireEvent.keyDown(input, { key: "g" });
    fireEvent.keyDown(input, { key: "u" });
    fireEvent.keyDown(input, { key: "?" });

    expect(handlers.onNavigate).not.toHaveBeenCalled();
    expect(handlers.onShowShortcuts).not.toHaveBeenCalled();
    expect(pageKeys).toEqual(["g", "u", "?"]);
  });

  it("expires an armed chord after the timeout", () => {
    jest.useFakeTimers();
    render(<Harness />);
    fireEvent.keyDown(body(), { key: "g" });
    jest.advanceTimersByTime(CHORD_TIMEOUT_MS + 50);
    fireEvent.keyDown(body(), { key: "r" });

    expect(handlers.onNavigate).not.toHaveBeenCalled();
    expect(pageKeys).toEqual(["g", "r"]);
  });

  it("toggles the palette with Cmd or Ctrl+K, even inside inputs", () => {
    const { getByLabelText } = render(<Harness />);
    const first = fireEvent.keyDown(getByLabelText("field"), {
      key: "k",
      metaKey: true,
    });
    fireEvent.keyDown(body(), { key: "K", ctrlKey: true });

    expect(handlers.onTogglePalette).toHaveBeenCalledTimes(2);
    expect(first).toBe(false);
    expect(pageKeys).toEqual([]);
  });

  describe("on macOS", () => {
    const original = Object.getOwnPropertyDescriptor(
      window.navigator,
      "platform",
    );
    beforeEach(() => {
      Object.defineProperty(window.navigator, "platform", {
        value: "MacIntel",
        configurable: true,
      });
    });
    afterEach(() => {
      if (original) Object.defineProperty(window.navigator, "platform", original);
      else delete (window.navigator as { platform?: string }).platform;
    });

    it("toggles the palette with Cmd+K only and leaves Ctrl+K to text fields", () => {
      const { getByLabelText } = render(<Harness />);
      const field = getByLabelText("field");
      const ctrl = fireEvent.keyDown(field, { key: "k", ctrlKey: true });
      expect(ctrl).toBe(true);
      expect(handlers.onTogglePalette).not.toHaveBeenCalled();
      expect(pageKeys).toEqual(["k"]);

      fireEvent.keyDown(field, { key: "k", metaKey: true });
      expect(handlers.onTogglePalette).toHaveBeenCalledTimes(1);
    });
  });

  it("opens shortcuts on ? outside fields", () => {
    render(<Harness />);
    fireEvent.keyDown(body(), { key: "?", shiftKey: true });
    expect(handlers.onShowShortcuts).toHaveBeenCalledTimes(1);
  });

  it("ignores keys during IME composition", () => {
    render(<Harness />);
    fireEvent.keyDown(body(), { key: "k", metaKey: true, isComposing: true });
    fireEvent.keyDown(body(), { key: "g", keyCode: 229 });
    fireEvent.keyDown(body(), { key: "d" });

    expect(handlers.onTogglePalette).not.toHaveBeenCalled();
    expect(handlers.onNavigate).not.toHaveBeenCalled();
  });

  it("stays out of the way while a confirm dialog is open", () => {
    render(<Harness />);
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "alertdialog");
    document.body.appendChild(dialog);
    fireEvent.keyDown(body(), { key: "k", metaKey: true });
    fireEvent.keyDown(body(), { key: "g" });
    fireEvent.keyDown(body(), { key: "d" });
    dialog.remove();

    expect(handlers.onTogglePalette).not.toHaveBeenCalled();
    expect(handlers.onNavigate).not.toHaveBeenCalled();
  });
});
