"use client";

import React, { useRef, useState } from "react";
import { updatePaperText, PSTask } from "@/actions/ps";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface StatsPaperProps {
  stats: {
    feedbackCount: number;
    progressPercent: number;
    totalFocusMinutes: number;
  };
  tasks?: PSTask[];
  className?: string;
  variant?: "integrated" | "standalone"; // integrated = absolute positioning for cassette, standalone = static
  projectId?: string;
  paperText?: string | null;
}

export function StatsPaper({
  stats,
  tasks = [],
  className,
  variant = "integrated",
  projectId,
  paperText,
}: StatsPaperProps) {
  const [text, setText] = useState(paperText || "");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    if (projectId) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        updatePaperText(projectId, newText);
      }, 1000);
    }
  };

  const incompleteTasks = tasks
    .filter((t: any) => t.status !== "done")
    .slice(0, 5);

  // Calculate dynamic translation height based on visible list items
  const headingLines = 1; // "Side B: Tracks"
  const visibleListItems = incompleteTasks.length + (tasks.length > 5 ? 1 : 0);

  // Base 40px for 0-4 items. Add 20px per item above 4.
  const extraItems = Math.max(0, visibleListItems - 4);
  const translateDist = 60 + extraItems * 24;

  const FeedbackContent = (
    <div className="flex items-center gap-1.5 text-neutral-600">
      <span className="text-sm">💬</span>
      <span className="text-sm font-bold font-mono">{stats.feedbackCount}</span>
    </div>
  );

  return (
    <div
      className={cn(
        "bg-[#fdfbf6] shadow-sm border border-neutral-200/60 p-6 flex flex-col font-handwriting relative overflow-hidden transition-all duration-500 ease-out group/paper",
        variant === "integrated"
          ? "absolute left-2 right-2 top-12 pt-[58%] pb-8 rounded-b-sm -z-10 origin-top shadow-md group-hover/cassette:translate-y-[var(--hover-translate)] rotate-1 group-hover/cassette:rotate-0 "
          : "w-full min-h-[600px] rounded-sm rotate-1 hover:rotate-0 shadow-md hover:shadow-lg",
        className
      )}
      style={
        {
          // Subtle texture pattern
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
          "--hover-translate": `${translateDist}px`,
        } as React.CSSProperties
      }
    >
      {/* Interactive Text Area for Standalone Mode */}
      {variant === "standalone" ? (
        <textarea
          className="absolute inset-0 w-full h-full bg-transparent p-8 pb-32 resize-none outline-none text-neutral-700 font-handwriting text-lg leading-relaxed z-10"
          placeholder="Write Project Notes Here"
          value={text}
          onChange={handleTextChange}
          spellCheck={false}
        />
      ) : null}

      {/* Folded Corner Effect */}
      <div
        className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-neutral-200/50 to-transparent pointer-events-none z-20"
        style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
      />

      {/* Stats Section */}
      <div
        className={cn(
          "flex flex-row justify-center items-center gap-4 transition-opacity duration-300 absolute inset-x-0 px-4 bottom-10 box-border z-20 pointer-events-none", // Added pointer-events-none to let click through to textarea if needed, but links need pointer-events-auto
          variant === "integrated"
            ? "pt-[250px] group-hover/cassette:opacity-0"
            : "top-8 h-auto static opacity-100 mb-8 pointer-events-auto" // Re-enable pointer events for stats
        )}
      >
        {projectId ? (
          <Link
            href={`/ps/projects/${projectId}/feedback`}
            className="hover:bg-neutral-100 p-1 -m-1 rounded transition-colors group/feedback relative z-20"
            title="Go to Feedback Hub"
            onClick={(e) => e.stopPropagation()}
          >
            {FeedbackContent}
          </Link>
        ) : (
          FeedbackContent
        )}

        <div className="w-px h-3 bg-neutral-300/50" />

        <div className="flex items-center gap-1.5 text-neutral-600">
          <span className="text-sm">⏱️</span>
          <span className="text-sm font-bold font-mono">
            {stats.totalFocusMinutes}m
          </span>
        </div>

        <div className="w-px h-3 bg-neutral-300/50" />

        <div className="flex items-center gap-1.5 text-neutral-600">
          <span className="text-sm">📈</span>
          <span className="text-sm font-bold font-mono">
            {stats.progressPercent}%
          </span>
        </div>
      </div>

      {/* Tasks List Section - Only visible in integrated mode or at bottom of standalone */}
      {/* Actually, if standalone has textarea covering everything, we might want to hide tasks or put them at bottom? */}
      {/* User image showed "Side B: Tracks" at the bottom. So I will keep it at the bottom. */}
      {/* I used absolute positioning for textarea with pb-32 to leave space at bottom. */}

      <div
        className={cn(
          "flex flex-col transition-opacity duration-300 box-border w-full justify-end z-20 pointer-events-none", // pointer-events-none to not block textarea typing area above it
          variant === "integrated"
            ? "absolute inset-0 p-5 opacity-0 group-hover/cassette:opacity-100"
            : "static opacity-100 pt-0 flex-1 justify-end pointer-events-auto" // Enable clicks on tasks if they are links/hoverable
        )}
      >
        <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 border-b border-dashed border-neutral-300 pb-1 flex justify-between items-end">
          <span>Side B: Tracks</span>
        </h4>
        <ul className="space-y-2 text-xs text-neutral-700 font-mono">
          {incompleteTasks.length > 0 ? (
            incompleteTasks.map((t: any, i: number) => (
              <li key={t.id} className="truncate flex gap-2 items-center">
                <span className="opacity-40 w-4 text-right font-bold text-[10px]">
                  0{i + 1}
                </span>
                <span className="truncate hover:text-neutral-900 transition-colors cursor-default">
                  {t.goal}
                </span>
              </li>
            ))
          ) : (
            <li className="text-neutral-400 italic text-center py-4">
              Silence...
            </li>
          )}
          {tasks.length > 5 && (
            <li className="text-[10px] text-neutral-400 pl-6 pt-1">
              ...and {tasks.length - 5} hidden tracks
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
