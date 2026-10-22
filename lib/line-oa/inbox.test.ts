/** @jest-environment node */

import * as line from "@line/bot-sdk";
import { sendLineInboxReply } from "@/lib/line-oa/inbox";
import { pushLineOaText, replyLineOaText } from "@/lib/line-oa/client";
import {
  claimLineReplyToken,
  getLatestMarkAsReadToken,
  getLineContact,
  recordLineOutboundMessage,
} from "@/lib/supabase/line-oa";

jest.mock("@/lib/line-oa/client", () => ({
  ...jest.requireActual("@/lib/line-oa/client"),
  getLineOaProfile: jest.fn(),
  markLineOaRead: jest.fn(),
  pushLineOaText: jest.fn(),
  replyLineOaText: jest.fn(),
}));
jest.mock("@/lib/supabase/line-oa", () => ({
  claimLineReplyToken: jest.fn(),
  getLatestMarkAsReadToken: jest.fn(),
  getLineContact: jest.fn(),
  getOrCreateLineContact: jest.fn(),
  recordLineFollowChange: jest.fn(),
  recordLineInboundMessage: jest.fn(),
  recordLineOutboundMessage: jest.fn(),
  saveLineContactProfile: jest.fn(),
}));

const mockedClaim = jest.mocked(claimLineReplyToken);
const mockedContact = jest.mocked(getLineContact);
const mockedReply = jest.mocked(replyLineOaText);
const mockedPush = jest.mocked(pushLineOaText);
const mockedRecord = jest.mocked(recordLineOutboundMessage);

const contact = {
  id: "contact-1",
  line_user_id: "U-test-user",
  display_name: "Test",
  picture_url: null,
  status_message: null,
  is_following: true,
  profile_fetched_at: null,
  last_message_at: null,
  last_message_preview: null,
  last_message_direction: null,
  unread_count: 1,
  created_at: "2026-10-22T00:00:00.000Z",
};

function lineError(status: number) {
  return new line.HTTPFetchError("LINE error", {
    status,
    statusText: "err",
    headers: new Headers(),
    body: "{}",
  });
}

const send = () =>
  sendLineInboxReply({ contactId: "contact-1", text: "  ได้เลยครับ  ", adminUserId: "admin-1" });

beforeEach(() => {
  jest.resetAllMocks();
  mockedContact.mockResolvedValue(contact);
  jest.mocked(getLatestMarkAsReadToken).mockResolvedValue(null);
});

describe("sendLineInboxReply", () => {
  it("uses a free reply token when one is available", async () => {
    mockedClaim.mockResolvedValue("reply-token");
    mockedReply.mockResolvedValue("sent-1");

    await expect(send()).resolves.toEqual({ method: "reply" });
    expect(mockedReply).toHaveBeenCalledWith("reply-token", "ได้เลยครับ");
    expect(mockedPush).not.toHaveBeenCalled();
    expect(mockedRecord).toHaveBeenCalledWith(
      expect.objectContaining({ sendMethod: "reply", sendStatus: "sent", lineMessageId: "sent-1", text: "ได้เลยครับ" })
    );
  });

  it("falls back to push when LINE rejects an expired reply token", async () => {
    mockedClaim.mockResolvedValue("old-token");
    mockedReply.mockRejectedValue(lineError(400));
    mockedPush.mockResolvedValue("sent-2");

    await expect(send()).resolves.toEqual({ method: "push" });
    expect(mockedPush).toHaveBeenCalledWith("U-test-user", "ได้เลยครับ", expect.any(String));
    expect(mockedRecord).toHaveBeenCalledWith(
      expect.objectContaining({ sendMethod: "push", sendStatus: "sent" })
    );
  });

  it("does not push after an ambiguous reply failure", async () => {
    mockedClaim.mockResolvedValue("reply-token");
    mockedReply.mockRejectedValue(lineError(500));

    await expect(send()).rejects.toThrow("LINE 500");
    expect(mockedPush).not.toHaveBeenCalled();
    expect(mockedRecord).toHaveBeenCalledWith(expect.objectContaining({ sendStatus: "failed" }));
  });

  it("pushes when there is no reply token and logs a failed push", async () => {
    mockedClaim.mockResolvedValue(null);
    mockedPush.mockRejectedValue(lineError(429));

    await expect(send()).rejects.toThrow();
    expect(mockedRecord).toHaveBeenCalledWith(
      expect.objectContaining({ sendStatus: "failed", sendMethod: null })
    );
  });

  it("rejects empty and over-long messages before calling LINE", async () => {
    await expect(
      sendLineInboxReply({ contactId: "contact-1", text: "   ", adminUserId: "admin-1" })
    ).rejects.toThrow("Message is empty");
    await expect(
      sendLineInboxReply({ contactId: "contact-1", text: "x".repeat(5001), adminUserId: "admin-1" })
    ).rejects.toThrow("5000");
    expect(mockedClaim).not.toHaveBeenCalled();
  });
});
