import type { AdminQueueKey } from "@/lib/admin/console";

import { makeSnapshot } from "../__fixtures__/overview";
import { attentionSentence, buildAttention, freshestSnapshot, listLabels } from "../attention";

describe("buildAttention", () => {
  it("orders open queues by urgency, then size, and skips empty ones", () => {
    const model = buildAttention(
      makeSnapshot([
        { key: "experts_pending", count: 9 }, // soon
        { key: "shift_new_applications", count: 2 }, // today
        { key: "line_unanswered", count: 1 }, // now
        { key: "dm_awaiting_reply", count: 4 }, // now
        { key: "ig_missed", count: 0 },
      ]),
    );
    expect(model.rows.map((r) => r.key)).toEqual([
      "dm_awaiting_reply",
      "line_unanswered",
      "shift_new_applications",
      "experts_pending",
    ]);
    expect(model.total).toBe(16);
    expect(model.nowTotal).toBe(5);
  });

  it("keeps the loader's deep link and falls back to the registry's", () => {
    const model = buildAttention(
      makeSnapshot([
        { key: "trials_pending", count: 1, href: "/admin/trials?status=pending" },
        { key: "experts_pending", count: 1, href: "" },
      ]),
    );
    expect(model.rows.map((r) => r.href)).toEqual([
      "/admin/trials?status=pending",
      "/admin/experts?status=pending",
    ]);
  });

  it("lists queues that failed to load separately", () => {
    const model = buildAttention(
      makeSnapshot([
        { key: "line_unanswered", count: null },
        { key: "ig_missed", count: 3, approximate: true },
      ]),
    );
    expect(model.failed.map((d) => d.key)).toEqual(["line_unanswered"]);
    expect(model.rows).toHaveLength(1);
    expect(model.approximate).toBe(true);
  });

  it("ignores queue keys this build does not know", () => {
    const model = buildAttention(
      makeSnapshot([
        { key: "mystery_queue" as AdminQueueKey, count: 5 },
        { key: "ig_missed", count: 1 },
      ]),
    );
    expect(model.rows.map((r) => r.key)).toEqual(["ig_missed"]);
  });

  it("reports a missing snapshot as not loaded", () => {
    expect(buildAttention(null)).toMatchObject({ loaded: false, rows: [], total: 0 });
  });
});

describe("attentionSentence", () => {
  const sentence = (queues: Parameters<typeof makeSnapshot>[0]) =>
    attentionSentence(buildAttention(makeSnapshot(queues)));

  it("counts the work and calls out what is urgent", () => {
    expect(
      sentence([
        { key: "dm_awaiting_reply", count: 2 },
        { key: "experts_pending", count: 3 },
      ]),
    ).toBe("5 things need you, 2 of them now.");
    expect(sentence([{ key: "dm_awaiting_reply", count: 1 }])).toBe("1 thing needs you now.");
    expect(sentence([{ key: "experts_pending", count: 3 }])).toBe("3 things need you.");
  });

  it("says up to when a count is an upper bound", () => {
    expect(sentence([{ key: "ig_missed", count: 4, approximate: true }])).toBe(
      "Up to 4 things need you.",
    );
  });

  it("is calm when nothing is waiting", () => {
    expect(sentence([{ key: "ig_missed", count: 0 }])).toBe(
      "All clear, nothing is waiting on the team.",
    );
    expect(sentence([{ key: "ig_missed", count: null }])).toBe(
      "Nothing waiting in the queues that loaded.",
    );
    expect(attentionSentence(buildAttention(null))).toBe("Work queues could not load.");
  });

  it("never uses an em dash", () => {
    expect(sentence([{ key: "dm_awaiting_reply", count: 2 }])).not.toContain("\u2014");
  });
});

describe("freshestSnapshot", () => {
  const older = makeSnapshot([], "2026-10-26T04:59:00.000Z");
  const newer = makeSnapshot([], "2026-10-26T05:01:00.000Z");

  it("prefers whichever was read last", () => {
    expect(freshestSnapshot(newer, older)).toBe(newer);
    expect(freshestSnapshot(older, newer)).toBe(newer);
    expect(freshestSnapshot(null, older)).toBe(older);
    expect(freshestSnapshot(newer, null)).toBe(newer);
    expect(freshestSnapshot(null, null)).toBeNull();
  });
});

describe("listLabels", () => {
  it("joins labels as a sentence", () => {
    const model = buildAttention(
      makeSnapshot([
        { key: "line_unanswered", count: null },
        { key: "ig_missed", count: null },
        { key: "experts_pending", count: null },
      ]),
    );
    expect(listLabels(model.failed)).toBe(
      "LINE chats to answer, IG comments to answer and Expert interviews to review",
    );
  });
});
