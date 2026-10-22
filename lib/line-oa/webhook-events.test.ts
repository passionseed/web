import { parseLineWebhook } from "@/lib/line-oa/webhook-events";

const base = {
  mode: "active",
  timestamp: 1_792_000_000_000,
  source: { type: "user", userId: "U-test-user" },
  deliveryContext: { isRedelivery: false },
};

describe("parseLineWebhook", () => {
  it("keeps a text message and moves its tokens out of the stored payload", () => {
    const [event] = parseLineWebhook({
      destination: "U-bot",
      events: [
        {
          ...base,
          type: "message",
          webhookEventId: "evt-text",
          replyToken: "reply-1",
          message: {
            id: "msg-1",
            type: "text",
            text: "สวัสดีครับ",
            quoteToken: "quote-1",
            markAsReadToken: "read-1",
          },
        },
      ],
    });

    expect(event).toEqual({
      kind: "message",
      webhookEventId: "evt-text",
      lineUserId: "U-test-user",
      occurredAt: new Date(base.timestamp).toISOString(),
      replyToken: "reply-1",
      lineMessageId: "msg-1",
      messageType: "text",
      text: "สวัสดีครับ",
      markAsReadToken: "read-1",
      payload: { id: "msg-1", type: "text", text: "สวัสดีครับ" },
    });
  });

  it("keeps stickers and images without text, and names files and locations", () => {
    const events = parseLineWebhook({
      events: [
        { ...base, type: "message", webhookEventId: "e1", message: { id: "m1", type: "sticker", stickerId: "52002734" } },
        { ...base, type: "message", webhookEventId: "e2", message: { id: "m2", type: "image", contentProvider: { type: "line" } } },
        { ...base, type: "message", webhookEventId: "e3", message: { id: "m3", type: "file", fileName: "portfolio.pdf" } },
        { ...base, type: "message", webhookEventId: "e4", message: { id: "m4", type: "location", title: "Siam", address: "Bangkok" } },
      ],
    });

    expect(events.map((event) => (event.kind === "message" ? event.text : null))).toEqual([
      null,
      null,
      "portfolio.pdf",
      "Siam · Bangkok",
    ]);
  });

  it("records follow and unfollow", () => {
    const events = parseLineWebhook({
      events: [
        { ...base, type: "follow", webhookEventId: "f1", replyToken: "reply-f" },
        { ...base, type: "unfollow", webhookEventId: "f2" },
      ],
    });

    expect(events.map((event) => [event.kind, event.replyToken])).toEqual([
      ["follow", "reply-f"],
      ["unfollow", null],
    ]);
  });

  it("drops group chats, unsupported events, and events missing ids", () => {
    const events = parseLineWebhook({
      events: [
        { ...base, source: { type: "group", groupId: "G1", userId: "U1" }, type: "message", webhookEventId: "g", message: { id: "m", type: "text", text: "hi" } },
        { ...base, type: "postback", webhookEventId: "p", postback: { data: "x" } },
        { ...base, type: "message", message: { id: "m", type: "text", text: "no event id" } },
        { ...base, type: "message", webhookEventId: "no-msg-id", message: { type: "text", text: "hi" } },
      ],
    });

    expect(events).toEqual([]);
  });

  it("accepts LINE's empty verification request", () => {
    expect(parseLineWebhook({ destination: "U-bot", events: [] })).toEqual([]);
  });

  it("rejects a body without an events array", () => {
    expect(() => parseLineWebhook({ destination: "U-bot" })).toThrow();
  });
});
