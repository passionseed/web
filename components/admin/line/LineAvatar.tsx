import { cn } from "@/lib/utils";
import type { LineContact } from "@/lib/supabase/line-oa";

export function LineAvatar({
  contact,
  className,
}: {
  contact: Pick<LineContact, "display_name" | "picture_url">;
  className?: string;
}) {
  const initial = (contact.display_name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-medium text-emerald-800",
        className
      )}
    >
      {contact.picture_url ? (
        // LINE profile CDN URLs are signed per user; next/image would need a remote pattern for each.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={contact.picture_url} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
