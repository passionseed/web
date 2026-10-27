import type { MetaWebhookReceiptStatus } from "@/lib/supabase/meta-webhook-events";
import { pickOption, readParam, withQuery, type ParamSource } from "@/lib/admin/queue-tools/url";

/**
 * URL state for /admin/meta-webhooks. Client-safe.
 *   ?status=failed  any failure: a receipt where every event failed ("failed")
 *                   or only some did ("partial"), which is how
 *                   finalizeMetaWebhookReceipt records a mixed batch
 *   ?status=partial partial receipts only
 *   ?kind=<kind>    receipts with at least one event of that exact kind
 *   ?since=24h      receipts received in the last 24 hours (also 7d); the
 *                   overview's webhook-failure queue counts this window
 */

export const META_WEBHOOKS_PATH = "/admin/meta-webhooks";

export const META_WEBHOOK_STATUS_FILTERS = [
  "all",
  "processed",
  "failed",
  "partial",
  "received",
] as const;
export type MetaWebhookStatusFilter = (typeof META_WEBHOOK_STATUS_FILTERS)[number];

export const META_WEBHOOK_STATUS_LABEL: Record<MetaWebhookStatusFilter, string> = {
  all: "All statuses",
  processed: "Processed",
  failed: "Any failure (failed or partial)",
  partial: "Partial only",
  received: "Still processing",
};

export const META_WEBHOOK_SINCE_FILTERS = ["all", "24h", "7d"] as const;
export type MetaWebhookSinceFilter = (typeof META_WEBHOOK_SINCE_FILTERS)[number];

export const META_WEBHOOK_SINCE_LABEL: Record<MetaWebhookSinceFilter, string> = {
  all: "Any time",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
};

const SINCE_HOURS: Record<Exclude<MetaWebhookSinceFilter, "all">, number> = {
  "24h": 24,
  "7d": 7 * 24,
};

/** Event kinds look like "message.attachment" or "event.unknown". */
const KIND_PATTERN = /^[a-z0-9_.:-]{1,64}$/i;

export interface MetaWebhooksView {
  status: MetaWebhookStatusFilter;
  /** Exact event kind, or "" for any. */
  kind: string;
  /** Only receipts received inside this window. */
  since: MetaWebhookSinceFilter;
}

export function parseMetaWebhooksView(source: ParamSource): MetaWebhooksView {
  const kind = (readParam(source, "kind") ?? "").trim();
  return {
    status: pickOption(readParam(source, "status"), META_WEBHOOK_STATUS_FILTERS, "all"),
    kind: KIND_PATTERN.test(kind) ? kind : "",
    since: pickOption(readParam(source, "since"), META_WEBHOOK_SINCE_FILTERS, "all"),
  };
}

/** ISO instant a `since` window starts at, or null for no time bound. */
export function receivedSinceIso(
  since: MetaWebhookSinceFilter,
  now: Date = new Date(),
): string | null {
  if (since === "all") return null;
  return new Date(now.getTime() - SINCE_HOURS[since] * 60 * 60 * 1000).toISOString();
}

/** Receipt statuses a filter matches, or null for no status filter. */
export function receiptStatusesFor(
  filter: MetaWebhookStatusFilter,
): MetaWebhookReceiptStatus[] | null {
  switch (filter) {
    case "all":
      return null;
    case "failed":
      return ["failed", "partial"];
    default:
      return [filter];
  }
}

export function metaWebhooksHref(view: Partial<MetaWebhooksView>): string {
  return withQuery(META_WEBHOOKS_PATH, {
    status: view.status === "all" ? null : view.status,
    kind: view.kind,
    since: view.since === "all" ? null : view.since,
  });
}
