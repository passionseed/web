import {
  isRadarAutoDmEnabled,
  maybeAutoSendRadarDm,
  radarSendErrorCode,
  sendRadarDmFromAdmin,
  type RadarDmComment,
  type RadarDmDeps,
} from "../comment-dm";
import { RADAR_PUBLIC_REPLIES, RADAR_PUBLIC_REPLY_HOURLY_CAP } from "../dm-copy";
import type { ClaimRadarCommentDmArgs, RadarReel } from "../types";

const NOW = Date.parse("2026-11-11T10:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

const REEL: RadarReel = {
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
};

function comment(over: Partial<RadarDmComment> = {}): RadarDmComment {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ig_comment_id: "17855555555555555",
    media_id: REEL.mediaId!,
    text: "RADAR",
    username: "student.one",
    ig_user_id: "990001",
    commented_at: hoursAgo(1),
    ...over,
  };
}

interface FakeRow {
  id: string;
  status: "claimed" | "sent" | "failed" | "skipped";
  claimedAt: number;
  public_reply: string | null;
  patches: Record<string, unknown>[];
}

/**
 * In-memory stand-in for the database and Graph. The claim mirrors the SQL:
 * a new row wins, a failed row can be reclaimed, a fresh claim or a sent row
 * cannot, and a comment answered outside Radar is never claimed.
 */
function fakeDeps(over: Partial<RadarDmDeps> = {}, opts: { publicCount?: number; repliedOutside?: boolean } = {}) {
  const rows = new Map<string, FakeRow>();
  const calls = {
    claim: [] as ClaimRadarCommentDmArgs[],
    privateReply: [] as [string, string][],
    quickReply: [] as [string, string, { title: string; payload: string }[]][],
    publicReply: [] as [string, string][],
    clearReplied: [] as string[],
  };
  let seq = 0;
  const deps: RadarDmDeps = {
    getReel: async (mediaId) => (mediaId === REEL.mediaId ? REEL : null),
    getLinkCode: async (reelId) => (reelId === REEL.id ? "cyber-money-k3f9" : null),
    claim: async (args) => {
      calls.claim.push(args);
      if (opts.repliedOutside && !rows.has(args.p_comment_id)) return null;
      const existing = rows.get(args.p_comment_id);
      const stale = existing && existing.status === "claimed" && NOW - existing.claimedAt > 10 * 60_000;
      if (existing && existing.status !== "failed" && !stale) return null;
      const row: FakeRow = existing ?? {
        id: `dddddddd-dddd-4ddd-8ddd-00000000000${(seq += 1)}`,
        status: "claimed",
        claimedAt: NOW,
        public_reply: null,
        patches: [],
      };
      row.status = "claimed";
      row.claimedAt = NOW;
      rows.set(args.p_comment_id, row);
      return row.id;
    },
    finish: async (id, patch) => {
      const row = [...rows.values()].find((r) => r.id === id)!;
      row.patches.push(patch);
      if (patch.status) row.status = patch.status;
      if (patch.public_reply !== undefined) row.public_reply = patch.public_reply;
    },
    getDmRow: async (id) => {
      const row = [...rows.values()].find((r) => r.id === id);
      return row ? { public_reply: row.public_reply } : null;
    },
    clearReplied: async (commentId) => {
      calls.clearReplied.push(commentId);
    },
    privateReply: async (igCommentId, text) => {
      calls.privateReply.push([igCommentId, text]);
    },
    privateReplyWithQuickReplies: async (igCommentId, text, options) => {
      calls.quickReply.push([igCommentId, text, options]);
    },
    publicReply: async (igCommentId, text) => {
      calls.publicReply.push([igCommentId, text]);
    },
    countPublicRepliesSince: async () => opts.publicCount ?? 0,
    now: () => NOW,
    autoEnabled: () => true,
    quickReplyEnabled: () => false,
    ...over,
  };
  return { deps, calls, rows };
}

describe("isRadarAutoDmEnabled", () => {
  it("is off unless the env flag is exactly on", () => {
    expect(isRadarAutoDmEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(isRadarAutoDmEnabled({ RADAR_COMMENT_DM_AUTO: "true" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isRadarAutoDmEnabled({ RADAR_COMMENT_DM_AUTO: "on" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});

describe("maybeAutoSendRadarDm", () => {
  it("does nothing while the flag is off", async () => {
    const { deps, calls } = fakeDeps({ autoEnabled: () => false });
    expect(await maybeAutoSendRadarDm(comment(), deps)).toEqual({ status: "skipped", reason: "flag_off" });
    expect(await maybeAutoSendRadarDm(comment({ text: "สวยมาก" }), deps)).toEqual({
      status: "skipped",
      reason: "not_radar",
    });
    expect(calls.claim).toEqual([]);
    expect(calls.privateReply).toEqual([]);
  });

  it("claims, sends the fixed DM to the text comment id, then the public reply", async () => {
    const { deps, calls, rows } = fakeDeps();
    const outcome = await maybeAutoSendRadarDm(comment(), deps);
    expect(outcome).toMatchObject({ status: "sent", reason: "sent", publicReply: "posted" });

    expect(calls.claim).toEqual([
      {
        p_comment_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        p_mode: "auto",
        p_matched_by: "keyword",
        p_reel_id: REEL.id,
        p_field_slug: "cybersecurity",
        p_sent_by: null,
      },
    ]);
    // Graph gets Meta's text id, never the uuid.
    expect(calls.privateReply).toHaveLength(1);
    expect(calls.privateReply[0][0]).toBe("17855555555555555");
    expect(calls.privateReply[0][1]).toContain("สาย ไซเบอร์");
    expect(calls.privateReply[0][1]).toContain("https://passionseed.org/r/cyber-money-k3f9");

    expect(calls.publicReply).toHaveLength(1);
    expect(calls.publicReply[0][0]).toBe("17855555555555555");
    expect(calls.publicReply[0][1].startsWith("@student.one ")).toBe(true);
    expect(RADAR_PUBLIC_REPLIES).toContain(calls.publicReply[0][1].slice("@student.one ".length));

    const row = rows.get("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")!;
    expect(row.status).toBe("sent");
    expect(row.patches[0]).toMatchObject({
      status: "sent",
      link: "https://passionseed.org/r/cyber-money-k3f9",
      sent_at: new Date(NOW).toISOString(),
    });
    expect(row.public_reply).toBe(calls.publicReply[0][1]);
  });

  it("sends the hub DM for a keyword on an unmapped post", async () => {
    const { deps, calls } = fakeDeps();
    const outcome = await maybeAutoSendRadarDm(comment({ media_id: "17999999999999999" }), deps);
    expect(outcome.status).toBe("sent");
    expect(calls.claim[0]).toMatchObject({ p_reel_id: null, p_field_slug: null, p_matched_by: "keyword" });
    expect(calls.privateReply[0][1]).toContain("https://passionseed.org/r/hub-ig");
    expect(calls.privateReply[0][1]).toContain("รวมทุกอาชีพ");
  });

  it("falls back to the hub copy and link when a mapped reel has no link row", async () => {
    const { deps, calls } = fakeDeps({ getLinkCode: async () => null });
    await maybeAutoSendRadarDm(comment(), deps);
    expect(calls.privateReply[0][1]).toContain("/r/hub-ig");
    expect(calls.privateReply[0][1]).not.toContain("สาย ");
  });

  it("sends for an explicit request phrase on a mapped reel", async () => {
    const { deps, calls } = fakeDeps();
    const outcome = await maybeAutoSendRadarDm(comment({ text: "ขอลิงก์ค่ะ" }), deps);
    expect(outcome.status).toBe("sent");
    expect(calls.claim[0].p_matched_by).toBe("request_phrase");
  });

  it("never auto-sends a vague comment on a mapped reel", async () => {
    const { deps, calls } = fakeDeps();
    expect(await maybeAutoSendRadarDm(comment({ text: "ขอค่ะ" }), deps)).toEqual({
      status: "skipped",
      reason: "needs_review",
    });
    expect(calls.claim).toEqual([]);
  });

  it("skips a keyword on a mapped reel with DMs turned off", async () => {
    const { deps, calls } = fakeDeps({ getReel: async () => ({ ...REEL, dmEnabled: false }) });
    expect(await maybeAutoSendRadarDm(comment(), deps)).toEqual({ status: "skipped", reason: "dm_disabled" });
    expect(calls.claim).toEqual([]);
  });

  it("skips a request phrase on an unmapped post", async () => {
    const { deps, calls } = fakeDeps();
    const outcome = await maybeAutoSendRadarDm(comment({ text: "ขอลิงก์", media_id: "17999999999999999" }), deps);
    expect(outcome).toEqual({ status: "skipped", reason: "not_radar" });
    expect(calls.claim).toEqual([]);
  });

  it("skips comments older than 7 days", async () => {
    const { deps, calls } = fakeDeps();
    expect(await maybeAutoSendRadarDm(comment({ commented_at: hoursAgo(7 * 24 + 1) }), deps)).toEqual({
      status: "skipped",
      reason: "too_old",
    });
    expect(await maybeAutoSendRadarDm(comment({ commented_at: "not a date" }), deps)).toMatchObject({
      reason: "too_old",
    });
    expect(calls.claim).toEqual([]);
  });

  it("skips excluded handles and our own account", async () => {
    const { deps, calls } = fakeDeps();
    expect(await maybeAutoSendRadarDm(comment({ username: "TLEZJPS" }), deps)).toEqual({
      status: "skipped",
      reason: "excluded",
    });
    expect(await maybeAutoSendRadarDm(comment({ username: "passion_seed.th" }), deps)).toEqual({
      status: "skipped",
      reason: "self",
    });
    expect(calls.claim).toEqual([]);
  });

  it("does not send when the claim is lost", async () => {
    const { deps, calls } = fakeDeps({ claim: async () => null });
    expect(await maybeAutoSendRadarDm(comment(), deps)).toEqual({ status: "skipped", reason: "claim_lost" });
    expect(calls.privateReply).toEqual([]);
    expect(calls.publicReply).toEqual([]);
  });

  it("never DMs the same comment twice (webhook redelivery, edits, concurrent calls)", async () => {
    const { deps, calls } = fakeDeps();
    const results = await Promise.all([
      maybeAutoSendRadarDm(comment(), deps),
      maybeAutoSendRadarDm(comment(), deps),
    ]);
    const again = await maybeAutoSendRadarDm(comment({ text: "RADAR (edited)" }), deps);
    expect(results.map((r) => r.status).sort()).toEqual(["sent", "skipped"]);
    expect(again).toEqual({ status: "skipped", reason: "claim_lost" });
    expect(calls.privateReply).toHaveLength(1);
    expect(calls.publicReply).toHaveLength(1);
  });

  it("never claims a comment someone already answered outside Radar", async () => {
    const { deps, calls } = fakeDeps({}, { repliedOutside: true });
    expect(await maybeAutoSendRadarDm(comment(), deps)).toMatchObject({ reason: "claim_lost" });
    expect(calls.privateReply).toEqual([]);
  });

  it("marks a failed send failed, reopens the comment, and still posts the public reply", async () => {
    const error = new Error(
      'Failed to private-reply to comment 1785 (400): {"error":{"message":"x","code":100,"error_subcode":33}}'
    );
    const { deps, calls, rows } = fakeDeps({
      privateReply: async () => {
        throw error;
      },
    });
    const outcome = await maybeAutoSendRadarDm(comment(), deps);
    expect(outcome).toMatchObject({ status: "failed", reason: "send_failed", errorCode: "meta_100_33", publicReply: "posted" });
    const row = rows.get("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")!;
    expect(row.status).toBe("failed");
    expect(row.patches[0]).toMatchObject({ status: "failed", error_code: "meta_100_33" });
    expect(calls.clearReplied).toEqual(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
    expect(calls.publicReply).toHaveLength(1);
  });

  it("lets the admin retry a failed row, without a second public reply", async () => {
    let fail = true;
    const { deps, calls, rows } = fakeDeps({
      privateReply: async (id, text) => {
        if (fail) throw new Error("Failed (500): boom");
        calls.privateReply.push([id, text]);
      },
    });
    expect((await maybeAutoSendRadarDm(comment(), deps)).status).toBe("failed");
    fail = false;
    const retry = await sendRadarDmFromAdmin(comment(), "admin-user-id", deps);
    expect(retry).toMatchObject({ status: "sent", publicReply: "already" });
    expect(calls.claim[1]).toMatchObject({ p_mode: "admin", p_sent_by: "admin-user-id", p_matched_by: "keyword" });
    expect(calls.privateReply).toHaveLength(1);
    expect(calls.publicReply).toHaveLength(1);
    expect(rows.get("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")!.status).toBe("sent");
    // A sent row is never reclaimed.
    expect(await sendRadarDmFromAdmin(comment(), "admin-user-id", deps)).toMatchObject({ reason: "claim_lost" });
  });

  it("skips the public reply over the hourly cap but still sends the DM", async () => {
    const { deps, calls } = fakeDeps({}, { publicCount: RADAR_PUBLIC_REPLY_HOURLY_CAP });
    const outcome = await maybeAutoSendRadarDm(comment(), deps);
    expect(outcome).toMatchObject({ status: "sent", publicReply: "capped" });
    expect(calls.privateReply).toHaveLength(1);
    expect(calls.publicReply).toEqual([]);
  });

  it("keeps the DM when the public reply fails", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = fakeDeps({
      publicReply: async () => {
        throw new Error("rate limited");
      },
    });
    expect(await maybeAutoSendRadarDm(comment(), deps)).toMatchObject({ status: "sent", publicReply: "failed" });
    spy.mockRestore();
  });

  it("fails safe when a mapped reel has no label (copy error), and reopens the comment", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { deps, calls } = fakeDeps({ getReel: async () => ({ ...REEL, careerLabelTh: null }) });
    const outcome = await maybeAutoSendRadarDm(comment(), deps);
    expect(outcome).toMatchObject({ status: "failed", reason: "copy_error" });
    expect(calls.privateReply).toEqual([]);
    expect(calls.clearReplied).toHaveLength(1);
    spy.mockRestore();
  });

  it("never throws, even when the database is down", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = fakeDeps({
      claim: async () => {
        throw new Error("db down");
      },
    });
    await expect(maybeAutoSendRadarDm(comment(), deps)).resolves.toEqual({ status: "failed", reason: "error" });
    spy.mockRestore();
  });

  it("in the quick-reply flow sends a button with the claim id and no link", async () => {
    const { deps, calls, rows } = fakeDeps({ quickReplyEnabled: () => true });
    const outcome = await maybeAutoSendRadarDm(comment(), deps);
    expect(outcome).toMatchObject({ status: "sent", reason: "sent_quick_reply" });
    expect(calls.privateReply).toEqual([]);
    const [igId, text, options] = calls.quickReply[0];
    expect(igId).toBe("17855555555555555");
    expect(text).not.toMatch(/https?:/);
    const row = rows.get("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")!;
    expect(options).toEqual([{ title: "ส่งลิงก์ให้เลย", payload: `radar:${row.id}` }]);
    // The stored message is the link DM the tap will send.
    expect(row.patches[0].message).toContain("https://passionseed.org/r/cyber-money-k3f9");
  });
});

describe("sendRadarDmFromAdmin", () => {
  it("ignores the auto flag and sends a needs-review comment as matched_by admin", async () => {
    const { deps, calls } = fakeDeps({ autoEnabled: () => false });
    const outcome = await sendRadarDmFromAdmin(comment({ text: "ขอค่ะ" }), "admin-1", deps);
    expect(outcome.status).toBe("sent");
    expect(calls.claim[0]).toMatchObject({ p_mode: "admin", p_matched_by: "admin", p_sent_by: "admin-1" });
  });

  it("still refuses non-Radar comments, old comments and reels with DMs off", async () => {
    const { deps } = fakeDeps();
    expect(await sendRadarDmFromAdmin(comment({ text: "สวยมาก", media_id: "1799999" }), "a", deps)).toMatchObject({
      reason: "not_radar",
    });
    expect(await sendRadarDmFromAdmin(comment({ commented_at: hoursAgo(200) }), "a", deps)).toMatchObject({
      reason: "too_old",
    });
    const off = fakeDeps({ getReel: async () => ({ ...REEL, dmEnabled: false }) });
    expect(await sendRadarDmFromAdmin(comment(), "a", off.deps)).toMatchObject({ reason: "dm_disabled" });
  });
});

describe("radarSendErrorCode", () => {
  it("classifies Graph failures without leaking message text", () => {
    expect(radarSendErrorCode(new Error('{"error":{"code":10,"error_subcode":2534019}}'))).toBe("privacy_blocked");
    expect(radarSendErrorCode(new Error('{"error":{"code":190}}'))).toBe("meta_190");
    expect(radarSendErrorCode(new Error("Failed to reply (503): upstream"))).toBe("http_503");
    expect(radarSendErrorCode("weird")).toBe("send_failed");
  });
});
