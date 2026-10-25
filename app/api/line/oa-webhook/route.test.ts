/** @jest-environment node */

import type { NextRequest } from "next/server";
import { POST } from "@/app/api/line/oa-webhook/route";
import { verifyLineOaSignature } from "@/lib/line-oa/client";
import { storeLineInboxEvent } from "@/lib/line-oa/inbox";

jest.mock("@/lib/line-oa/client", () => ({ verifyLineOaSignature: jest.fn() }));
jest.mock("@/lib/line-oa/inbox", () => ({ storeLineInboxEvent: jest.fn() }));

const mockedVerify = jest.mocked(verifyLineOaSignature);
const mockedStore = jest.mocked(storeLineInboxEvent);

function requestFor(body: unknown): NextRequest {
  return {
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    headers: new Headers({ "x-line-signature": "signature" }),
  } as unknown as NextRequest;
}

const textEvent = {
  type: "message",
  webhookEventId: "evt-1",
  timestamp: 1_792_000_000_000,
  source: { type: "user", userId: "U-test-user" },
  replyToken: "reply-1",
  message: { id: "msg-1", type: "text", text: "hello" },
};

beforeEach(() => {
  jest.resetAllMocks();
  mockedVerify.mockReturnValue(true);
});

describe("POST /api/line/oa-webhook", () => {
  it("rejects a bad signature without storing anything", async () => {
    mockedVerify.mockReturnValue(false);
    const response = await POST(requestFor({ events: [textEvent] }));
    expect(response.status).toBe(401);
    expect(mockedStore).not.toHaveBeenCalled();
  });

  it("answers LINE's verify request with 200", async () => {
    const response = await POST(requestFor({ destination: "U-bot", events: [] }));
    expect(response.status).toBe(200);
  });

  it("stores each event", async () => {
    mockedStore.mockResolvedValue("created");
    const response = await POST(requestFor({ events: [textEvent] }));
    expect(response.status).toBe(200);
    expect(mockedStore).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "message", webhookEventId: "evt-1", text: "hello" })
    );
  });

  it("returns 500 when storage fails so LINE redelivers", async () => {
    mockedStore.mockRejectedValue(new Error("db down"));
    const response = await POST(requestFor({ events: [textEvent] }));
    expect(response.status).toBe(500);
  });
});
