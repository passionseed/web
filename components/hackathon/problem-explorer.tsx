"use client";

import React, { useMemo } from "react";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Import all problem data at build time
import p1Data from "@/public/data/hackathon/problems/p1.json";
import p2Data from "@/public/data/hackathon/problems/p2.json";
import p3Data from "@/public/data/hackathon/problems/p3.json";
import p4Data from "@/public/data/hackathon/problems/p4.json";
import p5Data from "@/public/data/hackathon/problems/p5.json";
import p6Data from "@/public/data/hackathon/problems/p6.json";
import p7Data from "@/public/data/hackathon/problems/p7.json";
import p8Data from "@/public/data/hackathon/problems/p8.json";
import p9Data from "@/public/data/hackathon/problems/p9.json";

// Types
interface ProblemData {
  problemId: string;
  title: { en: string; th: string };
  track: string;
  trackNum: string;
  color: string;
  hook: { en: string; th: string };
  tags: string[];
  statistics: Array<{ stat: string; source: string; year: string }>;
}

interface ProblemExplorerProps {
  selectedProblems: string[];
  onSelectionChange: (problems: string[]) => void;
  error?: string;
}

interface TrackInfo {
  trackNum: string;
  trackName: string;
  color: string;
  problems: ProblemData[];
}

// All problems data
const allProblems: ProblemData[] = [
  p1Data as ProblemData,
  p2Data as ProblemData,
  p3Data as ProblemData,
  p4Data as ProblemData,
  p5Data as ProblemData,
  p6Data as ProblemData,
  p7Data as ProblemData,
  p8Data as ProblemData,
  p9Data as ProblemData,
];

// Track display names (bilingual)
const trackLabels: Record<string, { th: string; en: string }> = {
  "01": { th: "การแพทย์แผนไทยและแบบบูรณาการ", en: "Traditional & Integrative Healthcare" },
  "02": { th: "สุขภาพจิต", en: "Mental Health" },
  "03": { th: "สุขภาพชุมชน สาธารณะ และสิ่งแวดล้อม", en: "Community, Public & Environmental Health" },
};

// Track color mappings for Dawn theme
const trackColors: Record<string, string> = {
  "01": "#91C4E3", // Light blue
  "02": "#A594BA", // Lavender
  "03": "#91C4E3", // Light blue (same as 01 based on data)
};

export function ProblemExplorer({
  selectedProblems,
  onSelectionChange,
  error,
}: ProblemExplorerProps) {
  // Group problems by track
  const tracks = useMemo<TrackInfo[]>(() => {
    const grouped = allProblems.reduce((acc, problem) => {
      const trackNum = problem.trackNum;
      if (!acc[trackNum]) {
        acc[trackNum] = {
          trackNum,
          trackName: trackLabels[trackNum]?.th || problem.track,
          color: trackColors[trackNum] || problem.color,
          problems: [],
        };
      }
      acc[trackNum].problems.push(problem);
      return acc;
    }, {} as Record<string, TrackInfo>);

    return Object.values(grouped).sort((a, b) =>
      a.trackNum.localeCompare(b.trackNum)
    );
  }, []);

  // Toggle problem selection
  const toggleProblem = (problemId: string) => {
    const isSelected = selectedProblems.includes(problemId);
    if (isSelected) {
      onSelectionChange(selectedProblems.filter((id) => id !== problemId));
    } else {
      onSelectionChange([...selectedProblems, problemId]);
    }
  };

  // Get first stat for display
  const getFirstStat = (problem: ProblemData): string => {
    if (problem.statistics && problem.statistics.length > 0) {
      return problem.statistics[0].stat;
    }
    return "";
  };

  // Truncate text
  const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  return (
    <div className="w-full space-y-6">
      {/* No-pressure banner */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3">
        <p className="text-sm text-indigo-200">
          <span className="font-medium text-indigo-100">หมายเหตุ:</span>{" "}
          การบันทึกปัญหาที่สนใจไม่มีผลต่อการจัดทีมของคุณ — เราแค่อยากรู้ว่าคุณใส่ใจเรื่องอะไร
          <span className="ml-2 text-indigo-300/80">
            (Saving a problem doesn&apos;t affect your team assignment. We just want to know what you care about.)
          </span>
        </p>
      </div>

      {/* Selection count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-300">
          <span className="font-medium text-white">{selectedProblems.length}</span>{" "}
          ปัญหาที่บันทึกไว้
          <span className="ml-2 text-slate-400">
            ({selectedProblems.length} saved)
          </span>
        </p>
        {selectedProblems.length === 0 && (
          <p className="text-sm text-amber-400">
            กรุณาเลือกอย่างน้อย 1 ปัญหา
            <span className="ml-2 text-amber-400/70">(Please select at least 1 problem)</span>
          </p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Tracks */}
      <div className="space-y-8">
        {tracks.map((track) => (
          <div key={track.trackNum} className="space-y-4">
            {/* Track header */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-slate-900"
                style={{ backgroundColor: track.color }}
              >
                {track.trackNum}
              </div>
              <div>
                <h3 className="font-medium text-white">{trackLabels[track.trackNum]?.th}</h3>
                <p className="text-xs text-slate-400">{trackLabels[track.trackNum]?.en}</p>
              </div>
            </div>

            {/* Problem cards grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {track.problems.map((problem) => {
                const isSelected = selectedProblems.includes(problem.problemId);
                const firstStat = getFirstStat(problem);

                return (
                  <div
                    key={problem.problemId}
                    className={`
                      ei-card group relative flex flex-col overflow-hidden rounded-xl p-4
                      cursor-pointer transition-all duration-200
                      ${isSelected ? "ei-card--lit ring-1 ring-amber-400/50" : ""}
                    `}
                    onClick={() => toggleProblem(problem.problemId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        toggleProblem(problem.problemId);
                      }
                    }}
                  >
                    {/* Track badge */}
                    <div className="mb-3 flex items-center justify-between">
                      <Badge
                        className="text-xs font-medium"
                        style={{
                          backgroundColor: `${track.color}20`,
                          borderColor: `${track.color}40`,
                          color: track.color,
                        }}
                      >
                        Track {track.trackNum}
                      </Badge>

                      {/* Bookmark button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`
                          h-8 w-8 rounded-full transition-all duration-200
                          ${isSelected
                            ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 hover:text-amber-300"
                            : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-amber-400"
                          }
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProblem(problem.problemId);
                        }}
                        aria-label={isSelected ? "Remove bookmark" : "Add bookmark"}
                      >
                        <Star
                          className={`h-4 w-4 transition-all duration-200 ${
                            isSelected ? "fill-current" : ""
                          }`}
                        />
                      </Button>
                    </div>

                    {/* Title */}
                    <h4 className="mb-2 font-heading text-lg font-bold text-white">
                      {problem.title.th}
                    </h4>
                    <p className="mb-3 text-xs text-slate-400">{problem.title.en}</p>

                    {/* Hook */}
                    <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-slate-300">
                      {problem.hook.th}
                    </p>

                    {/* Key stat */}
                    {firstStat && (
                      <div className="mb-3 rounded-lg bg-white/5 px-3 py-2">
                        <p className="text-xs text-slate-400">ข้อมูลสำคัญ / Key Stat:</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-300">
                          {truncate(firstStat, 120)}
                        </p>
                      </div>
                    )}

                    {/* Tags */}
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {problem.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">
              {selectedProblems.length > 0
                ? `คุณได้บันทึก ${selectedProblems.length} ปัญหา`
                : "ยังไม่ได้เลือกปัญหา"}
            </p>
            <p className="text-xs text-slate-400">
              {selectedProblems.length > 0
                ? `You have saved ${selectedProblems.length} problem${selectedProblems.length > 1 ? "s" : ""}`
                : "No problems selected yet"}
            </p>
          </div>
          {selectedProblems.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
              onClick={() => onSelectionChange([])}
            >
              ล้างทั้งหมด / Clear all
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProblemExplorer;
