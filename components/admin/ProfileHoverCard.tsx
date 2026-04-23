"use client";

import Link from "next/link";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MessageCircle, GraduationCap, Users, ExternalLink } from "lucide-react";

interface ProfileHoverCardProps {
  children: React.ReactNode;
  name: string | null;
  email?: string | null;
  university?: string | null;
  phone?: string | null;
  lineId?: string | null;
  track?: string | null;
  gradeLevel?: string | null;
  teamName?: string | null;
  teamLobbyCode?: string | null;
}

export function ProfileHoverCard({
  children,
  name,
  email,
  university,
  phone,
  lineId,
  track,
  gradeLevel,
  teamName,
  teamLobbyCode,
}: ProfileHoverCardProps) {
  if (!name && !email) return <>{children}</>;

  const initial = (name ?? email ?? "?").charAt(0).toUpperCase();
  const hasContact = phone || lineId;
  const hasMeta = track || gradeLevel;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        className="w-72 border-slate-700 bg-slate-900 p-0"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-3 pb-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-200">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            {name && <div className="text-sm font-semibold text-slate-100 truncate">{name}</div>}
            {email && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                {email}
              </div>
            )}
            {university && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate mt-0.5">
                <GraduationCap className="h-3 w-3 shrink-0" />
                {university}
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {hasMeta && (
          <div className="flex flex-wrap gap-1 px-3 pb-2">
            {track && (
              <Badge variant="outline" className="text-[10px] border-purple-500/30 bg-purple-500/10 text-purple-300 px-1.5 py-0">
                {track}
              </Badge>
            )}
            {gradeLevel && (
              <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300 px-1.5 py-0">
                {gradeLevel}
              </Badge>
            )}
          </div>
        )}

        {/* Contact */}
        {hasContact && (
          <div className="flex items-center gap-3 border-t border-slate-800 px-3 py-2">
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-1 text-[11px] text-green-300 hover:text-green-200 font-mono">
                <Phone className="h-3 w-3" />
                {phone}
              </a>
            )}
            {lineId && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-300 font-mono">
                <MessageCircle className="h-3 w-3" />
                {lineId}
              </span>
            )}
          </div>
        )}

        {/* Team */}
        {teamName && (
          <div className="flex items-center gap-2 border-t border-slate-800 px-3 py-2">
            <Users className="h-3 w-3 text-indigo-300 shrink-0" />
            <span className="text-[11px] text-indigo-200 truncate">{teamName}</span>
            {teamLobbyCode && (
              <span className="text-[10px] font-mono text-slate-500">{teamLobbyCode}</span>
            )}
          </div>
        )}

        {/* Link to participants page */}
        <Link
          href="/admin/hackathon/participants"
          target="_blank"
          className="flex items-center justify-center gap-1.5 border-t border-slate-800 px-3 py-2 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-slate-800/50 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          View in Participants
        </Link>
      </HoverCardContent>
    </HoverCard>
  );
}
