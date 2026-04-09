"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import type { MentorProfile } from "@/types/mentor";

type Booking = {
  id: string;
  mentor_id: string;
  student_id: string | null;
  slot_datetime: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  discord_room: number | null;
  cancellation_reason: string | null;
  created_at: string;
  student_name: string | null;
  student_email: string | null;
  group_name: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  confirmed: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  cancelled: "text-red-400 border-red-400/30 bg-red-400/10",
};

export function AdminHackathonMentors() {
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [expandedMentorId, setExpandedMentorId] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    const [mentorRes, bookingRes] = await Promise.all([
      fetch("/api/admin/hackathon/mentors"),
      fetch("/api/admin/hackathon/mentors/bookings"),
    ]);
    const mentorData = await mentorRes.json();
    const bookingData = await bookingRes.json();
    if (mentorData.mentors) setMentors(mentorData.mentors);
    else setError("Failed to load mentors");
    if (bookingData.bookings) setBookings(bookingData.bookings);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function removeMentor(id: string, name: string) {
    if (!confirm(`Remove ${name}? This will delete their profile, sessions, availability, and bookings.`)) return;
    setRemoveLoading(id);
    const res = await fetch(`/api/admin/hackathon/mentors/${id}`, { method: "DELETE" });
    if (res.ok) setMentors((prev) => prev.filter((m) => m.id !== id));
    setRemoveLoading(null);
  }

  async function resetQuota() {
    if (!confirm("Reset mentor booking quota for all teams? Active bookings will be cancelled and all teams get 1 chance back.")) return;
    setResetting(true);
    setResetResult(null);
    try {
      const res = await fetch("/api/admin/hackathon/mentor-bookings/reset-quota", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setResetResult(`Error: ${data.error}`);
      else if (data.reset === 0) setResetResult("No active bookings — nothing changed.");
      else setResetResult(`Reset ${data.reset} booking(s). All teams now have 1 chance.`);
    } catch {
      setResetResult("Request failed.");
    } finally {
      setResetting(false);
    }
  }

  async function setApproval(id: string, approve: boolean) {
    setActionLoading(id);
    const res = await fetch(`/api/admin/hackathon/mentors/${id}/approve`, {
      method: approve ? "POST" : "DELETE",
    });
    if (res.ok) {
      setMentors((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_approved: approve } : m))
      );
    }
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 rounded-full border-2 border-slate-600 border-t-slate-300 animate-spin" />
      </div>
    );
  }

  if (error) return <p className="text-red-400 text-sm py-4">{error}</p>;

  const approved = mentors.filter((m) => m.is_approved);
  const pending = mentors.filter((m) => !m.is_approved);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {approved.length} approved · {pending.length} pending · {bookings.length} total bookings
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={resetting}
            onClick={resetQuota}
            className="text-amber-400 border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-300"
          >
            {resetting ? "Resetting..." : "Reset Booking Quota"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Refresh
          </Button>
        </div>
      </div>

      {resetResult && (
        <p className="text-sm text-muted-foreground border border-slate-700/50 rounded-md px-3 py-2">
          {resetResult}
        </p>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-amber-400">Pending Approval</h3>
          {pending.map((mentor) => (
            <MentorRow
              key={mentor.id}
              mentor={mentor}
              bookings={bookings.filter((b) => b.mentor_id === mentor.id)}
              expanded={expandedMentorId === mentor.id}
              onToggle={() => setExpandedMentorId(expandedMentorId === mentor.id ? null : mentor.id)}
              actionLoading={actionLoading}
              removeLoading={removeLoading}
              onApprove={() => setApproval(mentor.id, true)}
              onRevoke={() => setApproval(mentor.id, false)}
              onRemove={() => removeMentor(mentor.id, mentor.full_name)}
            />
          ))}
        </div>
      )}

      {approved.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-emerald-400">Approved</h3>
          {approved.map((mentor) => (
            <MentorRow
              key={mentor.id}
              mentor={mentor}
              bookings={bookings.filter((b) => b.mentor_id === mentor.id)}
              expanded={expandedMentorId === mentor.id}
              onToggle={() => setExpandedMentorId(expandedMentorId === mentor.id ? null : mentor.id)}
              actionLoading={actionLoading}
              removeLoading={removeLoading}
              onApprove={() => setApproval(mentor.id, true)}
              onRevoke={() => setApproval(mentor.id, false)}
              onRemove={() => removeMentor(mentor.id, mentor.full_name)}
            />
          ))}
        </div>
      )}

      {mentors.length === 0 && (
        <p className="text-muted-foreground text-sm py-4">No mentor registrations yet.</p>
      )}
    </div>
  );
}

function MentorRow({
  mentor,
  bookings,
  expanded,
  onToggle,
  actionLoading,
  removeLoading,
  onApprove,
  onRevoke,
  onRemove,
}: {
  mentor: MentorProfile;
  bookings: Booking[];
  expanded: boolean;
  onToggle: () => void;
  actionLoading: string | null;
  removeLoading: string | null;
  onApprove: () => void;
  onRevoke: () => void;
  onRemove: () => void;
}) {
  const busy = actionLoading === mentor.id;
  const removing = removeLoading === mentor.id;

  const pending = bookings.filter((b) => b.status === "pending").length;
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-4 px-4 py-3">
        <button
          onClick={onToggle}
          className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
          disabled={bookings.length === 0}
        >
          <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        </button>

        {mentor.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mentor.photo_url}
            alt={mentor.full_name}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-slate-400 text-sm">
            {mentor.full_name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-white">{mentor.full_name}</span>
            <Badge variant={mentor.is_approved ? "default" : "secondary"} className="text-xs">
              {mentor.is_approved ? "Approved" : "Pending"}
            </Badge>
            {mentor.line_user_id && (
              <Badge variant="outline" className="text-xs text-green-400 border-green-400/30">
                LINE ✓
              </Badge>
            )}
            {bookings.length > 0 && (
              <div className="flex items-center gap-1">
                {pending > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border text-amber-400 border-amber-400/30 bg-amber-400/10">
                    {pending} pending
                  </span>
                )}
                {confirmed > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border text-emerald-400 border-emerald-400/30 bg-emerald-400/10">
                    {confirmed} confirmed
                  </span>
                )}
                {cancelled > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border text-red-400 border-red-400/30 bg-red-400/10">
                    {cancelled} cancelled
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {mentor.email} · {mentor.profession}{mentor.institution ? ` @ ${mentor.institution}` : ""}
          </p>
          <p className="text-xs text-slate-500 capitalize">{mentor.session_type} session</p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {mentor.is_approved ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy || removing}
              onClick={onRevoke}
              className="text-red-400 border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
            >
              {busy ? "..." : "Revoke"}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={busy || removing}
              onClick={onApprove}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {busy ? "..." : "Approve"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || removing}
            onClick={onRemove}
            className="text-slate-500 hover:text-red-400 hover:bg-red-400/10"
          >
            {removing ? "..." : "Remove"}
          </Button>
        </div>
      </div>

      {/* Bookings expand */}
      <AnimatePresence initial={false}>
        {expanded && bookings.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.05, 0.7, 0.35, 0.99] }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-700/50 px-4 py-3 space-y-2 bg-slate-900/30">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                Bookings ({bookings.length})
              </p>
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-700/30 bg-slate-800/20 px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">
                        {b.group_name ?? b.student_name ?? "No student"}
                      </span>
                      {b.student_name && b.group_name && (
                        <span className="text-xs text-slate-500">({b.student_name})</span>
                      )}
                      {b.student_email && (
                        <span className="text-xs text-slate-500 font-mono">{b.student_email}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{format(new Date(b.slot_datetime), "MMM d, yyyy HH:mm")}</span>
                      <span>·</span>
                      <span>{b.duration_minutes} min</span>
                      {b.discord_room != null && b.status === "confirmed" && (
                        <>
                          <span>·</span>
                          <span className="text-purple-400">Room {b.discord_room}</span>
                        </>
                      )}
                    </div>
                    {b.notes && (
                      <p className="text-xs text-slate-500 italic">{b.notes}</p>
                    )}
                    {b.cancellation_reason && (
                      <p className="text-xs text-red-400">Reason: {b.cancellation_reason}</p>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border capitalize shrink-0 ${STATUS_COLORS[b.status] ?? ""}`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
