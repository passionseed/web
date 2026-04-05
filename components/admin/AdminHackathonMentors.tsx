"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MentorProfile } from "@/types/mentor";

export function AdminHackathonMentors() {
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function fetchMentors() {
    setLoading(true);
    const res = await fetch("/api/admin/hackathon/mentors");
    const data = await res.json();
    if (data.mentors) setMentors(data.mentors);
    else setError("Failed to load mentors");
    setLoading(false);
  }

  useEffect(() => {
    fetchMentors();
  }, []);

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

  if (error) {
    return <p className="text-red-400 text-sm py-4">{error}</p>;
  }

  const approved = mentors.filter((m) => m.is_approved);
  const pending = mentors.filter((m) => !m.is_approved);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {approved.length} approved · {pending.length} pending
        </div>
        <Button variant="outline" size="sm" onClick={fetchMentors}>
          Refresh
        </Button>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-amber-400">Pending Approval</h3>
          {pending.map((mentor) => (
            <MentorRow
              key={mentor.id}
              mentor={mentor}
              actionLoading={actionLoading}
              onApprove={() => setApproval(mentor.id, true)}
              onRevoke={() => setApproval(mentor.id, false)}
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
              actionLoading={actionLoading}
              onApprove={() => setApproval(mentor.id, true)}
              onRevoke={() => setApproval(mentor.id, false)}
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
  actionLoading,
  onApprove,
  onRevoke,
}: {
  mentor: MentorProfile;
  actionLoading: string | null;
  onApprove: () => void;
  onRevoke: () => void;
}) {
  const busy = actionLoading === mentor.id;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-3">
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
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {mentor.email} · {mentor.profession}{mentor.institution ? ` @ ${mentor.institution}` : ""}
        </p>
        <p className="text-xs text-slate-500 capitalize">{mentor.session_type} session</p>
      </div>

      <div className="shrink-0">
        {mentor.is_approved ? (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={onRevoke}
            className="text-red-400 border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
          >
            {busy ? "..." : "Revoke"}
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={busy}
            onClick={onApprove}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {busy ? "..." : "Approve"}
          </Button>
        )}
      </div>
    </div>
  );
}
