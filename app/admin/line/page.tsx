import { RefreshButton } from "@/components/admin/RefreshButton";
import { LineAutoRefresh } from "@/components/admin/line/LineAutoRefresh";
import { LineAvatar } from "@/components/admin/line/LineAvatar";
import { LineContactList } from "@/components/admin/line/LineContactList";
import { LineReplyForm } from "@/components/admin/line/LineReplyForm";
import { LineSeenMarker } from "@/components/admin/line/LineSeenMarker";
import { LineThread } from "@/components/admin/line/LineThread";
import { FilterLinks } from "@/components/admin/queue-tools/FilterLinks";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { Input } from "@/components/ui/input";
import {
  lineInboxHref,
  parseLineInboxView,
  type LineContactFilter,
} from "@/lib/admin/queue-tools/line";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getLineContact, getLineMessages, listLineContacts } from "@/lib/supabase/line-oa";

export const dynamic = "force-dynamic";

const FILTER_LABEL: Record<LineContactFilter, string> = {
  all: "All chats",
  unanswered: "Unanswered",
};

export default async function LineInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string; filter?: string }>;
}) {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const view = parseLineInboxView(await searchParams);
  const { contactId: c, q: search, filter } = view;
  const [list, active, messages] = await Promise.all([
    listLineContacts({ search: search || undefined, filter }),
    c ? getLineContact(c) : null,
    c ? getLineMessages(c) : [],
  ]);
  // Unread counts are cleared by LineSeenMarker in the browser, not here: this
  // render also runs on the 15-second auto refresh.

  return (
    <div className="space-y-3">
      <LineAutoRefresh />
      <AdminPageHeader
        eyebrow="Inbox"
        title="LINE"
        description="@passionseed. Replies sent here are saved; replies typed in LINE OA Manager are not."
        actions={<RefreshButton />}
      />

      <div className="grid h-[calc(100vh-17rem)] min-h-[480px] grid-cols-1 overflow-hidden rounded-lg border md:grid-cols-[320px_1fr]">
        <aside className="flex min-h-0 flex-col border-b md:border-b-0 md:border-r">
          <div className="space-y-2 border-b p-2">
            <FilterLinks
              label="Chats"
              items={(["all", "unanswered"] as const).map((value) => ({
                key: value,
                label: FILTER_LABEL[value],
                href: lineInboxHref({ filter: value, contactId: c, q: search }),
                active: filter === value,
              }))}
            />
            <form role="search">
              {c && <input type="hidden" name="c" value={c} />}
              {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
              <Input
                name="q"
                defaultValue={search}
                placeholder="Search by name"
                aria-label="Search chats by name"
                className="h-11 lg:[@media(pointer:fine)]:h-9"
              />
            </form>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <LineContactList
              contacts={list.contacts}
              activeId={active?.id ?? null}
              search={search}
              filter={filter}
            />
            {list.truncated && (
              <p role="status" className="border-t px-3 py-2.5 text-xs text-muted-foreground">
                Showing the {list.limit} most recent chats. Search by name to find older ones.
              </p>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          {active ? (
            <>
              <LineSeenMarker contactId={active.id} unreadCount={active.unread_count} />
              <header className="flex items-center gap-3 border-b px-4 py-2.5">
                <LineAvatar contact={active} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{active.display_name ?? "LINE user"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {active.is_following ? active.status_message ?? "Friend" : "Blocked or unfollowed"}
                  </p>
                </div>
              </header>
              <LineThread messages={messages} />
              <LineReplyForm key={active.id} contactId={active.id} disabled={!active.is_following} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
              {view.contactRequested ? "Conversation not found." : "Pick a conversation to read and reply."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
