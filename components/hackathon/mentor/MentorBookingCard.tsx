import type { MentorBooking } from "@/types/mentor";

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  confirmed: { label: "Confirmed", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  cancelled: { label: "Cancelled", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

type Props = {
  booking: MentorBooking;
};

export default function MentorBookingCard({ booking }: Props) {
  const style = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending;
  const dt = new Date(booking.slot_datetime);

  return (
    <div
      className="flex items-center justify-between px-5 py-4 rounded-2xl"
      style={{
        background: "linear-gradient(to right, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
        border: "1px solid rgba(74,107,130,0.25)",
      }}
    >
      <div className="space-y-0.5">
        <p className="text-sm text-white font-medium font-[family-name:var(--font-bai-jamjuree)]">
          {booking.student_id
            ? `Student ${booking.student_id.slice(0, 6)}`
            : "No student yet"}
        </p>
        <p
          className="text-xs font-[family-name:var(--font-space-mono)]"
          style={{ color: "#91C4E3" }}
        >
          {dt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}{" "}
          {dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          {" · "}
          {booking.duration_minutes} min
        </p>
        {booking.notes && (
          <p
            className="text-xs mt-1 font-[family-name:var(--font-mitr)]"
            style={{ color: "#5a7a94" }}
          >
            {booking.notes}
          </p>
        )}
      </div>
      <span
        className="text-xs px-3 py-1 rounded-full font-medium font-[family-name:var(--font-mitr)]"
        style={{
          color: style.color,
          background: style.bg,
          border: `1px solid ${style.color}40`,
        }}
      >
        {style.label}
      </span>
    </div>
  );
}
