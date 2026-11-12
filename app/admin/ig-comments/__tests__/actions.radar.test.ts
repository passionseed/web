/**
 * @jest-environment node
 */
import type { IgComment } from "@/types/dm-leads";
import type { RadarQueueItem } from "@/lib/supabase/ig-comments";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/admin/requireAdmin", () => ({
  requireAdmin: jest.fn(async () => ({ id: "admin-1" })),
}));

const graph = {
  privateReplyToComment: jest.fn(async () => {}),
  replyToComment: jest.fn(async () => {}),
};
jest.mock("@/lib/meta/graph", () => ({
  privateReplyToComment: (...args: unknown[]) => graph.privateReplyToComment(...(args as [])),
  replyToComment: (...args: unknown[]) => graph.replyToComment(...(args as [])),
}));

const store = {
  missed: [] as IgComment[],
  queue: [] as RadarQueueItem[],
  byId: new Map<string, IgComment>(),
  radarRows: new Set<string>(),
};
jest.mock("@/lib/supabase/ig-comments", () => ({
  getCommentsMissedByDm: jest.fn(async () => store.missed),
  getRadarCommentQueue: jest.fn(async () => store.queue),
  getCommentById: jest.fn(async (id: string) => store.byId.get(id) ?? null),
  markCommentReplied: jest.fn(async () => {}),
}));

const radarSend = jest.fn(async (_comment: { id: string }, _sentBy: string | null) => ({
  status: "sent" as const,
  reason: "sent" as const,
  publicReply: "posted" as const,
}));
jest.mock("@/lib/radar-guide/comment-dm", () => ({
  sendRadarDmFromAdmin: (comment: { id: string }, sentBy: string | null) => radarSend(comment, sentBy),
}));

const personalize = { dm: jest.fn(async () => "personalized dm"), pub: jest.fn(async () => "personalized pub") };
jest.mock("@/lib/dm-leads/delivery-status", () => ({
  getPersonalizedDmMessage: () => personalize.dm(),
  getPersonalizedPublicCommentReply: () => personalize.pub(),
  isDeliveryBlockedByPrivacy: () => false,
}));

jest.mock("@/utils/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, id: string) => ({
          maybeSingle: async () =>
            table === "ig_comments"
              ? { data: store.byId.get(id) ?? null, error: null }
              : { data: store.radarRows.has(id) ? { id: "dm" } : null, error: null },
          single: async () => ({ data: store.byId.get(id) ?? null, error: null }),
        }),
      }),
    }),
  }),
}));

const reels = new Map<string, unknown>();
jest.mock("@/lib/supabase/radar-reels", () => ({
  getReelByMediaId: jest.fn(async (mediaId: string) => reels.get(mediaId) ?? null),
}));

// Bulk passes pause 1s between sends; keep the suite fast.
jest.spyOn(global, "setTimeout").mockImplementation(((fn: () => void) => {
  fn();
  return 0 as unknown as NodeJS.Timeout;
}) as unknown as typeof setTimeout);

import { replyPrivately, runBulkReply, sendRadarDm } from "../actions";

function igComment(over: Partial<IgComment>): IgComment {
  return {
    id: "c-0",
    ig_comment_id: "1785000",
    media_id: "17900000000000001",
    parent_comment_id: null,
    username: "someone",
    ig_user_id: "990000",
    text: "port",
    grade_level: null,
    stage: "unknown",
    recommended_product: null,
    has_hands_on_experience: false,
    wants_pathlab: false,
    pathlab_pay_ready: false,
    wants_community: false,
    wants_talent: false,
    classified_at: null,
    replied_at: null,
    commented_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...over,
  };
}

function queueItem(comment: IgComment, over: Partial<RadarQueueItem> = {}): RadarQueueItem {
  return {
    comment,
    target: { campaign: "radar", fieldSlug: null, chapterKey: null, reel: null, matchedBy: "keyword" },
    dm: null,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  store.missed = [];
  store.queue = [];
  store.byId = new Map();
  store.radarRows = new Set();
  reels.clear();
});

describe("runBulkReply and Radar comments (spec 5.5)", () => {
  it("on the all tab, sends Radar comments only through the Radar builder, ignoring custom copy", async () => {
    const port = igComment({ id: "c-port", text: "port", username: "port.kid" });
    const radar = igComment({ id: "c-radar", text: "RADAR", username: "radar.kid", ig_comment_id: "1785999" });
    store.missed = [port, radar];

    const result = await runBulkReply({
      mode: "both",
      dmMessage: "custom DM ทักมาคุยได้เลย",
      publicMessage: "custom public",
    });

    expect(radarSend).toHaveBeenCalledTimes(1);
    expect(radarSend.mock.calls[0][0]).toMatchObject({ id: "c-radar", ig_comment_id: "1785999" });
    expect(radarSend.mock.calls[0][1]).toBe("admin-1");
    // Custom copy went to the port comment only.
    expect(graph.privateReplyToComment).toHaveBeenCalledTimes(1);
    expect(graph.privateReplyToComment).toHaveBeenCalledWith(port.ig_comment_id, "custom DM ทักมาคุยได้เลย");
    expect(graph.replyToComment).toHaveBeenCalledWith(port.ig_comment_id, "custom public");
    expect(graph.privateReplyToComment).not.toHaveBeenCalledWith(radar.ig_comment_id, expect.anything());
    expect(personalize.dm).not.toHaveBeenCalled();
    expect(result.sentTo).toEqual(["port.kid", "radar.kid"]);
  });

  it("never personalizes a Radar comment with Qwen", async () => {
    store.missed = [igComment({ id: "c-radar", text: "เรดาร์" })];
    await runBulkReply({ mode: "private" });
    expect(personalize.dm).not.toHaveBeenCalled();
    expect(graph.privateReplyToComment).not.toHaveBeenCalled();
    expect(radarSend).toHaveBeenCalledTimes(1);
  });

  it("the Radar tab sends pending keyword and request comments through the claim, skipping review and refused rows", async () => {
    const a = igComment({ id: "a", text: "RADAR", username: "a" });
    const b = igComment({ id: "b", text: "ขอค่ะ", username: "b" });
    const c = igComment({ id: "c", text: "RADAR", username: "c" });
    const d = igComment({ id: "d", text: "RADAR", username: "d" });
    const e = igComment({ id: "e", text: "RADAR", username: "e" });
    const failedDm = {
      status: "failed" as const,
      matchedBy: "keyword" as const,
      mode: "auto" as const,
      skipReason: null,
      sentAt: null,
      publicReply: true,
    };
    store.queue = [
      queueItem(a),
      queueItem(b, { target: { campaign: "radar", fieldSlug: null, chapterKey: null, reel: null, matchedBy: null, needsReview: true } }),
      queueItem(c, { dm: { ...failedDm, errorCode: "meta_100_33" } }),
      queueItem(d, { dm: { ...failedDm, errorCode: "privacy_blocked" } }),
      queueItem(e, { dm: { ...failedDm, status: "sent", errorCode: null } }),
    ];

    const result = await runBulkReply({ mode: "public", campaign: "radar", dmMessage: "ignored", publicMessage: "ignored" });

    expect(radarSend.mock.calls.map(([comment]) => comment.id)).toEqual(["a", "c"]);
    expect(graph.privateReplyToComment).not.toHaveBeenCalled();
    expect(graph.replyToComment).not.toHaveBeenCalled();
    expect(result).toMatchObject({ sent: 2, dmsDelivered: 2, publicReplies: 2, skipped: 0, dryRun: false });
  });

  it("previews the Radar tab without sending", async () => {
    store.queue = [queueItem(igComment({ id: "a", text: "RADAR", username: "a" }))];
    const result = await runBulkReply({ mode: "both", campaign: "radar", dryRun: true });
    expect(radarSend).not.toHaveBeenCalled();
    expect(result).toMatchObject({ sent: 1, sentTo: ["a"], dryRun: true });
  });
});

describe("single-comment actions", () => {
  it("refuses a free-text DM to a Radar comment", async () => {
    store.byId.set("r1", igComment({ id: "r1", text: "radar ค่ะ" }));
    const result = await replyPrivately("r1", "ทักมาคุยกันได้นะ");
    expect(result.ok).toBe(false);
    expect(graph.privateReplyToComment).not.toHaveBeenCalled();
  });

  it("refuses a free-text DM to a comment that already has a Radar DM row", async () => {
    store.byId.set("r2", igComment({ id: "r2", text: "ขอลิงก์ค่ะ" }));
    store.radarRows.add("r2");
    expect((await replyPrivately("r2", "hello")).ok).toBe(false);
    expect(graph.privateReplyToComment).not.toHaveBeenCalled();
  });

  it("refuses a free-text DM to a link request on a mapped Radar reel (no keyword, no DM row)", async () => {
    reels.set("17900000000000001", {
      id: "11111111-1111-4111-8111-111111111111",
      platform: "instagram",
      mediaId: "17900000000000001",
      shortcode: "DA1b2C3dE",
      fieldSlug: "cybersecurity",
      chapterKey: "money",
      videoKind: "founder",
      angle: "salary_reveal",
      isTrial: false,
      careerLabelTh: "ไซเบอร์",
      dmEnabled: true,
    });
    store.byId.set("r5", igComment({ id: "r5", text: "ขอลิงก์ค่ะ", media_id: "17900000000000001" }));
    expect((await replyPrivately("r5", "hello")).ok).toBe(false);
    expect(graph.privateReplyToComment).not.toHaveBeenCalled();
  });

  it("still allows a free-text DM to the same link request on a post that is not a Radar reel", async () => {
    store.byId.set("r6", igComment({ id: "r6", text: "ขอลิงก์ค่ะ", media_id: "17999999999999999" }));
    expect((await replyPrivately("r6", "hello")).ok).toBe(true);
    expect(graph.privateReplyToComment).toHaveBeenCalledTimes(1);
  });

  it("sendRadarDm runs the admin Radar send with the admin as sent_by", async () => {
    store.byId.set("r3", igComment({ id: "r3", text: "ขอค่ะ" }));
    const result = await sendRadarDm("r3");
    expect(result.ok).toBe(true);
    expect(radarSend).toHaveBeenCalledWith(expect.objectContaining({ id: "r3" }), "admin-1");
  });

  it("sendRadarDm explains a skip", async () => {
    store.byId.set("r4", igComment({ id: "r4", text: "RADAR" }));
    radarSend.mockResolvedValueOnce({ status: "skipped", reason: "claim_lost" } as never);
    const result = await sendRadarDm("r4");
    expect(result).toMatchObject({ ok: false, error: "Already sent, or being sent right now." });
  });
});
