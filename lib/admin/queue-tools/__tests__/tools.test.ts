import { expertsHref, expertsQuery, pageCount, parseExpertsView, parsePage } from "@/lib/admin/queue-tools/experts";
import { daysSince, formatBangkokDateTime } from "@/lib/admin/queue-tools/format";
import {
  igCommentsHref,
  igDmWindow,
  insidePrivateReplyWindow,
  parseIgCommentsView,
} from "@/lib/admin/queue-tools/ig-comments";
import { lineInboxHref, parseLineInboxView } from "@/lib/admin/queue-tools/line";
import {
  metaWebhooksHref,
  parseMetaWebhooksView,
  receivedSinceIso,
  receiptStatusesFor,
} from "@/lib/admin/queue-tools/meta-webhooks";
import {
  isUnverifiedTalent,
  parseTalentView,
  talentHref,
  visibleTalentSignups,
} from "@/lib/admin/queue-tools/talent";

const ID = "0b7c6f5e-1d2a-4c3b-9e8f-7a6b5c4d3e2f";

describe("LINE inbox", () => {
  it("parses the chat, search, and filter", () => {
    expect(parseLineInboxView({ c: ID, q: " Ploy ", filter: "unanswered" })).toEqual({
      contactId: ID,
      contactRequested: true,
      q: "Ploy",
      filter: "unanswered",
    });
  });

  it("treats a malformed chat id as not found instead of querying with it", () => {
    expect(parseLineInboxView({ c: "abc" })).toMatchObject({ contactId: null, contactRequested: true });
    expect(parseLineInboxView({})).toMatchObject({ contactId: null, contactRequested: false, filter: "all" });
  });

  it("keeps the filter and search when opening a chat", () => {
    expect(lineInboxHref({ contactId: ID, q: "ploy", filter: "unanswered" })).toBe(
      `/admin/line?filter=unanswered&c=${ID}&q=ploy`,
    );
    expect(lineInboxHref({ filter: "all" })).toBe("/admin/line");
  });
});

describe("IG comments", () => {
  it("parses and writes the reply and stage filters", () => {
    expect(parseIgCommentsView({ filter: "unreplied", stage: "building" })).toEqual({
      filter: "unreplied",
      stage: "building",
      page: 1,
    });
    expect(parseIgCommentsView({ filter: "x", stage: "y", page: "-2" })).toEqual({
      filter: "all",
      stage: "all",
      page: 1,
    });
    expect(parseIgCommentsView({ page: "3" }).page).toBe(3);
    expect(igCommentsHref({ filter: "unreplied", stage: "all", page: 3 })).toBe(
      "/admin/ig-comments?filter=unreplied&page=3",
    );
    expect(igCommentsHref({ filter: "all", stage: "all", page: 1 })).toBe("/admin/ig-comments");
    expect(igCommentsHref({ filter: "unreplied", stage: "all" })).toBe("/admin/ig-comments?filter=unreplied");
    expect(igCommentsHref({ filter: "all", stage: "exploring" })).toBe("/admin/ig-comments?stage=exploring");
  });

  it("tracks the 7-day private reply window", () => {
    expect(igDmWindow("2026-10-01T00:00:00Z", 2)).toEqual({ state: "replied" });
    expect(igDmWindow(null, 2)).toEqual({ state: "open", daysLeft: 5 });
    expect(igDmWindow(null, 7)).toEqual({ state: "open", daysLeft: 0 });
    expect(igDmWindow(null, 8)).toEqual({ state: "closed" });
  });

  it("has a missed view that keeps only comments inside the 7-day window", () => {
    expect(parseIgCommentsView({ filter: "missed" }).filter).toBe("missed");
    expect(igCommentsHref({ filter: "missed", stage: "all" })).toBe("/admin/ig-comments?filter=missed");
    const now = Date.parse("2026-10-27T03:00:00Z");
    const rows = [
      { id: "fresh", commented_at: "2026-10-25T03:00:00Z" },
      { id: "edge", commented_at: "2026-10-20T03:00:00Z" },
      { id: "old", commented_at: "2026-10-20T02:59:59Z" },
    ];
    expect(insidePrivateReplyWindow(rows, now).map((r) => r.id)).toEqual(["fresh", "edge"]);
  });
});

describe("Bangkok dates", () => {
  it("formats in Asia/Bangkok whatever the server time zone", () => {
    // 17:30 UTC is 00:30 the next day in Bangkok.
    expect(formatBangkokDateTime("2026-10-25T17:30:00Z")).toBe("26 Oct, 00:30");
    expect(formatBangkokDateTime("2026-10-25T17:30:05Z", { year: true, seconds: true })).toBe(
      "26 Oct 2026, 00:30:05",
    );
    expect(formatBangkokDateTime(null)).toBe("-");
    expect(formatBangkokDateTime("garbage")).toBe("-");
  });

  it("counts whole days", () => {
    const now = Date.parse("2026-10-26T12:00:00Z");
    expect(daysSince("2026-10-26T01:00:00Z", now)).toBe(0);
    expect(daysSince("2026-10-24T11:00:00Z", now)).toBe(2);
  });
});

describe("Meta webhooks", () => {
  it("treats failed as any failure, including partial receipts", () => {
    expect(receiptStatusesFor("failed")).toEqual(["failed", "partial"]);
    expect(receiptStatusesFor("partial")).toEqual(["partial"]);
    expect(receiptStatusesFor("all")).toBeNull();
  });

  it("validates the event kind before it reaches SQL", () => {
    expect(parseMetaWebhooksView({ status: "failed", kind: "message.attachment" })).toEqual({
      status: "failed",
      kind: "message.attachment",
      since: "all",
    });
    expect(parseMetaWebhooksView({ status: "nope", kind: "a,b)or(1=1" })).toEqual({
      status: "all",
      kind: "",
      since: "all",
    });
    expect(metaWebhooksHref({ status: "failed", kind: "" })).toBe("/admin/meta-webhooks?status=failed");
  });

  it("bounds receipts by when they were received", () => {
    expect(parseMetaWebhooksView({ since: "24h" }).since).toBe("24h");
    expect(parseMetaWebhooksView({ since: "1y" }).since).toBe("all");
    expect(metaWebhooksHref({ status: "failed", kind: "", since: "24h" })).toBe(
      "/admin/meta-webhooks?status=failed&since=24h",
    );
    const now = new Date("2026-10-27T03:00:00Z");
    expect(receivedSinceIso("all", now)).toBeNull();
    expect(receivedSinceIso("24h", now)).toBe("2026-10-26T03:00:00.000Z");
    expect(receivedSinceIso("7d", now)).toBe("2026-10-20T03:00:00.000Z");
  });
});

describe("Talent", () => {
  const signups = [
    { id: "a", verified: true },
    { id: "b", verified: false },
    { id: "c", verified: null },
  ];

  it("counts null as unverified", () => {
    expect(signups.filter(isUnverifiedTalent).map((s) => s.id)).toEqual(["b", "c"]);
  });

  it("keeps a highlighted signup visible under the unverified filter", () => {
    expect(visibleTalentSignups(signups, { filter: "unverified", id: null }).map((s) => s.id)).toEqual(["b", "c"]);
    expect(visibleTalentSignups(signups, { filter: "unverified", id: "a" }).map((s) => s.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(visibleTalentSignups(signups, { filter: "all", id: null })).toHaveLength(3);
  });

  it("parses and writes the filter and id", () => {
    expect(parseTalentView({ filter: "unverified", id: ID })).toEqual({ filter: "unverified", id: ID });
    expect(parseTalentView({ filter: "x", id: "y" })).toEqual({ filter: "all", id: null });
    expect(talentHref({ filter: "unverified" })).toBe("/admin/talent?filter=unverified");
  });
});

describe("Experts", () => {
  it("defaults to pending, page 1", () => {
    expect(parseExpertsView({})).toEqual({ status: "pending", page: 1, id: null });
  });

  it("accepts claimed and a selected submission", () => {
    expect(parseExpertsView({ status: "claimed", page: "3", id: ID })).toEqual({
      status: "claimed",
      page: 3,
      id: ID,
    });
  });

  it("rejects junk pages", () => {
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("99999999")).toBe(1);
    expect(parsePage("4")).toBe(4);
  });

  it("writes status and page together, leaving defaults out", () => {
    expect(expertsQuery({ status: "approved", page: 1, id: null })).toBe("status=approved");
    expect(expertsQuery({ status: "pending", page: 2, id: null })).toBe("page=2");
    expect(expertsHref({ id: ID })).toBe(`/admin/experts?id=${ID}`);
  });

  it("counts pages", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(20)).toBe(1);
    expect(pageCount(21)).toBe(2);
  });
});
