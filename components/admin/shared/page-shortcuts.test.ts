import { pageShortcutsPaused } from "./page-shortcuts";

const keydown = (init: KeyboardEventInit = {}) =>
  new KeyboardEvent("keydown", { key: "Enter", cancelable: true, ...init });

afterEach(() => {
  document.body.innerHTML = "";
});

describe("pageShortcutsPaused", () => {
  it("lets keys through when nothing else owns the keyboard", () => {
    expect(pageShortcutsPaused(keydown())).toBe(false);
  });

  it.each(["dialog", "alertdialog"])("pauses while a %s is open", (role) => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", role);
    document.body.appendChild(dialog);
    expect(pageShortcutsPaused(keydown())).toBe(true);
  });

  it("pauses when the key was already handled", () => {
    const event = keydown({ key: "Escape" });
    event.preventDefault();
    expect(pageShortcutsPaused(event)).toBe(true);
  });
});
