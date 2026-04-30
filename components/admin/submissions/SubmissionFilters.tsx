"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ReviewStatus, SubmissionScope } from "@/types/admin-hackathon";

interface SubmissionFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: ReviewStatus | "all" | "improvements";
  onStatusFilterChange: (value: ReviewStatus | "all" | "improvements") => void;
  scopeFilter: SubmissionScope | "all";
  onScopeFilterChange: (value: SubmissionScope | "all") => void;
}

export function SubmissionFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  scopeFilter,
  onScopeFilterChange,
}: SubmissionFiltersProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by participant, team, activity, or code"
          className="pl-9"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value as ReviewStatus | "all" | "improvements")}
        className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
      >
        <option value="all">All statuses</option>
        <option value="pending_review">Pending</option>
        <option value="improvements">Improvements only</option>
        <option value="passed">Passed</option>
        <option value="revision_required">Needs revision</option>
      </select>
      <select
        value={scopeFilter}
        onChange={(event) => onScopeFilterChange(event.target.value as SubmissionScope | "all")}
        className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
      >
        <option value="all">All scopes</option>
        <option value="individual">Individual</option>
        <option value="team">Team</option>
      </select>
    </div>
  );
}
