import { widgetIdOf, widgetLink } from "./widgets";

describe("board widgets", () => {
  it("round-trips a widget link", () => {
    expect(widgetIdOf(widgetLink("calendar"))).toBe("calendar");
  });

  it("ignores other links", () => {
    expect(widgetIdOf("https://www.youtube.com/watch?v=x")).toBeNull();
    expect(widgetIdOf("https://www.passionseed.org/whiteboard/widget/calendar?x=1")).toBeNull();
    expect(widgetIdOf("https://evil.example/whiteboard/widget/calendar")).toBeNull();
    expect(widgetIdOf(null)).toBeNull();
  });
});
