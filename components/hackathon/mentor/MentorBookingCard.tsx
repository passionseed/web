"use client";

import { useState } from "react";
import type { MentorBooking } from "@/types/mentor";

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  confirmed: { label: "Confirmed", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  cancelled: { label: "Cancelled", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

type Props = {
  booking: MentorBooking;
  onUpdate?: (updated: MentorBooking) => void;
};

export default function MentorBookingCard({ booking: initial, onUpdate }: Props) {
  const [booking, setBooking] = useState(initial);
  const [loading, setLoading] = useState<"confirmed" | "cancelled" | null>(null);

  const style = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending;
  const dt = new Date(booking.slot_datetime);

  const updateStatus = async (status: "confirmed" | "cancelled") => {
    setLoading(status);
    const res = await fetch(`/api/hackathon/mentor/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok && data.booking) {
      setBooking(data.booking);
      onUpdate?.(data.booking);
    }
    setLoading(null);
  };

  return (
    <div
      className="px-5 py-4 rounded-2xl space-y-3"
      style={{
        background: "linear-gradient(to right, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
        border: "1px solid rgba(74,107,130,0.25)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm text-white font-medium font-[family-name:var(--font-bai-jamjuree)]">
            {booking.group_name
              ? booking.group_name
              : booking.student_name
              ? booking.student_name
              : booking.student_id
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
          {booking.discord_room !== null && (
            <p
              className="text-xs font-medium font-[family-name:var(--font-space-mono)] mt-1"
              style={{ color: "#a78bfa" }}
            >
              🎮 Discord Room {booking.discord_room}
            </p>
          )}
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
          className="text-xs px-3 py-1 rounded-full font-medium font-[family-name:var(--font-mitr)] shrink-0"
          style={{
            color: style.color,
            background: style.bg,
            border: `1px solid ${style.color}40`,
          }}
        >
          {style.label}
        </span>
      </div>

      {booking.status === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={() => updateStatus("confirmed")}
            disabled={loading !== null}
            className="flex-1 py-1.5 rounded-xl text-xs font-medium font-[family-name:var(--font-mitr)] transition-all"
            style={{
              background: "rgba(52,211,153,0.15)",
              border: "1px solid rgba(52,211,153,0.3)",
              color: "#34d399",
              opacity: loading !== null ? 0.5 : 1,
              cursor: loading !== null ? "not-allowed" : "pointer",
            }}
          >
            {loading === "confirmed" ? "..." : "Accept"}
          </button>
          <button
            onClick={() => updateStatus("cancelled")}
            disabled={loading !== null}
            className="flex-1 py-1.5 rounded-xl text-xs font-medium font-[family-name:var(--font-mitr)] transition-all"
            style={{
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.25)",
              color: "#f87171",
              opacity: loading !== null ? 0.5 : 1,
              cursor: loading !== null ? "not-allowed" : "pointer",
            }}
          >
            {loading === "cancelled" ? "..." : "Decline"}
          </button>
        </div>
      )}
    </div>
  );
}
