"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Users, X } from "lucide-react";
import type { AssignedMentor, MentorOption } from "@/types/admin-hackathon";

export function MentorAssignmentRow({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [assignments, setAssignments] = useState<AssignedMentor[]>([]);
  const [mentorOptions, setMentorOptions] = useState<MentorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/hackathon/teams/${teamId}/mentor-assignments`).then((r) => r.json()),
      fetch("/api/admin/hackathon/mentors").then((r) => r.json()),
    ]).then(([assignData, mentorData]) => {
      setAssignments(assignData.assignments ?? []);
      const groupMentors = (mentorData.mentors ?? []).filter(
        (m: MentorOption & { is_approved: boolean; session_type: string }) =>
          m.session_type === "group" && m.is_approved
      );
      setMentorOptions(groupMentors);
    }).finally(() => setLoading(false));
  }, [teamId]);

  async function handleAssign() {
    if (!selectedMentorId) return;
    setAssigning(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hackathon/teams/${teamId}/mentor-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentor_id: selectedMentorId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to assign"); return; }
      const updated = await fetch(`/api/admin/hackathon/teams/${teamId}/mentor-assignments`).then((r) => r.json());
      setAssignments(updated.assignments ?? []);
      setSelectedMentorId("");
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(mentorId: string) {
    setRemoving(mentorId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hackathon/teams/${teamId}/mentor-assignments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentor_id: mentorId }),
      });
      if (!res.ok) { setError("Failed to remove"); return; }
      setAssignments((prev) => prev.filter((a) => a.mentor_id !== mentorId));
    } finally {
      setRemoving(null);
    }
  }

  const assignedMentorIds = new Set(assignments.map((a) => a.mentor_id));
  const availableOptions = mentorOptions.filter((m) => !assignedMentorIds.has(m.id));

  if (loading) {
    return (
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading mentor assignments...
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-3" onClick={(e) => e.stopPropagation()}>
      <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
        <Users className="h-3 w-3" />
        Assigned Mentors — {teamName}
      </span>

      {assignments.length === 0 ? (
        <p className="text-xs text-slate-500">No mentors assigned yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs text-indigo-200"
            >
              <span>{a.mentor_profiles?.full_name ?? a.mentor_id}</span>
              <button
                onClick={() => handleRemove(a.mentor_id)}
                disabled={removing === a.mentor_id}
                className="text-indigo-400 hover:text-red-400 transition-colors ml-0.5"
              >
                {removing === a.mentor_id ? (
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
            value={selectedMentorId}
            onChange={(e) => setSelectedMentorId(e.target.value)}
            className="flex-1 h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
          >
            <option value="">Select a group mentor...</option>
            {availableOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} ({m.email})
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={assigning || !selectedMentorId}
            className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
          >
            {assigning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Assign
          </Button>
        </div>
      )}

      {availableOptions.length === 0 && assignments.length > 0 && (
        <p className="text-xs text-slate-500">All available group mentors are assigned.</p>
      )}

      {availableOptions.length === 0 && assignments.length === 0 && (
        <p className="text-xs text-slate-500">No approved group mentors available to assign.</p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
