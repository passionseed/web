import Link from "next/link";

import { CalendarNotifyForm } from "@/components/admin/CalendarNotifyForm";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/shared/AdminStates";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { notifySettingsView } from "@/lib/supabase/calendar-notify";
import { ATTENDANCE_DAYS, recentAttendance } from "@/lib/supabase/calendar";

export const dynamic = "force-dynamic";

type AttendanceRow = Awaited<ReturnType<typeof recentAttendance>>[number];

function blockTime(startsAt: string): string {
  return new Date(startsAt).toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AttendanceTable({ rows }: { rows: AttendanceRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Block</th>
            <th className="px-3 py-2 font-medium">Arrived / booked</th>
            <th className="px-3 py-2 font-medium">Walk-ins</th>
            <th className="px-3 py-2 font-medium">Asked help</th>
            <th className="px-3 py-2 font-medium">Gave help</th>
            <th className="px-3 py-2 font-medium">Closed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="px-3 py-2">
                <Link href={`/calendar?block=${row.id}`} className="underline underline-offset-4">
                  {row.title}
                </Link>
                <span className="block text-xs text-muted-foreground">{blockTime(row.startsAt)}</span>
              </td>
              <td className="px-3 py-2 tabular-nums">
                {row.attendance.bookedArrived}/{row.attendance.booked}
              </td>
              <td className="px-3 py-2 tabular-nums">{row.attendance.walkIns}</td>
              <td className="px-3 py-2 tabular-nums">{row.attendance.askedHelp}</td>
              <td className="px-3 py-2 tabular-nums">{row.attendance.gaveHelp}</td>
              <td className="px-3 py-2 tabular-nums">{row.attendance.closed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** /admin/calendar: where community calendar blocks get announced. */
export default async function CalendarNotifyPage() {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const [settings, attendance] = await Promise.all([notifySettingsView(), recentAttendance()]);
  return (
    <div className="max-w-3xl space-y-4">
      <AdminPageHeader
        eyebrow="Workspace"
        title="Calendar notifications"
        description={
          <>
            How people hear about blocks on the{" "}
            <Link href="/calendar" className="underline underline-offset-4">
              community calendar
            </Link>
            . Group chats only, never one person.
          </>
        }
      />
      <CalendarNotifyForm initial={settings} />

      <section className="space-y-2 pt-6" aria-labelledby="calendar-attendance">
        <h2 id="calendar-attendance" className="text-base font-semibold">
          Attendance, last {ATTENDANCE_DAYS} days
        </h2>
        <p className="text-xs text-muted-foreground">
          Read from each block&apos;s room board: an Arrive, Help, I can help or Close card counts the person who placed it.
          Counts only; it shows who used the board, not who spoke in voice. Older blocks are not reported.
        </p>
        {attendance.length === 0 ? (
          <AdminEmptyState
            title="No blocks with a room board yet"
            description={`Blocks from the last ${ATTENDANCE_DAYS} days show here once someone places a card on their room board.`}
          />
        ) : (
          <AttendanceTable rows={attendance} />
        )}
      </section>
    </div>
  );
}
