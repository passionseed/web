import {
  isDeliveryBlockedByPrivacy,
  isDeliveryFailed,
  hasThreadDeliveryFailure,
  getDefaultCommentDmMessage,
  getDefaultPublicCommentReply,
} from "@/lib/dm-leads/delivery-status";
import { shiftCommentDm, shiftCommentPublicReply } from "@/lib/dm-leads/shift-comment-copy";
import type { DmMessage } from "@/types/dm-leads";

describe("delivery-status helpers", () => {
  it("detects privacy block in message body", () => {
    const msg: Partial<DmMessage> = {
      body: "This account can't receive your message because they don't allow new message requests from everyone.",
      send_status: "failed",
    };
    expect(isDeliveryBlockedByPrivacy(msg as DmMessage)).toBe(true);
    expect(isDeliveryFailed(msg as DmMessage)).toBe(true);
  });

  it("detects privacy block in message metadata send_error", () => {
    const msg: Partial<DmMessage> = {
      body: "สวัสดีครับ",
      send_status: "failed",
      metadata: {
        send_error: "(#10) This account can't receive your message because they don't allow new message requests from everyone. (code 2534019)",
      },
    };
    expect(isDeliveryBlockedByPrivacy(msg as DmMessage)).toBe(true);
    expect(isDeliveryFailed(msg as DmMessage)).toBe(true);
  });

  it("returns false for normal delivered message", () => {
    const msg: Partial<DmMessage> = {
      body: "สวัสดีครับ สนใจสายไหนอยู่เอ่ย",
      send_status: "delivered",
      metadata: {},
    };
    expect(isDeliveryBlockedByPrivacy(msg as DmMessage)).toBe(false);
    expect(isDeliveryFailed(msg as DmMessage)).toBe(false);
  });

  it("detects thread failure from list of messages", () => {
    const messages: Partial<DmMessage>[] = [
      { id: "1", direction: "outbound", body: "Hello", send_status: "sent" },
      {
        id: "2",
        direction: "outbound",
        body: "This account can't receive your message because they don't allow new message requests from everyone.",
        send_status: "failed",
      },
    ];
    expect(hasThreadDeliveryFailure(messages as DmMessage[])).toBe(true);
  });

  it("generates friendly public reply mentioning the username", () => {
    const reply = getDefaultPublicCommentReply("kiara.charis");
    expect(reply).toContain("@kiara.charis");
    expect(reply).toContain("privacy");
    expect(reply).toContain("ทัก DM");
  });

  it("keeps the tips DM for campaigns other than SHIFT", () => {
    expect(getDefaultCommentDmMessage()).toContain("https://passionseed.org/tips/intro");
    expect(getDefaultCommentDmMessage("port")).toContain("https://passionseed.org/tips/intro");
    expect(getDefaultCommentDmMessage("uni")).toContain("https://passionseed.org/tips/intro");
    expect(getDefaultPublicCommentReply("kiara.charis", "port")).toContain("privacy");
  });

  it("sends SHIFT comments to the current open cohort", () => {
    expect(getDefaultCommentDmMessage("shift")).toBe(shiftCommentDm());
    expect(getDefaultPublicCommentReply("mind.m5", "shift")).toBe(
      shiftCommentPublicReply("mind.m5")
    );
  });
});
