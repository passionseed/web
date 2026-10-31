import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminEmptyState, AdminErrorState } from "@/components/admin/shared/AdminStates";
import { formatBangkokDateTime } from "@/lib/admin/queue-tools/format";
import {
  META_WEBHOOK_SINCE_FILTERS,
  META_WEBHOOK_SINCE_LABEL,
  META_WEBHOOK_STATUS_FILTERS,
  META_WEBHOOK_STATUS_LABEL,
  META_WEBHOOKS_PATH,
  parseMetaWebhooksView,
  receivedSinceIso,
  receiptStatusesFor,
} from "@/lib/admin/queue-tools/meta-webhooks";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  getRecentMetaWebhookReceipts,
  type MetaWebhookReceiptWithEvents,
} from "@/lib/supabase/meta-webhook-events";

export const dynamic = "force-dynamic";

const RECEIPT_LIMIT = 100;

function formatTimestamp(value: string | null): string {
  return formatBangkokDateTime(value, { year: true, seconds: true });
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "failed" || status === "partial") return "destructive";
  if (status === "ignored" || status === "duplicate") return "secondary";
  if (status === "processed") return "default";
  return "outline";
}

async function loadReceipts(
  view: ReturnType<typeof parseMetaWebhooksView>,
): Promise<MetaWebhookReceiptWithEvents[] | null> {
  try {
    return await getRecentMetaWebhookReceipts(RECEIPT_LIMIT, {
      statuses: receiptStatusesFor(view.status),
      eventKind: view.kind || null,
      receivedSince: receivedSinceIso(view.since),
    });
  } catch (error) {
    console.error("[admin/meta-webhooks] failed to load receipts", error);
    return null;
  }
}

/**
 * Deliveries per body hash. Retries of one body count across every status and
 * kind, so under a filter (say, failed only) the latest unfiltered receipts are
 * counted too: a failed row then still shows that Meta retried it.
 */
async function loadBodyAttempts(
  receipts: MetaWebhookReceiptWithEvents[] | null,
  filtered: boolean,
): Promise<Record<string, number>> {
  const shown = receipts ?? [];
  let recent: MetaWebhookReceiptWithEvents[] = [];
  if (filtered && shown.length > 0) {
    try {
      recent = await getRecentMetaWebhookReceipts(RECEIPT_LIMIT);
    } catch (error) {
      console.error("[admin/meta-webhooks] failed to load retry counts", error);
    }
  }
  const byId = new Map<string, MetaWebhookReceiptWithEvents>();
  for (const receipt of [...shown, ...recent]) byId.set(receipt.id, receipt);
  const counts: Record<string, number> = {};
  for (const receipt of byId.values()) {
    counts[receipt.body_sha256] = (counts[receipt.body_sha256] ?? 0) + 1;
  }
  return counts;
}

export default async function MetaWebhooksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string; since?: string }>;
}) {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const view = parseMetaWebhooksView(await searchParams);
  const filtered = view.status !== "all" || view.kind !== "" || view.since !== "all";
  const receipts = await loadReceipts(view);
  const bodyAttempts = await loadBodyAttempts(receipts, filtered);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Diagnostics"
        title="Meta webhooks"
        description={`Evidence for the latest ${RECEIPT_LIMIT} signed webhook deliveries that match the filters. Raw payloads are kept only for failed or unknown events and cleared after 30 days.`}
      />

      <form
        action={META_WEBHOOKS_PATH}
        className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-3"
      >
        <label className="space-y-1 text-xs font-medium">
          <span>Status</span>
          <select
            name="status"
            defaultValue={view.status === "all" ? "" : view.status}
            className="block h-11 rounded-md border border-input bg-background px-2 text-sm lg:[@media(pointer:fine)]:h-9"
          >
            {META_WEBHOOK_STATUS_FILTERS.map((status) => (
              <option key={status} value={status === "all" ? "" : status}>
                {META_WEBHOOK_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">
          <span>Received</span>
          <select
            name="since"
            defaultValue={view.since === "all" ? "" : view.since}
            className="block h-11 rounded-md border border-input bg-background px-2 text-sm lg:[@media(pointer:fine)]:h-9"
          >
            {META_WEBHOOK_SINCE_FILTERS.map((since) => (
              <option key={since} value={since === "all" ? "" : since}>
                {META_WEBHOOK_SINCE_LABEL[since]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">
          <span>Exact event kind</span>
          <input
            name="kind"
            defaultValue={view.kind}
            placeholder="message.attachment"
            className="block h-11 w-56 rounded-md border border-input bg-background px-2 text-sm lg:[@media(pointer:fine)]:h-9"
          />
        </label>
        <Button type="submit" className="h-11 lg:[@media(pointer:fine)]:h-9">
          Filter
        </Button>
        {filtered && (
          <Link
            href={META_WEBHOOKS_PATH}
            className="inline-flex min-h-11 items-center text-xs underline underline-offset-2 lg:[@media(pointer:fine)]:min-h-9"
          >
            Clear
          </Link>
        )}
      </form>

      {receipts === null ? (
        <AdminErrorState
          title="Could not load webhook receipts"
          message="The diagnostics did not load. This is not an empty list. Refresh the page to try again."
        />
      ) : receipts.length === 0 ? (
        <AdminEmptyState
          title={filtered ? "No webhook receipts match these filters" : "No webhook receipts recorded yet"}
          action={
            filtered ? (
              <Link href={META_WEBHOOKS_PATH} className="text-sm underline underline-offset-2">
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {receipts.map((receipt) => (
            <Card key={receipt.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {receipt.object_type} · {formatTimestamp(receipt.received_at)}
                    </CardTitle>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      Receipt {receipt.id}
                      {receipt.provider_request_id ? ` · Request ${receipt.provider_request_id}` : ""}
                    </p>
                  </div>
                  <Badge variant={statusVariant(receipt.status)}>{receipt.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{receipt.event_count} events</span>
                  <span>{receipt.processed_count} processed</span>
                  <span>{receipt.duplicate_count} duplicate</span>
                  <span>{receipt.ignored_count} ignored</span>
                  <span>{receipt.failed_count} failed</span>
                  {bodyAttempts[receipt.body_sha256] > 1 && (
                    <span>{bodyAttempts[receipt.body_sha256]} matching-body attempts</span>
                  )}
                  <span className="font-mono">Body {receipt.body_sha256.slice(0, 12)}…</span>
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-muted/60 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Event</th>
                        <th className="px-3 py-2 font-medium">Outcome</th>
                        <th className="px-3 py-2 font-medium">Reason / evidence</th>
                        <th className="px-3 py-2 font-medium">Occurred</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipt.meta_webhook_events.map((event) => (
                        <tr key={event.id} className="border-t align-top">
                          <td className="px-3 py-2">
                            <p className="font-medium">{event.event_kind}</p>
                            <p className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground">
                              {event.source_event_id || event.dedupe_key}
                            </p>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={statusVariant(event.processing_status)}>
                              {event.processing_status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            {event.skip_reason && <p>{event.skip_reason}</p>}
                            {event.conversation_id && (
                              <Link
                                href={`/admin/dm-leads/${event.conversation_id}`}
                                className="block break-all text-primary underline underline-offset-2"
                              >
                                Conversation {event.conversation_id}
                              </Link>
                            )}
                            {event.dm_message_id && (
                              <p className="break-all font-mono text-[10px] text-muted-foreground">
                                Message {event.dm_message_id}
                              </p>
                            )}
                            {event.ig_comment_id && (
                              <p className="break-all font-mono text-[10px] text-muted-foreground">
                                Comment {event.ig_comment_id}
                              </p>
                            )}
                            {event.raw_payload && (
                              <details className="mt-1">
                                <summary className="cursor-pointer font-medium text-destructive">
                                  Raw failed/unknown payload
                                </summary>
                                <pre className="mt-1 max-h-48 max-w-xl overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-[10px]">
                                  {JSON.stringify(event.raw_payload, null, 2)}
                                </pre>
                              </details>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            {formatTimestamp(event.occurred_at ?? event.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
