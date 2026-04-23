"use client";

import Link from "next/link";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Users, ExternalLink } from "lucide-react";

interface TeamMember {
  id: string;
  name: string | null;
  email?: string | null;
  university?: string | null;
}

interface TeamHoverCardProps {
  children: React.ReactNode;
  teamName: string | null;
  lobbyCode?: string | null;
  members: TeamMember[];
}

export function TeamHoverCard({ children, teamName, lobbyCode, members }: TeamHoverCardProps) {
  if (!teamName && members.length === 0) return <>{children}</>;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        className="w-72 border-slate-700 bg-slate-900 p-0"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 p-3 pb-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
            <Users className="h-4 w-4 text-indigo-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-100 truncate">
              {teamName ?? "Unnamed team"}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              {lobbyCode && <span className="font-mono">{lobbyCode}</span>}
              <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* Members */}
        {members.length > 0 && (
          <div className="border-t border-slate-800 px-3 py-2 space-y-1.5">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300">
                  {(m.name ?? m.email ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] text-slate-200 truncate block">
                    {m.name ?? m.email ?? m.id}
                  </span>
                  {m.university && (
                    <span className="text-[10px] text-slate-500 truncate block">{m.university}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link to teams page */}
        <Link
          href="/admin/hackathon/teams"
          target="_blank"
          className="flex items-center justify-center gap-1.5 border-t border-slate-800 px-3 py-2 text-[11px] text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/50 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          View in Teams
        </Link>
      </HoverCardContent>
    </HoverCard>
  );
}
