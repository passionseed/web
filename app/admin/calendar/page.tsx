import Link from "next/link";

import { CalendarNotifyForm } from "@/components/admin/CalendarNotifyForm";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { notifySettingsView } from "@/lib/supabase/calendar-notify";
import { ATTENDANCE_DAYS, recentAttendance } from "@/lib/supabase/calendar";

export const dynamic = "force-dynamic";

/** /admin/calendar: where community calendar blocks get announced. */
export default async function CalendarNotifyPage() {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const [settings, attendance] = await Promise.all([notifySettingsView(), recentAttendance()]);
  return (
    <div className="max-w-3xl space-y-4">
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

      <section className="space-y-2 pt-6">
        <h3 className="font-medium">Attendance, last {ATTENDANCE_DAYS} days</h3>
        <p className="text-xs text-muted-foreground">
          Read from each block&apos;s room board: an Arrive, Help, I can help or Close card counts the person who placed it.
          Counts only; it shows who used the board, not who spoke in voice. Older blocks are not reported.
        </p>
        {attendance.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocks with a room board yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1">Block</th>
                <th>Arrived / booked</th>
                <th>Walk-ins</th>
                <th>Asked help</th>
                <th>Gave help</th>
                <th>Closed</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="py-1.5">
                    <Link href={`/calendar?block=${row.id}`} className="underline">
                      {row.title}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {new Date(row.startsAt).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </td>
                  <td>
                    {row.attendance.bookedArrived}/{row.attendance.booked}
                  </td>
                  <td>{row.attendance.walkIns}</td>
                  <td>{row.attendance.askedHelp}</td>
                  <td>{row.attendance.gaveHelp}</td>
                  <td>{row.attendance.closed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
