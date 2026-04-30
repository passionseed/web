"use client";

import { Badge } from "@/components/ui/badge";

export function RankBadge({ rank }: { rank: number }) {
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

export function ScoreBadge({ score, rank }: { score: number; rank: number }) {
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
