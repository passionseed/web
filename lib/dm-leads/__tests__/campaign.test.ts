import {
  applyVariant,
  assignVariant,
  buildQueue,
  hoursUntilWindowCloses,
  CAMPAIGN_VARIANTS,
  type CampaignCandidate,
} from "@/lib/dm-leads/campaign";
import { EMPTY_SIGNALS } from "@/lib/dm-leads/playbook";

const NOW = Date.parse("2026-08-17T12:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

function candidate(over: Partial<CampaignCandidate> = {}): CampaignCandidate {
  return {
    conversationId: "c1",
    bucket: "never_pitched",
    interests: [],
    adminTags: [],
    signals: { ...EMPTY_SIGNALS, hasInbound: true, lastInboundMessageAt: hoursAgo(2) },
    ...over,
  };
}

describe("assignVariant", () => {
  it("is stable for the same lead and campaign", () => {
    expect(assignVariant("conv-1", "camp-1")).toBe(assignVariant("conv-1", "camp-1"));
  });

  it("only ever returns a known arm", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(CAMPAIGN_VARIANTS).toContain(assignVariant(`conv-${i}`, "camp-1"));
    }
  });

  it("re-randomises across campaigns so a lead is not stuck in one arm forever", () => {
    const a = Array.from({ length: 60 }, (_, i) => assignVariant(`c${i}`, "camp-a"));
    const b = Array.from({ length: 60 }, (_, i) => assignVariant(`c${i}`, "camp-b"));
    expect(a).not.toEqual(b);
  });

  it("splits roughly evenly", () => {
    const counts = { ask: 0, no_ask: 0 };
    for (let i = 0; i < 1000; i += 1) counts[assignVariant(`conv-${i}`, "camp")] += 1;
    expect(counts.ask).toBeGreaterThan(400);
    expect(counts.no_ask).toBeGreaterThan(400);
  });
});

describe("hoursUntilWindowCloses", () => {
  it("returns the remainder of the 7-day window", () => {
    expect(hoursUntilWindowCloses(hoursAgo(24), NOW)).toBeCloseTo(144, 5);
  });

  it("floors at zero once expired", () => {
    expect(hoursUntilWindowCloses(hoursAgo(200), NOW)).toBe(0);
  });

  it("treats a missing timestamp as expired rather than open", () => {
    expect(hoursUntilWindowCloses(null, NOW)).toBe(0);
  });
});

describe("buildQueue", () => {
  it("orders by time left, soonest to expire first", () => {
    const { entries } = buildQueue(
      [
        candidate({ conversationId: "fresh", signals: { ...EMPTY_SIGNALS, hasInbound: true, lastInboundMessageAt: hoursAgo(1) } }),
        candidate({ conversationId: "urgent", signals: { ...EMPTY_SIGNALS, hasInbound: true, lastInboundMessageAt: hoursAgo(160) } }),
        candidate({ conversationId: "mid", signals: { ...EMPTY_SIGNALS, hasInbound: true, lastInboundMessageAt: hoursAgo(72) } }),
      ],
      "camp",
      NOW
    );
    expect(entries.map((e) => e.conversationId)).toEqual(["urgent", "mid", "fresh"]);
  });

  it("excludes threads the lead never replied to, since no window ever opened", () => {
    const { entries, skipped } = buildQueue(
      [candidate({ signals: { ...EMPTY_SIGNALS, hasInbound: false } })],
      "camp",
      NOW
    );
    expect(entries).toHaveLength(0);
    expect(skipped.never_replied).toBe(1);
  });

  it("excludes threads past the 7-day window", () => {
    const { entries, skipped } = buildQueue(
      [candidate({ signals: { ...EMPTY_SIGNALS, hasInbound: true, lastInboundMessageAt: hoursAgo(200) } })],
      "camp",
      NOW
    );
    expect(entries).toHaveLength(0);
    expect(skipped.window_closed).toBe(1);
  });

  it("excludes internal accounts and already-swept threads", () => {
    const { entries, skipped } = buildQueue(
      [
        candidate({ conversationId: "a", adminTags: ["internal"] }),
        candidate({ conversationId: "b", alreadyTargeted: true }),
        candidate({ conversationId: "c", bucket: "done" }),
      ],
      "camp",
      NOW
    );
    expect(entries).toHaveLength(0);
    expect(skipped.internal).toBe(1);
    expect(skipped.already_targeted).toBe(1);
    expect(skipped.done).toBe(1);
  });

  it("is byte-identical when rebuilt, so queue drift is detectable", () => {
    const input = [
      candidate({ conversationId: "a" }),
      candidate({ conversationId: "b" }),
      candidate({ conversationId: "c" }),
    ];
    expect(buildQueue(input, "camp", NOW)).toEqual(buildQueue(input, "camp", NOW));
  });

  it("attaches the bucket's next script and its rung", () => {
    const { entries } = buildQueue(
      [candidate({ bucket: "waiting_unqualified" })],
      "camp",
      NOW
    );
    expect(entries[0].rung).toBe(1);
    expect(entries[0].script.body).toContain("ขอถาม 2 ข้อสั้นๆ");
  });
});

describe("applyVariant", () => {
  it("leaves the ask arm untouched", () => {
    const body = "เดี๋ยวพี่ทำแผนให้เลย เอาไหมครับ";
    expect(applyVariant(body, "ask")).toBe(body);
  });

  it("strips only the trailing ask for the no_ask arm", () => {
    expect(applyVariant("เดี๋ยวพี่ทำแผนให้เลย เอาไหมครับ", "no_ask")).toBe(
      "เดี๋ยวพี่ทำแผนให้เลย"
    );
  });

  it("keeps a mid-message question, which is the whole content at rung 1", () => {
    const body = "น้องอยู่ ม.ไหน แล้วสนใจคณะไหนอยู่ครับ บอกมาหมดเลยก็ได้";
    expect(applyVariant(body, "no_ask")).toBe(body);
  });

  it("never returns empty when the body is nothing but the ask", () => {
    expect(applyVariant("เอาไหมครับ", "no_ask")).toBe("เอาไหมครับ");
  });
});

describe("buildQueue fences Radar-origin threads (spec 5.6)", () => {
  it("never queues a radar thread and counts it as skipped", () => {
    const { entries, skipped } = buildQueue(
      [
        candidate({ conversationId: "sales" }),
        candidate({ conversationId: "radar-1", origin: "radar" }),
        candidate({ conversationId: "radar-2", origin: "radar", bucket: "hot" }),
      ],
      "camp",
      NOW
    );
    expect(entries.map((e) => e.conversationId)).toEqual(["sales"]);
    expect(skipped.radar_origin).toBe(2);
  });
});
