/**
 * ProjectOverviewPanel - Comprehensive project overview when no milestone selected
 * Shows project progress, all milestones, and all journal entries
 */

"use client";

import React, { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Clock,
  FileText,
  CheckCircle2,
  Circle,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import {
  ProjectWithMilestones,
  MilestoneWithJournals,
  ProjectMilestone,
} from "@/types/journey";

interface ProjectOverviewPanelProps {
  project: ProjectWithMilestones;
  milestones: MilestoneWithJournals[];
  onMilestoneSelect: (milestone: ProjectMilestone) => void;
}

// ========================================
// PROGRESS SUMMARY SECTION
// ========================================

function ProgressSummary({
  milestones,
}: {
  milestones: MilestoneWithJournals[];
}) {
  const completed = milestones.filter((m) => m.status === "completed").length;
  const total = milestones.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Calculate total time spent (in hours)
  const totalTime = milestones.reduce(
    (sum, m) => sum + (m.total_time_spent || 0),
    0
  );
  const totalHours = Math.round((totalTime / 60) * 10) / 10; // Convert minutes to hours

  // Count total journals
  const totalJournals = milestones.reduce(
    (sum, m) => sum + (m.journal_count || m.journals?.length || 0),
    0
  );

  return (
    <div className="p-4 border-b border-slate-800 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-400" />
          Project Overview
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Track your progress across all milestones
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-medium text-slate-300">
            Overall Progress
          </span>
          <span className="text-2xl font-bold text-blue-400">
            {percentage}%
          </span>
        </div>
        <Progress value={percentage} className="h-3" />
        <p className="text-xs text-slate-500">
          {completed} of {total} milestones completed
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700">
          <div className="text-2xl font-bold text-green-400">{total}</div>
          <div className="text-xs text-slate-400 mt-1">Total</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700">
          <div className="text-2xl font-bold text-blue-400">{completed}</div>
          <div className="text-xs text-slate-400 mt-1">Complete</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700">
          <div className="text-2xl font-bold text-amber-400">{totalHours}h</div>
          <div className="text-xs text-slate-400 mt-1">Time Spent</div>
        </div>
      </div>

      {/* Info Row */}
      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800/30 rounded p-2">
        <div className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          <span>{totalJournals} journal entries</span>
        </div>
      </div>
    </div>
  );
}

// ========================================
// NORTH STAR SECTION
// ========================================

function NorthStarSection({ project }: { project: ProjectWithMilestones }) {
  const northStar = project.metadata?.milestone_north_star;

  if (!northStar) {
    return null;
  }

  return (
    <div className="p-4 border-b border-slate-800 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-amber-100 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          North Star
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Your guiding vision for this project
        </p>
      </div>

      <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-lg p-4 border border-amber-800/30">
        <h3 className="font-semibold text-amber-100 mb-2">
          {northStar.title}
        </h3>
        
        {northStar.description && (
          <div className="mb-3">
            <p className="text-sm text-amber-200/80 leading-relaxed">
              {northStar.description}
            </p>
          </div>
        )}
        
        {northStar.why && (
          <div>
            <p className="text-xs font-medium text-amber-300 mb-1">Why this matters:</p>
            <p className="text-sm text-amber-200/70 leading-relaxed">
              {northStar.why}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// MILESTONE STATUS BADGE
// ========================================

function MilestoneStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-green-900/30 text-green-400 border-green-700/50 border flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Complete
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="bg-blue-900/30 text-blue-400 border-blue-700/50 border flex items-center gap-1">
          <Circle className="w-2 h-2 fill-blue-400" />
          In Progress
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-800 text-slate-400 border-slate-700 border flex items-center gap-1">
          <Circle className="w-2 h-2" />
          Not Started
        </Badge>
      );
  }
}

// ========================================
// ALL MILESTONES LIST SECTION
// ========================================

function AllMilestonesList({
  milestones,
  onSelect,
}: {
  milestones: MilestoneWithJournals[];
  onSelect: (milestone: ProjectMilestone) => void;
}) {
  const [sortBy, setSortBy] = useState<
    "date" | "progress" | "status" | "title"
  >("date");

  const sortedMilestones = useMemo(() => {
    const sorted = [...milestones];
    switch (sortBy) {
      case "progress":
        return sorted.sort(
          (a, b) => (b.progress_percentage || 0) - (a.progress_percentage || 0)
        );
      case "status":
        const statusOrder = { completed: 0, in_progress: 1, not_started: 2 };
        return sorted.sort(
          (a, b) =>
            (statusOrder[a.status as keyof typeof statusOrder] || 2) -
            (statusOrder[b.status as keyof typeof statusOrder] || 2)
        );
      case "title":
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case "date":
      default:
        return sorted.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        );
    }
  }, [milestones, sortBy]);

  return (
    <div className="space-y-3">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          All Milestones
        </h3>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Recent</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="title">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="px-2 space-y-2">
        {sortedMilestones.map((milestone) => (
          <button
            key={milestone.id}
            onClick={() => onSelect(milestone)}
            className="w-full text-left p-3 rounded-lg hover:bg-slate-800/50 transition-colors border border-slate-800 hover:border-slate-700 group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-slate-100 group-hover:text-white truncate">
                  {milestone.title}
                </h4>
                {milestone.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {milestone.description}
                  </p>
                )}
              </div>
              <MilestoneStatusBadge status={milestone.status} />
            </div>

            {/* Progress Bar */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                  style={{ width: `${milestone.progress_percentage || 0}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-8 text-right">
                {milestone.progress_percentage || 0}%
              </span>
            </div>

            {/* Journal Count */}
            {(milestone.journal_count || milestone.journals?.length) > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                <FileText className="w-3 h-3" />
                <span>
                  {milestone.journal_count || milestone.journals?.length || 0}{" "}
                  entries
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ========================================
// ALL JOURNALS LIST SECTION
// ========================================

function AllJournalsList({
  milestones,
}: {
  milestones: MilestoneWithJournals[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMilestone, setFilterMilestone] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc">("date-desc");

  // Flatten all journals with milestone info
  const allJournals = useMemo(() => {
    const journals: Array<any> = [];
    milestones.forEach((milestone) => {
      (milestone.journals || []).forEach((journal) => {
        journals.push({
          ...journal,
          milestoneId: milestone.id,
          milestoneName: milestone.title,
        });
      });
    });
    return journals;
  }, [milestones]);

  // Filter and sort journals
  const filteredJournals = useMemo(() => {
    let filtered = [...allJournals];

    // Filter by milestone
    if (filterMilestone !== "all") {
      filtered = filtered.filter((j) => j.milestoneId === filterMilestone);
    }

    // Search by title or content
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (j) =>
          (j.title || "").toLowerCase().includes(query) ||
          (j.content || "").toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return sortBy === "date-desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [allJournals, filterMilestone, searchQuery, sortBy]);

  return (
    <div className="space-y-3 pt-4 border-t border-slate-800">
      <div className="px-4 pb-2">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-amber-400" />
          All Journal Entries
        </h3>

        {/* Search and Filters */}
        <div className="space-y-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm bg-slate-800 border-slate-700"
            />
          </div>

          {/* Filter and Sort Controls */}
          <div className="flex gap-2">
            <Select value={filterMilestone} onValueChange={setFilterMilestone}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Milestones</SelectItem>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="h-8 text-xs w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest</SelectItem>
                <SelectItem value="date-asc">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Journals List */}
      <div className="px-2 space-y-2">
        {filteredJournals.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No journal entries found</p>
          </div>
        ) : (
          filteredJournals.map((journal) => (
            <div
              key={journal.id}
              className="p-3 rounded-lg bg-slate-800/30 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-2">
                {/* Title and Milestone Badge */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-slate-200 text-sm flex-1">
                    {journal.title || "Untitled Entry"}
                  </h4>
                  <Badge className="bg-slate-700 text-slate-300 border-slate-600 border text-xs flex-shrink-0">
                    {journal.milestoneName}
                  </Badge>
                </div>

                {/* Content Preview */}
                {journal.content && (
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {journal.content}
                  </p>
                )}

                {/* Date */}
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>
                    {new Date(journal.created_at || 0).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export function ProjectOverviewPanel({
  project,
  milestones,
  onMilestoneSelect,
}: ProjectOverviewPanelProps) {
  return (
    <div className="h-full flex flex-col bg-slate-900">
      <ScrollArea className="flex-1">
        <ProgressSummary milestones={milestones} />
        <NorthStarSection project={project} />
        <AllMilestonesList
          milestones={milestones}
          onSelect={onMilestoneSelect}
        />
        <AllJournalsList milestones={milestones} />
      </ScrollArea>
    </div>
  );
}
