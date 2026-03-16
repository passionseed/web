"use client";

import { useState } from "react";

type Participant = {
  id: string;
  name: string;
  email: string;
  university: string;
  role: string;
  referral_source: string | null;
  team: { name: string } | null;
  created_at: string;
};

type BetaRegistration = {
  id: string;
  full_name: string;
  nickname: string;
  email: string;
  school: string;
  grade: string;
  platform: string;
  motivation: string;
  faculty_interest: string;
  major_interest: string;
  created_at: string;
};

function CollapseToggle({
  isOpen,
  onToggle,
  count,
  label,
}: {
  isOpen: boolean;
  onToggle: () => void;
  count: number;
  label: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3 w-full group mb-4"
    >
      <span
        className={`w-5 h-5 flex items-center justify-center rounded border border-white/20 bg-white/5 text-white/50 text-xs transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
      >
        ▶
      </span>
      <span className="text-white/60 text-sm group-hover:text-white/80 transition-colors">
        {isOpen ? `Hide ${label}` : `Show all ${count} ${label}`}
      </span>
      <span className="text-white/20 text-xs">({count} entries)</span>
    </button>
  );
}

export function ParticipantTable({
  participants,
}: {
  participants: Participant[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = participants.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.university || "").toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) {
    return (
      <CollapseToggle
        isOpen={false}
        onToggle={() => setIsOpen(true)}
        count={participants.length}
        label="hackathon participants"
      />
    );
  }

  return (
    <div>
      <CollapseToggle
        isOpen={true}
        onToggle={() => setIsOpen(false)}
        count={participants.length}
        label="hackathon participants"
      />
      <input
        type="text"
        placeholder="Search by name, email or university…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/30"
      />
      <p className="text-white/40 text-xs mb-3">
        Showing {filtered.length} of {participants.length} participants
      </p>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left px-4 py-3 text-white/50 font-medium">#</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">University</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Role</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Team</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-2.5 text-white/30">{i + 1}</td>
                <td className="px-4 py-2.5 text-white font-medium">{p.name}</td>
                <td className="px-4 py-2.5 text-white/70 font-mono text-xs">{p.email}</td>
                <td className="px-4 py-2.5 text-white/60">{p.university || "—"}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {p.role || "participant"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {p.team ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {p.team.name}
                    </span>
                  ) : (
                    <span className="text-white/20 text-xs">No team</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-white/40 text-xs">
                  {p.referral_source || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BetaTable({
  registrations,
}: {
  registrations: BetaRegistration[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = registrations.filter(
    (r) =>
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      (r.school || "").toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) {
    return (
      <CollapseToggle
        isOpen={false}
        onToggle={() => setIsOpen(true)}
        count={registrations.length}
        label="beta registrations"
      />
    );
  }

  return (
    <div>
      <CollapseToggle
        isOpen={true}
        onToggle={() => setIsOpen(false)}
        count={registrations.length}
        label="beta registrations"
      />
      <input
        type="text"
        placeholder="Search by name, email or school…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/30"
      />
      <p className="text-white/40 text-xs mb-3">
        Showing {filtered.length} of {registrations.length} registrations
      </p>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left px-4 py-3 text-white/50 font-medium">#</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">School</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Grade</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Interest</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Why they want in</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-2.5 text-white/30">{i + 1}</td>
                <td className="px-4 py-2.5 text-white font-medium">
                  {r.full_name}
                  {r.nickname && (
                    <span className="ml-1.5 text-white/30 text-xs">({r.nickname})</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-white/70 font-mono text-xs">{r.email}</td>
                <td className="px-4 py-2.5 text-white/60">{r.school || "—"}</td>
                <td className="px-4 py-2.5 text-white/60">{r.grade || "—"}</td>
                <td className="px-4 py-2.5">
                  {r.faculty_interest ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      {r.faculty_interest}
                      {r.major_interest ? ` · ${r.major_interest}` : ""}
                    </span>
                  ) : (
                    <span className="text-white/20 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-white/55 text-xs max-w-xs">
                  {r.motivation || <span className="text-white/20">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
