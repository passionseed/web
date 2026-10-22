import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LineContact } from "@/lib/supabase/line-oa";
import { LineAvatar } from "@/components/admin/line/LineAvatar";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function LineContactList({
  contacts,
  activeId,
  search,
}: {
  contacts: LineContact[];
  activeId: string | null;
  search: string;
}) {
  if (contacts.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        {search ? "No one matches that name." : "No LINE messages yet. New chats appear here."}
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {contacts.map((contact) => {
        const params = new URLSearchParams({ c: contact.id });
        if (search) params.set("q", search);
        const active = contact.id === activeId;
        const unread = contact.unread_count > 0;
        return (
          <li key={contact.id}>
            <Link
              href={`/admin/line?${params}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60",
                active && "bg-muted"
              )}
            >
              <LineAvatar contact={contact} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate text-sm", unread && "font-semibold")}>
                    {contact.display_name ?? "LINE user"}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {timeAgo(contact.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-xs",
                      unread ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {contact.last_message_direction === "outbound" && "You: "}
                    {contact.last_message_preview ?? (contact.is_following ? "Added as friend" : "")}
                  </span>
                  {unread && (
                    <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 text-[11px] font-medium text-white">
                      {contact.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
