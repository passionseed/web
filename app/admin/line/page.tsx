import { RefreshButton } from "@/components/admin/RefreshButton";
import { LineAutoRefresh } from "@/components/admin/line/LineAutoRefresh";
import { LineAvatar } from "@/components/admin/line/LineAvatar";
import { LineContactList } from "@/components/admin/line/LineContactList";
import { LineReplyForm } from "@/components/admin/line/LineReplyForm";
import { LineThread } from "@/components/admin/line/LineThread";
import { Input } from "@/components/ui/input";
import {
  getLineContact,
  getLineMessages,
  listLineContacts,
  markLineContactSeen,
} from "@/lib/supabase/line-oa";

export const dynamic = "force-dynamic";

export default async function LineInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string }>;
}) {
  const { c, q } = await searchParams;
  const search = q?.trim() ?? "";
  const [allContacts, active, messages] = await Promise.all([
    listLineContacts(search || undefined),
    c ? getLineContact(c) : null,
    c ? getLineMessages(c) : [],
  ]);
  if (active && active.unread_count > 0) {
    await markLineContactSeen(active.id);
  }
  // The list was read before the open chat was marked seen.
  const contacts = allContacts.map((contact) =>
    contact.id === active?.id ? { ...contact, unread_count: 0 } : contact
  );

  return (
    <div className="space-y-3">
      <LineAutoRefresh />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-semibold">LINE inbox</h2>
          <p className="text-xs text-muted-foreground">
            @passionseed · replies sent here are saved; replies typed in LINE OA Manager are not
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid h-[calc(100vh-11rem)] min-h-[480px] grid-cols-1 overflow-hidden rounded-lg border md:grid-cols-[320px_1fr]">
        <aside className="flex min-h-0 flex-col border-b md:border-b-0 md:border-r">
          <form className="border-b p-2">
            {c && <input type="hidden" name="c" value={c} />}
            <Input name="q" defaultValue={search} placeholder="Search by name" className="h-8" />
          </form>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <LineContactList contacts={contacts} activeId={active?.id ?? null} search={search} />
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          {active ? (
            <>
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
              {c ? "Conversation not found." : "Pick a conversation to read and reply."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
