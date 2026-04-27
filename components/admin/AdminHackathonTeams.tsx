"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search,
  Users,
  Calendar,
  Layers,
  ChevronRight,
  Download,
  Trophy,
  FileText,
  Image as ImageIcon,
  Paperclip,
  RotateCcw,
  Phone,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

// ─── Browser tab types ────────────────────────────────────────────────────────

interface Participant {
  id: string;
  name: string;
  email: string;
  university: string;
  created_at: string;
  phone?: string | null;
  line_id?: string | null;
  discord_username?: string | null;
  instagram_handle?: string | null;
  grade_level?: string | null;
  track?: string | null;
  password_hash?: string | null;
}

interface TeamMember {
  joined_at: string;
  participant_id: string;
  hackathon_participants: Participant;
}

interface HackathonTeam {
  id: string;
  name: string;
  lobby_code: string;
  owner_id: string;
  created_at: string;
  total_score: number;
  hackathon_team_members: TeamMember[];
}

// ─── Leaderboard tab types ────────────────────────────────────────────────────

interface LeaderboardMember {
  name: string;
  email: string;
  university: string;
}

interface TeamSubmission {
  id: string;
  activity_id: string;
  activity_title: string | null;
  status: string;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[];
  submitted_at: string | null;
  submitted_by_name: string | null;
}

interface IndividualSubmission {
  id: string;
  activity_id: string;
  activity_title: string | null;
  participant_name: string | null;
  status: string;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[];
  submitted_at: string | null;
}

interface LeaderboardTeam {
  id: string;
  name: string;
  lobby_code: string;
  member_count: number;
  members: LeaderboardMember[];
  total_score: number;
  team_submissions: TeamSubmission[];
  individual_submissions: IndividualSubmission[];
}

interface AssignedMentor {
  id: string; // assignment id
  mentor_id: string;
  assigned_at: string;
  mentor_profiles: {
    id: string;
    full_name: string;
    email: string;
    session_type: string;
    photo_url: string | null;
  } | null;
}

interface MentorOption {
  id: string;
  full_name: string;
  email: string;
  photo_url: string | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "submitted" || status === "passed") {
    return (
      <Badge className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0">
        {status}
      </Badge>
    );
  }
  if (status === "draft" || status === "in_progress") {
    return (
      <Badge className="text-[10px] bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 px-2 py-0">
        {status}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400 px-2 py-0">
      {status}
    </Badge>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 font-bold text-sm">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/20 border border-slate-400/40 text-slate-300 font-bold text-sm">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-400/20 border border-orange-400/40 text-orange-300 font-bold text-sm">
        3
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-800/60 border border-slate-700 text-slate-400 font-bold text-sm">
      {rank}
    </span>
  );
}

function ScoreBadge({ score, rank }: { score: number; rank: number }) {
  if (rank === 1) {
    return (
      <Badge className="bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 font-mono font-bold text-sm px-3">
        {score}
      </Badge>
    );
  }
  if (rank === 2) {
    return (
      <Badge className="bg-slate-400/15 text-slate-300 border border-slate-400/30 font-mono font-bold text-sm px-3">
        {score}
      </Badge>
    );
  }
  if (rank === 3) {
    return (
      <Badge className="bg-orange-400/15 text-orange-300 border border-orange-400/30 font-mono font-bold text-sm px-3">
        {score}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-slate-700 text-slate-300 font-mono font-bold text-sm px-3">
      {score}
    </Badge>
  );
}

function ResetMentorTicketButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleReset() {
    if (!confirm(`Reset mentor ticket for team "${teamName}"? This will delete all their mentor bookings.`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/hackathon/mentor-bookings/reset-quota-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId }),
      });
      if (res.ok) setDone(true);
      else alert("Failed to reset ticket");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-xs border-amber-700/50 text-amber-400 hover:bg-amber-900/20"
      onClick={handleReset}
      disabled={loading || done}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
      {done ? "✓ Ticket Reset" : "Reset Mentor Ticket"}
    </Button>
  );
}

function ParticipantDetailModal({
  participant,
  isOwner,
  onClose,
}: {
  participant: Participant;
  isOwner: boolean;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSetPassword() {
    if (!newPassword.trim()) return;
    setSettingPassword(true);
    setPasswordMsg(null);
    try {
      const res = await fetch("/api/admin/hackathon/participants/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id, password: newPassword }),
      });
      if (res.ok) {
        setPasswordMsg({ ok: true, text: `Password set to "${newPassword}"` });
        setNewPassword("");
      } else {
        const d = await res.json();
        setPasswordMsg({ ok: false, text: d.error ?? "Failed" });
      }
    } catch {
      setPasswordMsg({ ok: false, text: "Network error" });
    } finally {
      setSettingPassword(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-slate-900 border border-slate-700/50 text-slate-100 max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-300">
            {participant.name}
            {isOwner && (
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                Owner
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5 text-sm">
            <div className="flex gap-2 text-slate-400">
              <span className="w-24 shrink-0 text-slate-500 text-xs uppercase tracking-wider pt-0.5">Email</span>
              <span className="font-mono text-slate-300 break-all">{participant.email}</span>
            </div>
            {participant.password_hash && (
              <div className="flex gap-2 items-start">
                <span className="w-24 shrink-0 text-slate-500 text-xs uppercase tracking-wider pt-0.5">Orig. hash</span>
                <div className="flex-1 flex flex-col gap-1">
                  <span
                    className="font-mono text-slate-500 break-all text-[10px] leading-relaxed cursor-pointer hover:text-slate-300 transition-colors select-all"
                    title="Click to copy"
                    onClick={() => navigator.clipboard.writeText(participant.password_hash!)}
                  >
                    {participant.password_hash}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-6 px-2 border-slate-700 text-slate-400 hover:text-slate-200 w-fit"
                    onClick={async () => {
                      setSettingPassword(true);
                      setPasswordMsg(null);
                      try {
                        const res = await fetch("/api/admin/hackathon/participants/set-password", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ participantId: participant.id, rawHash: participant.password_hash }),
                        });
                        setPasswordMsg(res.ok
                          ? { ok: true, text: "Original password restored" }
                          : { ok: false, text: "Failed to restore" }
                        );
                      } catch {
                        setPasswordMsg({ ok: false, text: "Network error" });
                      } finally {
                        setSettingPassword(false);
                      }
                    }}
                    disabled={settingPassword}
                  >
                    {settingPassword ? <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" /> : null}
                    Restore original
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-2 items-start">
              <span className="w-24 shrink-0 text-slate-500 text-xs uppercase tracking-wider pt-2">Password</span>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSetPassword(); }}
                    placeholder="Set new password…"
                    className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60"
                  />
                  <Button
                    size="sm"
                    className="text-xs h-7 px-2 bg-blue-600/80 hover:bg-blue-600 text-white shrink-0"
                    onClick={handleSetPassword}
                    disabled={settingPassword || !newPassword.trim()}
                  >
                    {settingPassword ? <Loader2 className="h-3 w-3 animate-spin" /> : "Set"}
                  </Button>
                </div>
                {passwordMsg && (
                  <span className={`text-[11px] font-mono ${passwordMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                    {passwordMsg.text}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 text-slate-400">
              <span className="w-24 shrink-0 text-slate-500 text-xs uppercase tracking-wider pt-0.5">University</span>
              <span className="text-slate-300">{participant.university || "—"}</span>
            </div>
            {participant.grade_level && (
              <div className="flex gap-2 text-slate-400">
                <span className="w-24 shrink-0 text-slate-500 text-xs uppercase tracking-wider pt-0.5">Grade</span>
                <span className="text-slate-300">{participant.grade_level}</span>
              </div>
            )}
            {participant.track && (
              <div className="flex gap-2 text-slate-400">
                <span className="w-24 shrink-0 text-slate-500 text-xs uppercase tracking-wider pt-0.5">Track</span>
                <span className="text-slate-300">{participant.track}</span>
              </div>
            )}
          </div>

          {(participant.phone || participant.line_id || participant.discord_username || participant.instagram_handle) && (
            <div className="border-t border-slate-700/50 pt-3 space-y-2">
              {participant.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  <a href={`tel:${participant.phone}`} className="text-green-300 hover:underline font-mono">
                    {participant.phone}
                  </a>
                </div>
              )}
              {participant.line_id && (
                <div className="flex items-center gap-2 text-sm">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 font-mono">LINE: {participant.line_id}</span>
                </div>
              )}
              {participant.discord_username && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-indigo-400 font-bold text-xs w-3.5 text-center shrink-0">#</span>
                  <span className="text-indigo-300 font-mono">{participant.discord_username}</span>
                </div>
              )}
              {participant.instagram_handle && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-pink-400 font-bold text-xs w-3.5 text-center shrink-0">@</span>
                  <span className="text-pink-300 font-mono">{participant.instagram_handle}</span>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-slate-700/50 pt-2 text-[10px] text-slate-600 font-mono">
            Registered {format(new Date(participant.created_at), "MMM d, yyyy HH:mm")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionRow({ sub }: { sub: TeamSubmission | IndividualSubmission }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800/50">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-200">
          {sub.activity_title ?? sub.activity_id}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={sub.status} />
          {"submitted_by_name" in sub && sub.submitted_by_name && (
            <span className="text-[10px] text-slate-500">{sub.submitted_by_name}</span>
          )}
          {"participant_name" in sub && sub.participant_name && (
            <span className="text-[10px] text-slate-500">{sub.participant_name}</span>
          )}
          {sub.submitted_at && (
            <span className="text-[10px] text-slate-600 font-mono">
              {format(new Date(sub.submitted_at), "MMM d, HH:mm")}
            </span>
          )}
        </div>
      </div>

      {sub.text_answer && (
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mt-1">
          {sub.text_answer.length > 100 ? sub.text_answer.slice(0, 100) + "…" : sub.text_answer}
        </p>
      )}

      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {sub.image_url && (
          <div className="flex items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sub.image_url}
              alt="submission"
              className="h-10 w-10 object-cover rounded border border-slate-700"
            />
            <ImageIcon className="h-3 w-3 text-slate-500" />
          </div>
        )}
        {sub.file_urls && sub.file_urls.length > 0 && (
          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400 px-2 py-0 flex items-center gap-1">
            <Paperclip className="h-2.5 w-2.5" />
            {sub.file_urls.length} {sub.file_urls.length === 1 ? "file" : "files"}
          </Badge>
        )}
      </div>
    </div>
  );
}

function TeamMessageForm({ teamId, teamName, memberCount }: { teamId: string; teamName: string; memberCount: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSend() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/hackathon/teams/${teamId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`Sent to ${data.sent} member${data.sent !== 1 ? "s" : ""}`);
        setTitle("");
        setBody("");
        setTimeout(() => { setResult(null); setOpen(false); }, 2000);
      } else {
        setResult(data.error ?? "Failed to send");
      }
    } catch {
      setResult("Failed to send");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="border-slate-700 hover:bg-slate-800 text-xs h-7 px-2"
      >
        <Send className="h-3 w-3 mr-1" />
        Message Team
      </Button>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
          <Send className="h-3 w-3" />
          Message to {teamName} ({memberCount} members)
        </span>
        <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Subject…"
        className="h-8 text-xs bg-slate-950/50 border-slate-700"
        onClick={(e) => e.stopPropagation()}
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message body…"
        rows={3}
        className="text-xs bg-slate-950/50 border-slate-700"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || !title.trim() || !body.trim()}
          className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500 text-white"
        >
          {sending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
          Send to Inbox
        </Button>
        {result && (
          <span className={`text-[11px] ${result.startsWith("Sent") ? "text-emerald-400" : "text-red-400"}`}>
            {result}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Mentor Assignment Row ────────────────────────────────────────────────────

function MentorAssignmentRow({ teamId, teamName }: { teamId: string; teamName: string }) {
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

// ─── Leaderboard view ─────────────────────────────────────────────────────────

function LeaderboardView() {
  const [leaderboardTeams, setLeaderboardTeams] = useState<LeaderboardTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch once on mount; no polling needed
    fetch("/api/admin/hackathon/teams/submissions")
      .then((res) => res.json())
      .then((data) => {
        if (data.teams) setLeaderboardTeams(data.teams);
      })
      .catch((err) => console.error("Error fetching leaderboard:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (leaderboardTeams.length === 0) {
    return (
      <div className="text-center text-slate-500 py-16">No teams found.</div>
    );
  }

  return (
    <div className="rounded-md border border-slate-700/50 overflow-hidden bg-slate-950/20">
      <Table>
        <TableHeader className="bg-slate-900/60">
          <TableRow className="hover:bg-transparent border-slate-700/50">
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="w-[56px] text-slate-300 font-medium tracking-tight">Rank</TableHead>
            <TableHead className="text-slate-300 font-medium tracking-tight">Team</TableHead>
            <TableHead className="text-slate-300 font-medium tracking-tight text-center">Members</TableHead>
            <TableHead className="text-slate-300 font-medium tracking-tight text-right pr-6">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboardTeams.map((team, index) => {
            const rank = index + 1;
            const isExpanded = expandedTeamId === team.id;

            // Group individual submissions by participant name
            const individualByParticipant = team.individual_submissions.reduce<
              Record<string, IndividualSubmission[]>
            >((acc, sub) => {
              const key = sub.participant_name ?? "Unknown";
              (acc[key] ??= []).push(sub);
              return acc;
            }, {});

            return (
              <React.Fragment key={team.id}>
                <TableRow
                  className={`cursor-pointer transition-all duration-200 border-slate-800/50 ${
                    isExpanded ? "bg-blue-500/5" : "hover:bg-slate-800/40"
                  }`}
                  onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                >
                  <TableCell>
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.2, ease: [0.05, 0.7, 0.35, 0.99] }}
                    >
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </motion.div>
                  </TableCell>
                  <TableCell>
                    <RankBadge rank={rank} />
                  </TableCell>
                  <TableCell className="font-semibold text-blue-400">
                    {team.name}
                    <span className="ml-2 text-xs font-mono text-slate-600">{team.lobby_code}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-medium text-slate-200">{team.member_count}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <ScoreBadge score={team.total_score} rank={rank} />
                  </TableCell>
                </TableRow>

                <TableRow className="border-none hover:bg-transparent">
                  <TableCell colSpan={5} className="p-0 border-none">
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.05, 0.7, 0.35, 0.99] }}
                          className="overflow-hidden bg-slate-900/10 backdrop-blur-sm"
                        >
                          <div className="px-12 py-6 border-b border-slate-800/50 space-y-6">
                            {/* Admin actions */}
                            <div className="flex items-center gap-3">
                              <ResetMentorTicketButton teamId={team.id} teamName={team.name} />
                            </div>

                            {/* Members */}
                            <div>
                              <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
                                <Users className="h-4 w-4 text-blue-400" />
                                Members
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {team.members.map((m) => (
                                  <div
                                    key={m.email}
                                    className="flex flex-col px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800/50 min-w-[160px]"
                                  >
                                    <span className="text-xs font-semibold text-slate-200">{m.name}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">{m.email}</span>
                                    <span className="text-[10px] text-slate-600 mt-0.5">{m.university}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Team submissions */}
                            {team.team_submissions.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
                                  <FileText className="h-4 w-4 text-indigo-400" />
                                  Team Submissions
                                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500 px-2 py-0 ml-1">
                                    {team.team_submissions.length}
                                  </Badge>
                                </h4>
                                <div className="space-y-2">
                                  {team.team_submissions.map((sub) => (
                                    <SubmissionRow key={sub.id} sub={sub} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Individual submissions grouped by participant */}
                            {Object.keys(individualByParticipant).length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
                                  <FileText className="h-4 w-4 text-purple-400" />
                                  Individual Submissions
                                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500 px-2 py-0 ml-1">
                                    {team.individual_submissions.length}
                                  </Badge>
                                </h4>
                                <div className="space-y-4">
                                  {Object.entries(individualByParticipant).map(([participantName, subs]) => (
                                    <div key={participantName}>
                                      <p className="text-xs font-semibold text-slate-400 mb-1.5 pl-1">
                                        {participantName}
                                      </p>
                                      <div className="space-y-2 pl-2 border-l border-slate-800">
                                        {subs.map((sub) => (
                                          <SubmissionRow key={sub.id} sub={sub} />
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {team.team_submissions.length === 0 &&
                              team.individual_submissions.length === 0 && (
                                <p className="text-xs text-slate-600 italic">No submissions yet.</p>
                              )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminHackathonTeams() {
  const [activeTab, setActiveTab] = useState<"browser" | "leaderboard">("browser");
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "created" | "members">("score");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [runningMatching, setRunningMatching] = useState(false);
  const [matchingMessage, setMatchingMessage] = useState("");
  const [resettingQuotaTeamId, setResettingQuotaTeamId] = useState<string | null>(null);
  const [quotaResetMessage, setQuotaResetMessage] = useState<{ teamId: string; message: string } | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<{ participant: Participant; isOwner: boolean } | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams() {
    try {
      const response = await fetch("/api/admin/hackathon/teams");
      const data = await response.json();

      if (response.ok && data.teams) {
        setTeams(data.teams);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTeams = teams.filter((t) => {
    const query = searchQuery.toLowerCase();
    const matchesTeamName = t.name.toLowerCase().includes(query);
    const matchesLobbyCode = t.lobby_code.toLowerCase().includes(query);
    const matchesMemberName = t.hackathon_team_members.some((m) =>
      m.hackathon_participants.name.toLowerCase().includes(query)
    );
    return matchesTeamName || matchesLobbyCode || matchesMemberName;
  }).sort((a, b) => {
    if (sortBy === "score") return b.total_score - a.total_score;
    if (sortBy === "members") return b.hackathon_team_members.length - a.hackathon_team_members.length;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const stats = {
    totalTeams: teams.length,
    totalMembers: teams.reduce((acc, t) => acc + t.hackathon_team_members.length, 0),
    avgSize: teams.length > 0
      ? (teams.reduce((acc, t) => acc + t.hackathon_team_members.length, 0) / teams.length).toFixed(1)
      : 0,
    largestTeam: Math.max(0, ...teams.map((t) => t.hackathon_team_members.length)),
  };

  const downloadCSV = () => {
    // Generate CSV data: Team Name, Join Code, Member Name, University, Joined At, Reg At
    const headers = [
      "Team Name",
      "Lobby Code",
      "Member Name",
      "Email",
      "University",
      "Member Joined At",
      "Participant Registered At",
    ];

    const rows = teams.flatMap((team) =>
      team.hackathon_team_members.map((member) => [
        team.name,
        team.lobby_code,
        member.hackathon_participants.name,
        member.hackathon_participants.email,
        member.hackathon_participants.university,
        format(new Date(member.joined_at), "yyyy-MM-dd HH:mm:ss"),
        format(new Date(member.hackathon_participants.created_at), "yyyy-MM-dd HH:mm:ss"),
      ])
    );

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.map((val) => `"${val}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hackathon_teams_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetTeamQuota = async (teamId: string) => {
    setResettingQuotaTeamId(teamId);
    setQuotaResetMessage(null);
    try {
      const response = await fetch(`/api/admin/hackathon/teams/${teamId}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setQuotaResetMessage({ teamId, message: data.error || "Failed to reset quota" });
        return;
      }
      setQuotaResetMessage({
        teamId,
        message: data.reset === 0 ? "No bookings to reset" : `Reset ${data.reset} booking(s) — quota restored`,
      });
    } catch {
      setQuotaResetMessage({ teamId, message: "Failed to reset quota" });
    } finally {
      setResettingQuotaTeamId(null);
    }
  };

  const runAutoMatching = async () => {
    setRunningMatching(true);
    setMatchingMessage("");

    try {
      const response = await fetch("/api/admin/hackathon/team-matching/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();

      if (!response.ok) {
        setMatchingMessage(data.error || "Failed to run automatic matching");
        return;
      }

      setMatchingMessage(
        `Created ${data.result?.createdTeams?.length ?? 0} matched teams.`
      );
      await fetchTeams();
    } catch (error) {
      console.error("Error running auto matching:", error);
      setMatchingMessage("Failed to run automatic matching");
    } finally {
      setRunningMatching(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 font-[family-name:var(--font-mitr)]">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Teams</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">Participants in teams</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Team Size</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgSize}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Largest Team</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.largestTeam}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-2 border-b border-slate-700/50 pb-0">
        <button
          onClick={() => setActiveTab("browser")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "browser"
              ? "border-blue-400 text-blue-300"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <Users className="h-4 w-4" />
          Team Browser
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "leaderboard"
              ? "border-yellow-400 text-yellow-300"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <Trophy className="h-4 w-4" />
          Leaderboard
        </button>
      </div>

      {activeTab === "browser" && (
        <Card className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 shadow-xl overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent italic">Hackathon Team Browser</CardTitle>
                <CardDescription className="text-slate-400">
                  Browse all teams and their respective members.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runAutoMatching}
                  disabled={runningMatching}
                  className="border-slate-700 hover:bg-slate-800 transition-all font-medium"
                >
                  {runningMatching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="mr-2 h-4 w-4" />
                  )}
                  Run Auto Matching
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCSV} className="border-slate-700 hover:bg-slate-800 transition-all font-medium">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </div>
            </div>
            {matchingMessage && (
              <div className="mt-3 rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-100">
                {matchingMessage}
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by team name, lobby code, or member name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-950/50 border-slate-700 focus:ring-blue-500/50"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "score" | "created" | "members")}
                className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
              >
                <option value="score">Sort by Score</option>
                <option value="members">Sort by Members</option>
                <option value="created">Sort by Created</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-slate-700/50 overflow-hidden bg-slate-950/20">
              <Table>
                <TableHeader className="bg-slate-900/60">
                  <TableRow className="hover:bg-transparent border-slate-700/50">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[56px] text-slate-300 font-medium tracking-tight">Rank</TableHead>
                    <TableHead className="text-slate-300 font-medium tracking-tight">Team Name</TableHead>
                    <TableHead className="text-slate-300 font-medium tracking-tight">Lobby Code</TableHead>
                    <TableHead className="text-slate-300 font-medium tracking-tight text-center">Members</TableHead>
                    <TableHead className="text-slate-300 font-medium tracking-tight text-right">Score</TableHead>
                    <TableHead className="text-slate-300 font-medium tracking-tight">Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        {searchQuery
                          ? "No teams found matching your search"
                          : "No teams created yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeams.map((team, index) => (
                      <React.Fragment key={team.id}>
                        <TableRow
                          className={`cursor-pointer transition-all duration-200 border-slate-800/50 ${
                            expandedTeamId === team.id ? "bg-blue-500/5" : "hover:bg-slate-800/40"
                          }`}
                          onClick={() =>
                            setExpandedTeamId(expandedTeamId === team.id ? null : team.id)
                          }
                        >
                          <TableCell>
                            <motion.div
                              animate={{ rotate: expandedTeamId === team.id ? 90 : 0 }}
                              transition={{ duration: 0.2, ease: [0.05, 0.7, 0.35, 0.99] }}
                            >
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            </motion.div>
                          </TableCell>
                          <TableCell>
                            <RankBadge rank={index + 1} />
                          </TableCell>
                          <TableCell className="font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
                            {team.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs border-blue-500/20 bg-blue-500/5 text-blue-300/80">
                              {team.lobby_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-medium text-slate-200">{team.hackathon_team_members.length}</span>
                              <div className="flex -space-x-2">
                                {team.hackathon_team_members.slice(0, 3).map((m, i) => (
                                  <div key={i} className="h-5 w-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                                    {m.hackathon_participants.name[0]}
                                  </div>
                                ))}
                                {team.hackathon_team_members.length > 3 && (
                                  <div className="h-5 w-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[8px] text-slate-500">
                                    +{team.hackathon_team_members.length - 3}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <ScoreBadge score={team.total_score} rank={index + 1} />
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {format(new Date(team.created_at), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>

                        <TableRow className="border-none hover:bg-transparent">
                          <TableCell colSpan={7} className="p-0 border-none">
                            <AnimatePresence initial={false}>
                              {expandedTeamId === team.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: [0.05, 0.7, 0.35, 0.99] }}
                                  className="overflow-hidden bg-slate-900/10 backdrop-blur-sm"
                                >
                                  <div className="px-12 py-6 border-b border-slate-800/50">
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        <Users className="h-4 w-4 text-blue-400" />
                                        Team Members
                                      </h4>
                                      <div className="flex items-center gap-2">
                                        {quotaResetMessage?.teamId === team.id && (
                                          <span className="text-[10px] text-slate-400">{quotaResetMessage.message}</span>
                                        )}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => { e.stopPropagation(); resetTeamQuota(team.id); }}
                                          disabled={resettingQuotaTeamId === team.id}
                                          className="border-slate-700 hover:bg-slate-800 text-xs h-7 px-2"
                                        >
                                          {resettingQuotaTeamId === team.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                          ) : (
                                            <RotateCcw className="h-3 w-3 mr-1" />
                                          )}
                                          Reset Mentor Quota
                                        </Button>
                                        <Badge variant="outline" className="text-[10px] border-slate-700 bg-slate-800/50 text-slate-400 px-2 py-0">
                                          {team.hackathon_team_members.length} Active
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-700/50 bg-slate-950/40 shadow-inner overflow-hidden">
                                      <Table>
                                        <TableHeader className="bg-slate-900/80">
                                          <TableRow className="hover:bg-transparent border-slate-800/50">
                                            <TableHead className="text-[10px] text-slate-400 uppercase tracking-[0.1em] h-9">Name <span className="normal-case text-slate-600 font-normal">(click for details)</span></TableHead>
                                            <TableHead className="text-[10px] text-slate-400 uppercase tracking-[0.1em] h-9">University</TableHead>
                                            <TableHead className="text-[10px] text-slate-400 uppercase tracking-[0.1em] h-9">When Joined (Team)</TableHead>
                                            <TableHead className="text-[10px] text-slate-400 uppercase tracking-[0.1em] h-9 text-right">When Reg (Hackathon)</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {team.hackathon_team_members.map((member) => (
                                            <TableRow
                                              key={member.participant_id}
                                              className="hover:bg-slate-800/30 border-slate-800/50 group/member cursor-pointer"
                                              onClick={(e) => { e.stopPropagation(); setSelectedParticipant({ participant: member.hackathon_participants, isOwner: member.participant_id === team.owner_id }); }}
                                            >
                                              <TableCell className="text-sm py-3">
                                                <div className="flex flex-col">
                                                  <span className="font-semibold text-slate-200 group-hover/member:text-blue-200 transition-colors">
                                                    {member.hackathon_participants.name}
                                                    {member.participant_id === team.owner_id && (
                                                      <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 align-middle">Owner</span>
                                                    )}
                                                  </span>
                                                  <span className="text-xs text-slate-500 font-mono">
                                                    {member.hackathon_participants.email}
                                                  </span>
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-sm py-3 text-slate-400 font-medium">
                                                {member.hackathon_participants.university}
                                              </TableCell>
                                              <TableCell className="text-xs py-3">
                                                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-blue-500/5 border border-blue-500/10 w-fit text-blue-300/70 group-hover/member:border-blue-500/30 transition-colors">
                                                  <Calendar className="h-3 w-3" />
                                                  {format(new Date(member.joined_at), "MMM d, HH:mm")}
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-xs py-3 text-right">
                                                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-purple-500/5 border border-purple-500/10 w-fit text-purple-300/70 group-hover/member:border-purple-500/30 transition-colors ml-auto">
                                                  <Calendar className="h-3 w-3" />
                                                  {format(
                                                    new Date(member.hackathon_participants.created_at),
                                                    "MMM d, HH:mm"
                                                  )}
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>

                                    <TeamMessageForm
                                      teamId={team.id}
                                      teamName={team.name}
                                      memberCount={team.hackathon_team_members.length}
                                    />
                                    <MentorAssignmentRow
                                      teamId={team.id}
                                      teamName={team.name}
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedParticipant && (
        <ParticipantDetailModal
          participant={selectedParticipant.participant}
          isOwner={selectedParticipant.isOwner}
          onClose={() => setSelectedParticipant(null)}
        />
      )}

      {activeTab === "leaderboard" && (
        <Card className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 shadow-xl overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent italic flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  Hackathon Leaderboard
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Teams ranked by total score. Click any row to view submissions.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <LeaderboardView />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
