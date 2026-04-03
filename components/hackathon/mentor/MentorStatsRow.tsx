import type { MentorBooking, MentorSessionType, MentorTeamAssignment } from "@/types/mentor";

type Props = {
  bookings: MentorBooking[];
  sessionType: MentorSessionType;
  assignments?: MentorTeamAssignment[];
};

export default function MentorStatsRow({ bookings, sessionType, assignments = [] }: Props) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const thisWeek = bookings.filter((b) => {
    const d = new Date(b.slot_datetime);
    return d >= weekStart && d < weekEnd && b.status !== "cancelled";
  }).length;

  const totalHours =
    bookings
      .filter((b) => b.status !== "cancelled")
      .reduce((sum, b) => sum + b.duration_minutes, 0) / 60;

  const stats =
    sessionType === "group"
      ? [
          { label: "Teams Assigned", value: String(assignments.length) },
          { label: "This Week", value: String(thisWeek) },
          {
            label: "Total Bookings",
            value: String(bookings.filter((b) => b.status !== "cancelled").length),
          },
        ]
      : [
          {
            label: "Total Bookings",
            value: String(bookings.filter((b) => b.status !== "cancelled").length),
          },
          { label: "This Week", value: String(thisWeek) },
          { label: "Hours Given", value: totalHours.toFixed(1) },
        ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl px-5 py-4 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
            border: "1px solid rgba(74,107,130,0.3)",
          }}
        >
          <p
            className="text-2xl font-bold font-[family-name:var(--font-space-mono)]"
            style={{ color: "#91C4E3" }}
          >
            {s.value}
          </p>
          <p
            className="text-xs mt-1 font-[family-name:var(--font-mitr)]"
            style={{ color: "#5a7a94" }}
          >
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}
