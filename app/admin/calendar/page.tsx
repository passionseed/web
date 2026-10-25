import Link from "next/link";

import { CalendarNotifyForm } from "@/components/admin/CalendarNotifyForm";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { notifySettingsView } from "@/lib/supabase/calendar-notify";

export const dynamic = "force-dynamic";

/** /admin/calendar: where community calendar blocks get announced. */
export default async function CalendarNotifyPage() {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const settings = await notifySettingsView();
  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Calendar notifications</h2>
          <p className="text-xs text-muted-foreground">
            How people hear about blocks on the{" "}
            <Link href="/calendar" className="underline">
              community calendar
            </Link>
            . Group chats only, never one person.
          </p>
        </div>
      </div>
      <CalendarNotifyForm initial={settings} />
    </div>
  );
}
