import { shouldSkipRadarAnalytics } from "@/lib/radar/analytics-host";
import { createClient } from "@/utils/supabase/client";
import {
  careerRequestResultForError,
  cleanEventMetadata,
  createGuideTrackerCore,
  eventPageKey,
  guideEventArgs,
  guideEventOnceKey,
  recordGuideEvent,
  recordRadarVisit,
  submitCareerRequest,
  visitAttrPayload,
  TRACKER_EVENTS_PER_MINUTE,
} from "../events";

jest.mock("@/lib/radar/analytics-host", () => ({ shouldSkipRadarAnalytics: jest.fn() }));
jest.mock("@/utils/supabase/client", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/supabase/radar", () => ({ getRadarSessionId: () => "session-12345678" }));

const VISIT = "6f1c2c4e-5b7a-4d1e-9f0a-1b2c3d4e5f60";
const CARD = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

function mockRpc(error: { code?: string } | null = null) {
  const rpc = jest.fn().mockResolvedValue({ error });
  jest.mocked(createClient).mockReturnValue({ rpc } as never);
  return rpc;
}

beforeEach(() => {
  jest.mocked(shouldSkipRadarAnalytics).mockReturnValue(false);
});

describe("guideEventArgs", () => {
  const ctx = { sessionId: "session-12345678", visitId: VISIT, fieldSlug: "cybersecurity" };

  it("maps an event to the RPC contract", () => {
    expect(
      guideEventArgs(ctx, {
        type: "interactive_tap",
        chapterKey: "money",
        cardId: CARD,
        target: "salary:level",
        valueInt: 2,
        metadata: { level: "senior" },
      })
    ).toEqual({
      p_session_id: "session-12345678",
      p_visit_id: VISIT,
      p_event_type: "interactive_tap",
      p_field_slug: "cybersecurity",
      p_chapter_key: "money",
      p_card_id: CARD,
      p_target: "salary:level",
      p_value_int: 2,
      p_metadata: { level: "senior" },
    });
  });

  it("sends a guide page key as p_chapter_key, ahead of a deck chapter", () => {
    expect(guideEventArgs(ctx, { type: "chapter_view", pageKey: "mythos" })?.p_chapter_key).toBe("mythos");
    expect(guideEventArgs(ctx, { type: "chapter_view", pageKey: "first_job" })?.p_chapter_key).toBe("first_job");
    expect(guideEventArgs(ctx, { type: "chapter_view", pageKey: "tonight", chapterKey: "start" })?.p_chapter_key).toBe(
      "tonight"
    );
    const tap = guideEventArgs(ctx, { type: "interactive_tap", pageKey: "mythos", target: "mythos:firefox-guess", valueInt: 3 });
    expect(tap).toMatchObject({ p_chapter_key: "mythos", p_target: "mythos:firefox-guess", p_value_int: 3 });
  });

  it("drops a malformed page key, falling back to a valid deck chapter", () => {
    expect(guideEventArgs(ctx, { type: "chapter_view", pageKey: "Mythos-1" })?.p_chapter_key).toBeNull();
    expect(guideEventArgs(ctx, { type: "chapter_view", pageKey: "x" })?.p_chapter_key).toBeNull();
    expect(guideEventArgs(ctx, { type: "chapter_view", pageKey: "Mythos-1", chapterKey: "money" })?.p_chapter_key).toBe(
      "money"
    );
    expect(eventPageKey({ pageKey: "mythos" })).toBe("mythos");
  });

  it("drops the synthetic __score__ card id and other non-UUIDs", () => {
    expect(guideEventArgs(ctx, { type: "chapter_view", cardId: "__score__" })?.p_card_id).toBeNull();
  });

  it("drops a card id on the hub (the RPC checks cards against a field)", () => {
    expect(guideEventArgs({ ...ctx, fieldSlug: null }, { type: "cta_click", cardId: CARD })?.p_card_id).toBeNull();
  });

  it("drops fields that would fail SQL", () => {
    const args = guideEventArgs(ctx, {
      type: "share_click",
      chapterKey: "Evil" as never,
      target: "LINE share",
      valueInt: -1,
    });
    expect(args).toMatchObject({ p_chapter_key: null, p_target: null, p_value_int: null });
    expect(guideEventArgs(ctx, { type: "video_progress", valueInt: 100001 })?.p_value_int).toBeNull();
    expect(guideEventArgs(ctx, { type: "video_progress", valueInt: 2.5 })?.p_value_int).toBeNull();
  });

  it("rejects unknown event types", () => {
    expect(guideEventArgs(ctx, { type: "page_view" as never })).toBeNull();
  });
});

describe("cleanEventMetadata", () => {
  it("keeps primitives with simple keys and trims long strings", () => {
    expect(
      cleanEventMetadata({ ok: true, n: 3, s: "x".repeat(500), "Bad Key": 1, nan: Number.NaN })
    ).toEqual({ ok: true, n: 3, s: "x".repeat(120) });
  });

  it("drops everything when the result is still too big", () => {
    const big: Record<string, string> = {};
    for (let i = 0; i < 12; i += 1) big[`k${i}`] = "y".repeat(120);
    expect(cleanEventMetadata(big)).toEqual({});
  });
});

describe("visitAttrPayload", () => {
  it("sends only known, non-null keys", () => {
    expect(
      visitAttrPayload({
        utm_source: "ig-bio",
        utm_medium: "bio",
        utm_campaign: null,
        utm_content: null,
        referrer_host: "l.instagram.com",
        ua_app: "instagram",
      })
    ).toEqual({ utm_source: "ig-bio", utm_medium: "bio", referrer_host: "l.instagram.com", ua_app: "instagram" });
    expect(visitAttrPayload(null)).toEqual({});
  });
});

describe("RPC wrappers", () => {
  it("records a visit with the session, visit and attribution", async () => {
    const rpc = mockRpc();
    await recordRadarVisit({
      visitId: VISIT,
      fieldSlug: "cybersecurity",
      attribution: { utm_source: "share", utm_medium: "share", utm_campaign: "radar", utm_content: null, referrer_host: null, ua_app: null },
    });
    expect(rpc).toHaveBeenCalledWith("record_radar_visit", {
      p_session_id: "session-12345678",
      p_visit_id: VISIT,
      p_field_slug: "cybersecurity",
      p_attr: { utm_source: "share", utm_medium: "share", utm_campaign: "radar" },
    });
  });

  it("skips writes on local hosts", async () => {
    jest.mocked(shouldSkipRadarAnalytics).mockReturnValue(true);
    const rpc = mockRpc();
    await recordRadarVisit({ visitId: VISIT, fieldSlug: null, attribution: null });
    await recordGuideEvent({ visitId: VISIT, fieldSlug: null }, { type: "cta_click" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("never throws when the client fails", async () => {
    jest.mocked(createClient).mockImplementation(() => {
      throw new Error("offline");
    });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    await expect(recordRadarVisit({ visitId: VISIT, fieldSlug: null, attribution: null })).resolves.toBeUndefined();
    await expect(recordGuideEvent({ visitId: VISIT, fieldSlug: null }, { type: "cta_click" })).resolves.toBeUndefined();
    await expect(submitCareerRequest({ visitId: VISIT, fieldSlug: null }, "นักบัญชี")).resolves.toBe("failed");
    warn.mockRestore();
  });

  it("validates a career request before sending it", async () => {
    const rpc = mockRpc();
    await expect(submitCareerRequest({ visitId: VISIT, fieldSlug: "cybersecurity" }, "@someone")).resolves.toBe("invalid");
    expect(rpc).not.toHaveBeenCalled();
    await expect(submitCareerRequest({ visitId: VISIT, fieldSlug: "cybersecurity" }, "  เชฟร้าน   เบอร์เกอร์ ")).resolves.toBe("ok");
    expect(rpc).toHaveBeenCalledWith("submit_radar_career_request", {
      p_session_id: "session-12345678",
      p_visit_id: VISIT,
      p_text: "เชฟร้าน เบอร์เกอร์",
      p_from_field_slug: "cybersecurity",
    });
  });

  it("maps RPC errors to form states", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockRpc({ code: "P0001" });
    await expect(submitCareerRequest({ visitId: null, fieldSlug: null }, "นักบัญชี")).resolves.toBe("rate_limited");
    expect(careerRequestResultForError({ code: "22023" })).toBe("invalid");
    expect(careerRequestResultForError({ code: "500" })).toBe("failed");
    expect(careerRequestResultForError(null)).toBe("ok");
    warn.mockRestore();
  });
});

describe("createGuideTrackerCore", () => {
  it("queues events until the visit is known, then sends them", () => {
    const send = jest.fn();
    const core = createGuideTrackerCore("cybersecurity", { send });
    core.track({ type: "chapter_view", chapterKey: "hook" });
    expect(send).not.toHaveBeenCalled();
    core.setVisit(VISIT);
    expect(send).toHaveBeenCalledWith({ visitId: VISIT, fieldSlug: "cybersecurity" }, { type: "chapter_view", chapterKey: "hook" });
  });

  it("sends once-events at most once per visit, repeatable events every time", () => {
    const send = jest.fn();
    const core = createGuideTrackerCore("cybersecurity", { send });
    core.setVisit(VISIT);
    core.track({ type: "chapter_view", chapterKey: "money" });
    core.track({ type: "chapter_view", chapterKey: "money" });
    core.track({ type: "video_progress", chapterKey: "money", valueInt: 25 });
    core.track({ type: "video_progress", chapterKey: "money", valueInt: 50 });
    core.track({ type: "share_click", target: "line" });
    core.track({ type: "share_click", target: "line" });
    expect(send).toHaveBeenCalledTimes(5);
  });

  it("stays under the per-minute limit", () => {
    let t = 0;
    const send = jest.fn();
    const core = createGuideTrackerCore(null, { send, now: () => t });
    core.setVisit(VISIT);
    for (let i = 0; i < TRACKER_EVENTS_PER_MINUTE + 10; i += 1) core.track({ type: "interactive_tap", target: "chapters:open" });
    expect(send).toHaveBeenCalledTimes(TRACKER_EVENTS_PER_MINUTE);
    t = 61_000;
    core.track({ type: "interactive_tap", target: "chapters:open" });
    expect(send).toHaveBeenCalledTimes(TRACKER_EVENTS_PER_MINUTE + 1);
  });

  it("passes the visit to career requests", async () => {
    const submit = jest.fn().mockResolvedValue("ok");
    const core = createGuideTrackerCore("cybersecurity", { submit });
    core.setVisit(VISIT);
    await core.submitCareerRequest("นักบัญชี");
    expect(submit).toHaveBeenCalledWith({ visitId: VISIT, fieldSlug: "cybersecurity" }, "นักบัญชี");
  });

  it("dedups on the cleaned values, like SQL", () => {
    expect(guideEventOnceKey(VISIT, { type: "video_play", chapterKey: "Bad" as never })).toBe(`${VISIT}|video_play||-1`);
    expect(guideEventOnceKey(VISIT, { type: "cta_click" })).toBeNull();
    expect(guideEventOnceKey(VISIT, { type: "chapter_view", pageKey: "mythos" })).toBe(`${VISIT}|chapter_view|mythos|-1`);
    expect(guideEventOnceKey(VISIT, { type: "chapter_view", pageKey: "Mythos-1" })).toBe(`${VISIT}|chapter_view||-1`);
  });
});
