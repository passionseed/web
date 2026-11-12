import { buildRadarDm, RADAR_THREAD_REPLY, radarQuickReplyPayload } from "../dm-copy";
import {
  handleRadarThreadInbound,
  radarThreadDecision,
  type RadarThreadDeps,
  type RadarThreadInbound,
} from "../dm-thread";

const DM_ID = "dddddddd-dddd-4ddd-8ddd-000000000001";
const LINK_DM = buildRadarDm({ fieldSlug: "cybersecurity", careerLabelTh: "ไซเบอร์", linkCode: "cyber-money-k3f9" }).message;

function inbound(over: Partial<RadarThreadInbound> = {}): RadarThreadInbound {
  return {
    conversationId: "conv-1",
    platform: "instagram",
    platformUserId: "990001",
    origin: "radar",
    radarReplySentAt: null,
    quickReplyPayload: null,
    ...over,
  };
}

function fakeDeps(over: Partial<RadarThreadDeps> = {}) {
  let threadReplied = false;
  let tapped = false;
  const sent: [string, string][] = [];
  const recorded: string[] = [];
  const deps: RadarThreadDeps = {
    claimThreadReply: async () => {
      if (threadReplied) return false;
      threadReplied = true;
      return true;
    },
    releaseThreadReply: async () => {
      threadReplied = false;
    },
    getCommentDm: async (id) =>
      id === DM_ID ? { id, status: "sent", message: LINK_DM, dm_tap_at: tapped ? "2026-11-11T00:00:00Z" : null } : null,
    claimTap: async () => {
      if (tapped) return false;
      tapped = true;
      return true;
    },
    releaseTap: async () => {
      tapped = false;
    },
    send: async (_platform, recipient, text) => {
      sent.push([recipient, text]);
      return `mid.${sent.length}`;
    },
    recordOutbound: async (_conversationId, text) => {
      recorded.push(text);
    },
    ...over,
  };
  return { deps, sent, recorded, state: () => ({ threadReplied, tapped }) };
}

describe("radarThreadDecision", () => {
  it("replies once on a radar thread, never on a sales thread", () => {
    expect(radarThreadDecision(inbound())).toEqual({ kind: "thread_reply" });
    expect(radarThreadDecision(inbound({ radarReplySentAt: "2026-11-10T00:00:00Z" }))).toEqual({ kind: "none" });
    expect(radarThreadDecision(inbound({ origin: null }))).toEqual({ kind: "none" });
  });

  it("treats a radar quick-reply payload as a tap, whatever the origin", () => {
    expect(radarThreadDecision(inbound({ origin: null, quickReplyPayload: radarQuickReplyPayload(DM_ID) }))).toEqual({
      kind: "tap",
      dmId: DM_ID,
    });
    expect(radarThreadDecision(inbound({ origin: null, quickReplyPayload: "grade:m4" }))).toEqual({ kind: "none" });
  });
});

describe("handleRadarThreadInbound", () => {
  it("sends the fixed thread reply exactly once", async () => {
    const { deps, sent, recorded } = fakeDeps();
    expect(await handleRadarThreadInbound(inbound(), deps)).toBe("thread_reply_sent");
    expect(await handleRadarThreadInbound(inbound(), deps)).toBe("thread_reply_already");
    expect(sent).toEqual([["990001", RADAR_THREAD_REPLY]]);
    expect(recorded).toEqual([RADAR_THREAD_REPLY]);
  });

  it("sends nothing on a sales thread", async () => {
    const { deps, sent } = fakeDeps();
    expect(await handleRadarThreadInbound(inbound({ origin: null }), deps)).toBe("none");
    expect(sent).toEqual([]);
  });

  it("releases the claim when the send fails so a later message can retry", async () => {
    let fail = true;
    const { deps, sent, state } = fakeDeps();
    const flaky: RadarThreadDeps = {
      ...deps,
      send: async (platform, recipient, text) => {
        if (fail) throw new Error("window closed");
        return deps.send(platform, recipient, text);
      },
    };
    expect(await handleRadarThreadInbound(inbound(), flaky)).toBe("thread_reply_failed");
    expect(state().threadReplied).toBe(false);
    fail = false;
    expect(await handleRadarThreadInbound(inbound(), flaky)).toBe("thread_reply_sent");
    expect(sent).toHaveLength(1);
  });

  it("sends the stored link once per tap, and counts it as the thread's one reply", async () => {
    const { deps, sent, state } = fakeDeps();
    const tap = inbound({ quickReplyPayload: radarQuickReplyPayload(DM_ID) });
    expect(await handleRadarThreadInbound(tap, deps)).toBe("tap_link_sent");
    expect(await handleRadarThreadInbound(tap, deps)).toBe("tap_already");
    expect(sent).toEqual([["990001", LINK_DM]]);
    expect(state().threadReplied).toBe(true);
    // The next plain message gets nothing more.
    expect(await handleRadarThreadInbound(inbound(), deps)).toBe("thread_reply_already");
    expect(sent).toHaveLength(1);
  });

  it("ignores a tap for an unknown row or a stored message that is not a fixed template", async () => {
    const { deps, sent } = fakeDeps();
    expect(
      await handleRadarThreadInbound(
        inbound({ quickReplyPayload: radarQuickReplyPayload("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee") }),
        deps
      )
    ).toBe("tap_invalid");
    const tampered = fakeDeps({
      getCommentDm: async (id) => ({ id, status: "sent", message: "ทักมาคุยกันได้เลย", dm_tap_at: null }),
    });
    expect(
      await handleRadarThreadInbound(inbound({ quickReplyPayload: radarQuickReplyPayload(DM_ID) }), tampered.deps)
    ).toBe("tap_invalid");
    expect(sent).toEqual([]);
    expect(tampered.sent).toEqual([]);
  });

  it("never throws", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = fakeDeps({
      claimThreadReply: async () => {
        throw new Error("db down");
      },
    });
    await expect(handleRadarThreadInbound(inbound(), deps)).resolves.toBe("error");
    spy.mockRestore();
  });
});
