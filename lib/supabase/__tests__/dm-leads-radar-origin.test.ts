/** @jest-environment node */
import { createAdminClient } from "@/utils/supabase/admin";
import { recordInboundMessage, sendAdminReply } from "@/lib/supabase/dm-leads";
import { hasRecentRadarDms, isRadarOriginCandidate } from "@/lib/supabase/radar-reels";
import { getInstagramProfile } from "@/lib/meta/graph";
import { RADAR_THREAD_REPLY } from "@/lib/radar-guide/dm-copy";

jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));
jest.mock("@/lib/supabase/radar-reels", () => ({
  isRadarOriginCandidate: jest.fn(),
  hasRecentRadarDms: jest.fn(async () => false),
}));
jest.mock("@/lib/meta/graph", () => ({
  sendMetaMessage: jest.fn(async () => "mid.1"),
  getInstagramProfile: jest.fn(async () => ({ username: "student.one", displayName: null })),
}));

type Result = { data: unknown; error: unknown };

/**
 * A PostgREST stand-in keyed by table. Every chained call is recorded; the
 * terminal (`single`, `maybeSingle` or `await`) resolves with the next result
 * queued for that table and operation.
 */
function fakeDb(results: Record<string, Result[]>) {
  const calls: { table: string; op: string; args: unknown[] }[] = [];
  const from = (table: string) => {
    let op = "select";
    const take = (): Result => {
      const queue = results[`${table}.${op}`] ?? [];
      return queue.shift() ?? { data: null, error: null };
    };
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "in", "order", "limit", "not", "gte", "or"]) {
      query[method] = (...args: unknown[]) => {
        calls.push({ table, op: method, args });
        return query;
      };
    }
    for (const method of ["insert", "update", "upsert", "delete"]) {
      query[method] = (...args: unknown[]) => {
        op = method;
        calls.push({ table, op: method, args });
        return query;
      };
    }
    query.single = async () => take();
    query.maybeSingle = async () => take();
    query.then = (resolve: (v: unknown) => unknown, reject: (r: unknown) => unknown) =>
      Promise.resolve(take()).then(resolve, reject);
    return query;
  };
  jest.mocked(createAdminClient).mockReturnValue({ from } as never);
  return calls;
}

const CONVERSATION = {
  id: "conv-1",
  platform: "instagram",
  platform_thread_id: "990001",
  platform_user_id: "990001",
  username: null,
  display_name: null,
  origin: null,
};

const INBOUND = {
  platform: "instagram" as const,
  platformThreadId: "990001",
  platformUserId: "990001",
  body: "ขอบคุณค่ะ",
  platformMessageId: "mid.in.1",
  sentAt: "2026-11-11T10:00:00.000Z",
};

beforeEach(() => jest.clearAllMocks());

describe("recordInboundMessage Radar tagging", () => {
  it("tags a new conversation from someone we sent a Radar DM to", async () => {
    jest.mocked(isRadarOriginCandidate).mockResolvedValue(true);
    const calls = fakeDb({
      "dm_conversations.select": [{ data: null, error: null }],
      "dm_conversations.upsert": [{ data: CONVERSATION, error: null }],
      "dm_messages.insert": [{ data: { id: "msg-1" }, error: null }],
    });
    const write = await recordInboundMessage(INBOUND);
    expect(isRadarOriginCandidate).toHaveBeenCalledWith(
      { platformUserId: "990001", username: null },
      expect.anything()
    );
    expect(calls).toContainEqual({ table: "dm_conversations", op: "update", args: [{ origin: "radar" }] });
    expect((write.conversation as { origin?: string }).origin).toBe("radar");
  });

  it("leaves an existing conversation's origin alone", async () => {
    const calls = fakeDb({
      "dm_conversations.select": [{ data: { id: "conv-1" }, error: null }],
      "dm_conversations.upsert": [{ data: CONVERSATION, error: null }],
      "dm_messages.insert": [{ data: { id: "msg-1" }, error: null }],
    });
    await recordInboundMessage(INBOUND);
    expect(isRadarOriginCandidate).not.toHaveBeenCalled();
    expect(calls.some((c) => c.op === "update" && c.table === "dm_conversations")).toBe(false);
  });

  it("does not tag a new conversation from anyone else", async () => {
    jest.mocked(isRadarOriginCandidate).mockResolvedValue(false);
    const calls = fakeDb({
      "dm_conversations.select": [{ data: null, error: null }],
      "dm_conversations.upsert": [{ data: CONVERSATION, error: null }],
      "dm_messages.insert": [{ data: { id: "msg-1" }, error: null }],
    });
    const write = await recordInboundMessage(INBOUND);
    expect(calls.some((c) => c.op === "update" && c.table === "dm_conversations")).toBe(false);
    expect((write.conversation as { origin?: string | null }).origin).toBeNull();
  });

  it("falls back to the handle when the comment id and sender id differ", async () => {
    jest.mocked(hasRecentRadarDms).mockResolvedValueOnce(true);
    jest
      .mocked(isRadarOriginCandidate)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const calls = fakeDb({
      "dm_conversations.select": [{ data: null, error: null }],
      "dm_conversations.upsert": [{ data: CONVERSATION, error: null }],
      "dm_messages.insert": [{ data: { id: "msg-1" }, error: null }],
    });
    await recordInboundMessage(INBOUND);
    expect(getInstagramProfile).toHaveBeenCalledWith("990001");
    expect(jest.mocked(isRadarOriginCandidate).mock.calls[1][0]).toEqual({
      platformUserId: null,
      username: "student.one",
    });
    expect(calls).toContainEqual({ table: "dm_conversations", op: "update", args: [{ origin: "radar" }] });
  });

  it("skips the Graph lookup while no Radar DMs are going out", async () => {
    jest.mocked(isRadarOriginCandidate).mockResolvedValue(false);
    fakeDb({
      "dm_conversations.select": [{ data: null, error: null }],
      "dm_conversations.upsert": [{ data: CONVERSATION, error: null }],
      "dm_messages.insert": [{ data: { id: "msg-1" }, error: null }],
    });
    await recordInboundMessage(INBOUND);
    expect(getInstagramProfile).not.toHaveBeenCalled();
  });

  it("still records the message when the Radar check fails", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.mocked(isRadarOriginCandidate).mockRejectedValue(new Error("db down"));
    fakeDb({
      "dm_conversations.select": [{ data: null, error: null }],
      "dm_conversations.upsert": [{ data: CONVERSATION, error: null }],
      "dm_messages.insert": [{ data: { id: "msg-1" }, error: null }],
    });
    await expect(recordInboundMessage(INBOUND)).resolves.toMatchObject({ outcome: "created", messageId: "msg-1" });
    spy.mockRestore();
  });
});

describe("sending to a Radar-origin thread", () => {
  it("refuses a free-text admin reply", async () => {
    fakeDb({ "dm_conversations.select": [{ data: { origin: "radar" }, error: null }] });
    await expect(sendAdminReply("conv-1", "สนใจคอร์สไหมครับ")).rejects.toThrow(/Career Radar/);
  });

  it("refuses an attachment", async () => {
    fakeDb({ "dm_conversations.select": [{ data: { origin: "radar" }, error: null }] });
    await expect(
      sendAdminReply("conv-1", { text: RADAR_THREAD_REPLY, attachmentUrl: "https://x/y.png" })
    ).rejects.toThrow(/Career Radar/);
  });

  it("allows the fixed Radar thread reply", async () => {
    fakeDb({
      "dm_conversations.select": [
        { data: { origin: "radar" }, error: null },
        { data: { platform: "instagram", platform_user_id: "990001", last_message_at: "x", last_message_direction: "inbound" }, error: null },
      ],
      "dm_messages.select": [{ data: { sent_at: new Date().toISOString() }, error: null }],
      "dm_messages.insert": [{ data: { id: "out-1" }, error: null }],
    });
    await expect(sendAdminReply("conv-1", RADAR_THREAD_REPLY)).resolves.toBeUndefined();
  });
});
