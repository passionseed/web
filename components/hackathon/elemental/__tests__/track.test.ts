/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://passionseed.org/hackathon/elemental/quiz?src=landing"}
 */
import { cleanFunnelEvent, FUNNEL_EVENT_TYPE } from "@/lib/hackathon/elemental/funnel";

import { trackElemental } from "../track";

// The quiz went live on 24 Nov with no plays counted. This checks the browser
// side on the production host: starting the quiz sends one well-formed event.
describe("trackElemental on passionseed.org", () => {
  const fetchMock = jest.fn(() => Promise.resolve({ ok: true }));

  beforeAll(() => {
    Object.defineProperty(globalThis, "fetch", { value: fetchMock, writable: true });
    if (typeof crypto.randomUUID !== "function") {
      Object.defineProperty(crypto, "randomUUID", { value: () => "6f1c7c1e-1d2b-4c3a-9f00-0a1b2c3d4e5f" });
    }
  });

  it("sends quiz_start with its source, once per page load, in a shape the endpoint keeps", () => {
    trackElemental({ step: "quiz_start", source: "landing" });
    trackElemental({ step: "quiz_start", source: "landing" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/hackathon/track-event");
    const body = JSON.parse(String(init.body));
    expect(body.event_type).toBe(FUNNEL_EVENT_TYPE);
    expect(body.page_path).toBe("/hackathon/elemental/quiz");
    expect(cleanFunnelEvent(body.event_data, "passionseed.org")).toMatchObject({
      step: "quiz_start",
      source: "landing",
      host: "passionseed.org",
    });
  });

  it("sends every invite share from the paid page, not only the first", () => {
    fetchMock.mockClear();
    trackElemental({ step: "invite_shared", detail: "paid:line" }, { once: false });
    trackElemental({ step: "invite_shared", detail: "paid:line" }, { once: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
