"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock, X, Loader2, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import type { MentorProfile } from "@/types/mentor";

interface AssignedTeam {
  id: string; // assignment id
  team_id: string;
  assigned_at: string;
  hackathon_teams: {
    id: string;
    name: string;
    lobby_code: string;
  } | null;
}

interface TeamOption {
  id: string;
  name: string;
  lobby_code: string;
}

type AvailabilitySlot = { day_of_week: number; hour: number };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function AvailabilityModal({
  mentor,
  onClose,
}: {
  mentor: MentorProfile;
  onClose: () => void;
}) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/hackathon/mentors/${mentor.id}/availability`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .finally(() => setLoading(false));
  }, [mentor.id]);

  const slotSet = new Set(slots.map((s) => `${s.day_of_week}:${s.hour}`));

  // Only show hours that have at least one slot
  const activeHours = HOURS.filter((h) => DAYS.some((_, d) => slotSet.has(`${d}:${h}`)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Availability</p>
            <h3 className="text-base font-semibold text-white">{mentor.full_name}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-700/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 border-slate-600 border-t-slate-300 animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No availability set yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-slate-500 font-medium pr-3 pb-2 w-14">Hour</th>
                    {DAYS.map((d) => (
                      <th key={d} className="text-center text-slate-400 font-medium pb-2 px-1 min-w-[36px]">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeHours.map((h) => {
                    const label = `${h.toString().padStart(2, "0")}:00`;
                    return (
                      <tr key={h} className="border-t border-slate-800/50">
                        <td className="text-slate-500 font-mono pr-3 py-1.5">{label}</td>
                        {DAYS.map((_, d) => {
                          const active = slotSet.has(`${d}:${h}`);
                          return (
                            <td key={d} className="text-center py-1.5 px-1">
                              {active ? (
                                <div className="mx-auto w-5 h-5 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                </div>
                              ) : (
                                <div className="mx-auto w-5 h-5 rounded bg-slate-800/30" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-slate-600 mt-4">
                {slots.length} slot{slots.length !== 1 ? "s" : ""} set
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [availabilityMentor, setAvailabilityMentor] = useState<MentorProfile | null>(null);
  const [quotaValue, setQuotaValue] = useState<string>("1");
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [quotaResult, setQuotaResult] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    const [mentorRes, bookingRes, quotaRes] = await Promise.all([
      fetch("/api/admin/hackathon/mentors"),
      fetch("/api/admin/hackathon/mentors/bookings"),
      fetch("/api/admin/hackathon/mentor-bookings/set-quota"),
    ]);
    const mentorData = await mentorRes.json();
    const bookingData = await bookingRes.json();
    const quotaData = await quotaRes.json();
    if (mentorData.mentors) setMentors(mentorData.mentors);
    else setError("Failed to load mentors");
    if (bookingData.bookings) setBookings(bookingData.bookings);
    if (quotaData.max_bookings_per_team) setQuotaValue(String(quotaData.max_bookings_per_team));
    setLoading(false);
  }

  async function setQuota() {
    const value = parseInt(quotaValue, 10);
    if (!Number.isInteger(value) || value < 1) {
      setQuotaResult("Please enter a valid number ≥ 1.");
      return;
    }
    setQuotaLoading(true);
    setQuotaResult(null);
    try {
      const res = await fetch("/api/admin/hackathon/mentor-bookings/set-quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_bookings_per_team: value }),
      });
      const data = await res.json();
      if (!res.ok) setQuotaResult(`Error: ${data.error}`);
      else setQuotaResult(`Quota set to ${data.max_bookings_per_team} booking(s) per team.`);
    } catch {
      setQuotaResult("Request failed.");
    } finally {
      setQuotaLoading(false);
    }
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
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Quota per team:</span>
            <input
              type="number"
              min={1}
              value={quotaValue}
              onChange={(e) => setQuotaValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setQuota()}
              className="w-14 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200 text-center outline-none focus:border-slate-500"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={quotaLoading}
              onClick={setQuota}
              className="text-sky-400 border-sky-400/30 hover:bg-sky-400/10 hover:text-sky-300"
            >
              {quotaLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Set"}
            </Button>
          </div>
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
      {quotaResult && (
        <p className="text-sm text-muted-foreground border border-slate-700/50 rounded-md px-3 py-2">
          {quotaResult}
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
              onShowAvailability={() => setAvailabilityMentor(mentor)}
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
              onShowAvailability={() => setAvailabilityMentor(mentor)}
            />
          ))}
        </div>
      )}

      {mentors.length === 0 && (
        <p className="text-muted-foreground text-sm py-4">No mentor registrations yet.</p>
      )}

      {availabilityMentor && (
        <AvailabilityModal
          mentor={availabilityMentor}
          onClose={() => setAvailabilityMentor(null)}
        />
      )}
    </div>
  );
}

function MentorGroupAssignmentRow({ mentorId }: { mentorId: string }) {
  const [assignments, setAssignments] = useState<AssignedTeam[]>([]);
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/hackathon/mentors/${mentorId}/assignments`).then((r) => r.json()),
      fetch("/api/admin/hackathon/teams").then((r) => r.json()),
    ]).then(([assignData, teamsData]) => {
      setAssignments(assignData.assignments ?? []);
      setTeamOptions(
        (teamsData.teams ?? []).map((t: TeamOption) => ({
          id: t.id,
          name: t.name,
          lobby_code: t.lobby_code,
        }))
      );
    }).finally(() => setLoading(false));
  }, [mentorId]);

  async function handleAssign() {
    if (!selectedTeamId) return;
    setAssigning(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hackathon/mentors/${mentorId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: selectedTeamId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to assign"); return; }
      const updated = await fetch(`/api/admin/hackathon/mentors/${mentorId}/assignments`).then((r) => r.json());
      setAssignments(updated.assignments ?? []);
      setSelectedTeamId("");
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(teamId: string) {
    setRemoving(teamId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hackathon/mentors/${mentorId}/assignments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId }),
      });
      if (!res.ok) { setError("Failed to remove"); return; }
      setAssignments((prev) => prev.filter((a) => a.team_id !== teamId));
    } finally {
      setRemoving(null);
    }
  }

  const assignedTeamIds = new Set(assignments.map((a) => a.team_id));
  const availableOptions = teamOptions.filter((t) => !assignedTeamIds.has(t.id));

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading team assignments...
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-3">
      <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
        <Users className="h-3 w-3" />
        Assigned Teams
      </span>

      {assignments.length === 0 ? (
        <p className="text-xs text-slate-500">No teams assigned yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs text-indigo-200"
            >
              <span>{a.hackathon_teams?.name ?? a.team_id}</span>
              {a.hackathon_teams?.lobby_code && (
                <span className="text-indigo-400 font-mono">{a.hackathon_teams.lobby_code}</span>
              )}
              <button
                onClick={() => handleRemove(a.team_id)}
                disabled={removing === a.team_id}
                className="text-indigo-400 hover:text-red-400 transition-colors ml-0.5"
              >
                {removing === a.team_id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {availableOptions.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="flex-1 h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
          >
            <option value="">Select a team...</option>
            {availableOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.lobby_code})
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={assigning || !selectedTeamId}
            className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
          >
            {assigning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Assign
          </Button>
        </div>
      )}

      {availableOptions.length === 0 && assignments.length > 0 && (
        <p className="text-xs text-slate-500">All teams are assigned to this mentor.</p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
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
  onShowAvailability,
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
  onShowAvailability: () => void;
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
          <Button
            variant="outline"
            size="sm"
            onClick={onShowAvailability}
            className="text-slate-400 border-slate-600/50 hover:bg-slate-700/50 hover:text-slate-200"
          >
            <Clock className="h-3 w-3 mr-1" />
            Schedule
          </Button>
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

      {/* Group mentor team assignments */}
      {mentor.session_type === "group" && (
        <div className="px-4 pb-3">
          <MentorGroupAssignmentRow mentorId={mentor.id} />
        </div>
      )}

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
