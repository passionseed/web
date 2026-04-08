"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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

type ParsedBookingNotes = {
  track: string | null;
  ideaDetails: string | null;
  mentorHelp: string | null;
};

function extractSectionValue(notes: string, label: string, nextLabels: string[]) {
  const startIndex = notes.indexOf(label);
  if (startIndex === -1) return null;

  const valueStart = startIndex + label.length;
  const remainingText = notes.slice(valueStart);

  const nextIndex = nextLabels
    .map((nextLabel) => {
      const index = remainingText.indexOf(nextLabel);
      return index === -1 ? Number.POSITIVE_INFINITY : index;
    })
    .reduce((smallest, current) => Math.min(smallest, current), Number.POSITIVE_INFINITY);

  const rawValue =
    nextIndex === Number.POSITIVE_INFINITY
      ? remainingText
      : remainingText.slice(0, nextIndex);

  const cleanedValue = rawValue.replace(/^\s+|\s+$/g, "");
  return cleanedValue.length > 0 ? cleanedValue : null;
}

function parseBookingNotes(notes: string | null): ParsedBookingNotes | null {
  if (!notes) return null;

  const normalizedNotes = notes.replace(/\r\n/g, "\n");
  const track = extractSectionValue(normalizedNotes, "Track:", [
    "รายละเอียด Idea:",
    "สิ่งที่ต้องการให้ Mentor ช่วย:",
  ]);
  const ideaDetails = extractSectionValue(normalizedNotes, "รายละเอียด Idea:", [
    "สิ่งที่ต้องการให้ Mentor ช่วย:",
  ]);
  const mentorHelp = extractSectionValue(
    normalizedNotes,
    "สิ่งที่ต้องการให้ Mentor ช่วย:",
    []
  );

  if (!track && !ideaDetails && !mentorHelp) return null;

  return {
    track,
    ideaDetails,
    mentorHelp,
  };
}

export default function MentorBookingCard({ booking: initial, onUpdate }: Props) {
  const [booking, setBooking] = useState(initial);
  const [loading, setLoading] = useState<"confirmed" | "cancelled" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const style = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending;
  const dt = new Date(booking.slot_datetime);
  const parsedNotes = parseBookingNotes(booking.notes);

  const updateStatus = async (status: "confirmed" | "cancelled", reason?: string) => {
    setLoading(status);
    setError(null);
    try {
      const res = await fetch(`/api/hackathon/mentor/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const data = await res.json();
      if (res.ok && data.booking) {
        setBooking(data.booking);
        onUpdate?.(data.booking);
        setShowCancelModal(false);
        setCancelReason("");
      } else {
        setError(data.error ?? "Failed to update booking");
      }
    } catch {
      setError("Network error — please try again");
    }
    setLoading(null);
  };

  const canConfirmCancel = cancelReason.trim().length >= 10;

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
          {booking.status === "confirmed" && booking.discord_room != null && (
            <p
              className="text-xs font-medium font-[family-name:var(--font-space-mono)] mt-1"
              style={{ color: "#a78bfa" }}
            >
              🎮 Discord Room {booking.discord_room}
            </p>
          )}
          {booking.notes && !parsedNotes && (
            <p
              className="text-xs mt-1 font-[family-name:var(--font-mitr)]"
              style={{ color: "#5a7a94" }}
            >
              {booking.notes}
            </p>
          )}
          {booking.status === "cancelled" && booking.cancellation_reason && (
            <p
              className="text-xs mt-1 font-[family-name:var(--font-mitr)]"
              style={{ color: "#f87171" }}
            >
              Reason: {booking.cancellation_reason}
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

      {error && (
        <p className="text-xs font-[family-name:var(--font-mitr)]" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}

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

      {parsedNotes && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowDetails((current) => !current)}
            className="w-full px-3 py-2 rounded-xl text-xs font-medium font-[family-name:var(--font-mitr)] transition-all flex items-center justify-between"
            style={{
              background: showDetails
                ? "rgba(145,196,227,0.12)"
                : "rgba(90,122,148,0.08)",
              border: showDetails
                ? "1px solid rgba(145,196,227,0.28)"
                : "1px solid rgba(74,107,130,0.22)",
              color: showDetails ? "#C0D8F0" : "#91C4E3",
            }}
          >
            <span>{showDetails ? "Hide detail" : "See more detail"}</span>
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showDetails && (
            <div
              className="rounded-xl p-4 space-y-4"
              style={{
                background: "rgba(8,12,18,0.72)",
                border: "1px solid rgba(74,107,130,0.24)",
              }}
            >
              {parsedNotes.track && (
                <div className="space-y-1.5">
                  <p
                    className="text-[11px] uppercase tracking-[0.14em] font-[family-name:var(--font-mitr)]"
                    style={{ color: "#7FA8C8" }}
                  >
                    Track
                  </p>
                  <p
                    className="text-sm font-[family-name:var(--font-bai-jamjuree)]"
                    style={{ color: "#F2F7FB" }}
                  >
                    {parsedNotes.track}
                  </p>
                </div>
              )}

              {parsedNotes.ideaDetails && (
                <div className="space-y-1.5">
                  <p
                    className="text-[11px] uppercase tracking-[0.14em] font-[family-name:var(--font-mitr)]"
                    style={{ color: "#7FA8C8" }}
                  >
                    Idea Details
                  </p>
                  <p
                    className="text-sm leading-6 whitespace-pre-wrap font-[family-name:var(--font-bai-jamjuree)]"
                    style={{ color: "#D7E6F3" }}
                  >
                    {parsedNotes.ideaDetails}
                  </p>
                </div>
              )}

              {parsedNotes.mentorHelp && (
                <div className="space-y-1.5">
                  <p
                    className="text-[11px] uppercase tracking-[0.14em] font-[family-name:var(--font-mitr)]"
                    style={{ color: "#7FA8C8" }}
                  >
                    What They Need Help With
                  </p>
                  <p
                    className="text-sm leading-6 whitespace-pre-wrap font-[family-name:var(--font-bai-jamjuree)]"
                    style={{ color: "#D7E6F3" }}
                  >
                    {parsedNotes.mentorHelp}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {booking.status === "confirmed" && !showCancelModal && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCancelModal(true)}
            disabled={loading !== null}
            className="py-1.5 px-3 rounded-xl text-xs font-medium font-[family-name:var(--font-mitr)] transition-all"
            style={{
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.25)",
              color: "#f87171",
              opacity: loading !== null ? 0.5 : 1,
              cursor: loading !== null ? "not-allowed" : "pointer",
            }}
          >
            Cancel Session
          </button>
        </div>
      )}

      {booking.status === "confirmed" && showCancelModal && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "rgba(248,113,113,0.05)",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
        >
          <p className="text-sm font-medium font-[family-name:var(--font-mitr)]" style={{ color: "#f87171" }}>
            Cancel Session
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Please provide a reason for cancelling..."
            rows={3}
            className="w-full rounded-lg text-xs resize-none outline-none font-[family-name:var(--font-bai-jamjuree)]"
            style={{
              background: "rgba(13,18,25,0.8)",
              border: "1px solid rgba(74,107,130,0.3)",
              color: "#fff",
              padding: "10px 12px",
            }}
          />
          <p className="text-xs font-[family-name:var(--font-mitr)]" style={{ color: "#5a7a94" }}>
            {cancelReason.trim().length < 10
              ? `${10 - cancelReason.trim().length} more characters required`
              : ""}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => updateStatus("cancelled", cancelReason)}
              disabled={!canConfirmCancel || loading !== null}
              className="flex-1 py-1.5 rounded-xl text-xs font-medium font-[family-name:var(--font-mitr)] transition-all"
              style={{
                background: canConfirmCancel ? "rgba(248,113,113,0.15)" : "rgba(248,113,113,0.05)",
                border: "1px solid rgba(248,113,113,0.3)",
                color: canConfirmCancel ? "#f87171" : "rgba(248,113,113,0.4)",
                cursor: !canConfirmCancel || loading !== null ? "not-allowed" : "pointer",
              }}
            >
              {loading === "cancelled" ? "..." : "Confirm Cancel"}
            </button>
            <button
              onClick={() => {
                setShowCancelModal(false);
                setCancelReason("");
                setError(null);
              }}
              disabled={loading !== null}
              className="flex-1 py-1.5 rounded-xl text-xs font-medium font-[family-name:var(--font-mitr)] transition-all"
              style={{
                background: "rgba(90,122,148,0.15)",
                border: "1px solid rgba(90,122,148,0.3)",
                color: "#5a7a94",
                opacity: loading !== null ? 0.5 : 1,
                cursor: loading !== null ? "not-allowed" : "pointer",
              }}
            >
              Keep Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
