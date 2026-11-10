/**
 * The overview and the command palette open these hrefs. Each one must parse
 * to exactly the filter its queue counts, or the badge and the list disagree.
 */
import { ADMIN_QUEUE_BY_KEY, type AdminQueueKey } from "@/lib/admin/console";
import { parseDmLeadView } from "@/lib/admin/queue-tools/dm-leads";
import { parseExpertsView } from "@/lib/admin/queue-tools/experts";
import { parseIgCommentsView } from "@/lib/admin/queue-tools/ig-comments";
import { parseLineInboxView } from "@/lib/admin/queue-tools/line";
import { parseMetaWebhooksView, receiptStatusesFor } from "@/lib/admin/queue-tools/meta-webhooks";
import { parseShiftApplicationsView } from "@/lib/admin/queue-tools/shift-applications";
import { parseTalentView } from "@/lib/admin/queue-tools/talent";

function link(key: AdminQueueKey) {
  const url = new URL(ADMIN_QUEUE_BY_KEY[key].href, "https://admin.invalid");
  return { path: url.pathname, params: url.searchParams };
}

const SHIFT = { defaultCohort: "SHIFT[3]", cohorts: ["SHIFT[3]"] };

test("DMs awaiting our reply", () => {
  const { path, params } = link("dm_awaiting_reply");
  expect(path).toBe("/admin/dm-leads");
  const view = parseDmLeadView(params);
  expect(view.filters.myTurnOnly).toBe(true);
  expect(view.filters.openOnly).toBe(true);
  expect(view.filters.sort).toBe("waiting");
});

test("DM follow-ups due", () => {
  const { path, params } = link("dm_followup_due");
  expect(path).toBe("/admin/dm-leads");
  expect(parseDmLeadView(params).filters.followUpDue).toBe(true);
});

test("LINE chats to answer", () => {
  const { path, params } = link("line_unanswered");
  expect(path).toBe("/admin/line");
  expect(parseLineInboxView(params).filter).toBe("unanswered");
});

test("IG comments to answer", () => {
  const { path, params } = link("ig_missed");
  expect(path).toBe("/admin/ig-comments");
  // The missed list is the queue's own rule (getCommentsMissedByDm(7)), not every unreplied comment.
  expect(parseIgCommentsView(params).filter).toBe("missed");
});

test("SHIFT application queues", () => {
  expect(parseShiftApplicationsView(link("shift_new_applications").params, SHIFT).status).toBe("new");
  expect(parseShiftApplicationsView(link("shift_awaiting_payment").params, SHIFT)).toMatchObject({
    status: "accepted",
    paid: "unpaid",
  });
  expect(parseShiftApplicationsView(link("shift_paid_not_in_discord").params, SHIFT).paid).toBe(
    "not_in_discord",
  );
});

test("experts, talent, trials, webhooks", () => {
  expect(parseExpertsView(link("experts_pending").params).status).toBe("pending");
  expect(link("talent_unverified").path).toBe("/admin/talent");
  expect(parseTalentView(link("talent_unverified").params).filter).toBe("unverified");
  expect(link("trials_pending").path).toBe("/admin/trials");
  const webhooks = parseMetaWebhooksView(link("meta_webhook_failures").params);
  expect(receiptStatusesFor(webhooks.status)).toEqual(["failed", "partial"]);
  // The label says "last 24 hours", so the link carries the same window.
  expect(webhooks.since).toBe("24h");
});
