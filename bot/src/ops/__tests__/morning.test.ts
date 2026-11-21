/**
 * @jest-environment node
 *
 * The 08:30 morning post (bot/src/ops/morning.ts): once a Bangkok day, only
 * to the configured staff channel, never a ping, the claim given back when a
 * send fails. Made-up operations only.
 */
import type { OpsApi } from "../api";
import type { OpSummary } from "../model";
import { morningTick, type ChannelCheck, type MorningDeps, type MorningState } from "../morning";

const at = (bangkok: string) => Date.parse(`${bangkok}+07:00`);

function summary(over: Partial<OpSummary> = {}): OpSummary {
  return {
    slug: "snack-run",
    title: "Snack run",
    owner: "Sam",
    deadline_text: "Wed 9 Dec",
    deadline_on: "2026-12-09",
    status: "Started",
    steps_done: 1,
    steps_total: 3,
    ...over,
  };
}

function setup(over: Partial<MorningDeps> = {}, ops: OpSummary[] = [summary()]) {
  const send = jest.fn().mockResolvedValue(undefined);
  const claimed = new Set<string>();
  const api = {
    board: jest.fn().mockResolvedValue(ops),
    claimMorning: jest.fn(async (day: string) => {
      if (claimed.has(day)) return false;
      claimed.add(day);
      return true;
    }),
    releaseMorning: jest.fn(async (day: string) => {
      claimed.delete(day);
    }),
  } as unknown as jest.Mocked<OpsApi>;
  const log = jest.fn();
  const deps: MorningDeps = {
    api,
    now: () => at("2026-12-08T08:30:00"),
    connected: () => true,
    channel: async (): Promise<ChannelCheck> => ({ ok: true, channel: { send } }),
    log,
    ...over,
  };
  const state: MorningState = { settled: null, warned: null };
  return { deps, state, send, api, log, claimed };
}

describe("morning post", () => {
  it("waits for 08:30 Bangkok and stops trying at noon", async () => {
    const early = setup({ now: () => at("2026-12-08T08:29:00") });
    expect(await morningTick(early.deps, early.state)).toBe("outside");
    const late = setup({ now: () => at("2026-12-08T12:00:00") });
    expect(await morningTick(late.deps, late.state)).toBe("outside");
    expect(early.send).not.toHaveBeenCalled();
    expect(late.send).not.toHaveBeenCalled();
  });

  it("posts the due list and the board once a day, with no pings", async () => {
    const { deps, state, send } = setup();
    expect(await morningTick(deps, state)).toBe("sent");
    expect(await morningTick(deps, state)).toBe("settled");
    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0];
    expect(message.allowedMentions).toEqual({ parse: [] });
    expect(message.embeds).toHaveLength(2);
    expect(message.embeds[0].description).toContain("Due in the next 48 hours");
    expect(message.embeds[0].description).toContain("Snack run");
    expect(message.embeds[1].title).toBe("Operations board");
  });

  it("does not post when another process already claimed today", async () => {
    const { deps, state, send, claimed } = setup();
    claimed.add("2026-12-08");
    expect(await morningTick(deps, state)).toBe("taken");
    expect(send).not.toHaveBeenCalled();
  });

  it("posts nothing when every operation is done or there are none", async () => {
    const done = setup({}, [summary({ steps_done: 3 })]);
    expect(await morningTick(done.deps, done.state)).toBe("nothing");
    const none = setup({}, []);
    expect(await morningTick(none.deps, none.state)).toBe("nothing");
    expect(done.send).not.toHaveBeenCalled();
    expect(none.send).not.toHaveBeenCalled();
  });

  it("gives the claim back after a failed send and tries again", async () => {
    const { deps, state, send, api } = setup();
    send.mockRejectedValueOnce(new Error("Missing Access"));
    expect(await morningTick(deps, state)).toBe("failed");
    expect(api.releaseMorning).toHaveBeenCalledWith("2026-12-08");
    expect(await morningTick(deps, state)).toBe("sent");
  });

  it("never claims or posts when the channel is wrong, and logs it once a day", async () => {
    const { deps, state, send, api, log } = setup({
      channel: async () => ({ ok: false, reason: "the ops channel is visible to @everyone; make it staff-only" }),
    });
    expect(await morningTick(deps, state)).toBe("no_channel");
    expect(await morningTick(deps, state)).toBe("no_channel");
    expect(api.claimMorning).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("waits while the gateway is down", async () => {
    const { deps, state, api } = setup({ connected: () => false });
    expect(await morningTick(deps, state)).toBe("offline");
    expect(api.claimMorning).not.toHaveBeenCalled();
  });

  it("splits a board too long for one message into two", async () => {
    const many = Array.from({ length: 24 }, (_, k) =>
      summary({ slug: `op-${k}`, title: `Operation ${k} ${"t".repeat(100)}`, status: "s".repeat(300), deadline_on: "2026-12-09" })
    );
    const { deps, state, send } = setup({}, many);
    expect(await morningTick(deps, state)).toBe("sent");
    expect(send).toHaveBeenCalledTimes(2);
    for (const [message] of send.mock.calls) expect(message.allowedMentions).toEqual({ parse: [] });
  });
});
