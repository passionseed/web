"use client";

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import type { CollectedData, OnboardingStep, ConversionPriority, UserType } from "@/types/onboarding";

interface OnboardingRow {
  user_id: string;
  current_step: OnboardingStep;
  collected_data: CollectedData;
  updated_at: string;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: "Welcome",
  interest: "Interest",
  assessment: "Assessment",
  influence: "Influence",
  results: "Results",
  account: "Account",
};

const STEP_COLORS: Record<OnboardingStep, string> = {
  welcome: "bg-slate-500",
  interest: "bg-blue-500",
  assessment: "bg-yellow-500",
  influence: "bg-orange-500",
  results: "bg-purple-500",
  account: "bg-green-500",
};

const PRIORITY_COLORS: Record<ConversionPriority, string> = {
  low: "bg-slate-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

const USER_TYPE_COLORS: Record<UserType, string> = {
  lost: "bg-red-500",
  explorer: "bg-blue-500",
  planner: "bg-purple-500",
  executor: "bg-green-500",
};

function displayName(row: OnboardingRow): string {
  return (
    row.collected_data.name ||
    row.profiles?.full_name ||
    row.profiles?.username ||
    row.user_id.slice(0, 8) + "..."
  );
}

function CollectedDataView({ data }: { data: CollectedData }) {
  const fields: { label: string; value: unknown }[] = [
    { label: "Language", value: data.language },
    { label: "Name", value: data.name },
    { label: "Mode", value: data.mode },
    { label: "Interests", value: data.interests?.join(", ") },
    { label: "Stage", value: data.stage },
    { label: "Target Clarity", value: data.target_clarity },
    { label: "Primary Blocker", value: data.primary_blocker },
    { label: "Confidence", value: data.confidence },
    { label: "Career Direction", value: data.career_direction },
    { label: "Commitment Signal", value: data.commitment_signal },
    { label: "Influencers", value: data.influencers?.join(", ") },
    { label: "Target University", value: data.target_university_name },
    { label: "Target Program", value: data.target_program_name },
    { label: "User Type", value: data.user_type },
    { label: "Next Action", value: data.next_action },
    { label: "Conversion Priority", value: data.conversion_priority },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map(({ label, value }) => {
        if (!value) return null;
        return (
          <div key={label} className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium">{String(value)}</p>
          </div>
        );
      })}
    </div>
  );
}

export function AdminStudentOnboarding() {
  const [rows, setRows] = useState<OnboardingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OnboardingRow | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/onboarding");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      // silently fail — table will be empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = rows.filter((row) => {
    const name = displayName(row).toLowerCase();
    const q = search.toLowerCase();
    return (
      name.includes(q) ||
      (row.collected_data.user_type ?? "").includes(q) ||
      (row.collected_data.conversion_priority ?? "").includes(q) ||
      row.current_step.includes(q)
    );
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Onboarding</CardTitle>
              <CardDescription>
                View onboarding progress and profiles for all students who have started onboarding.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, user type, priority, or step..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search ? "No results match your search." : "No onboarding data found."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Step Completed</TableHead>
                  <TableHead>User Type</TableHead>
                  <TableHead>Conversion Priority</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.user_id}>
                    <TableCell className="font-medium">{displayName(row)}</TableCell>
                    <TableCell>
                      <Badge className={`${STEP_COLORS[row.current_step]} text-white border-0`}>
                        {STEP_LABELS[row.current_step]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.collected_data.user_type ? (
                        <Badge
                          className={`${USER_TYPE_COLORS[row.collected_data.user_type]} text-white border-0`}
                        >
                          {row.collected_data.user_type}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.collected_data.conversion_priority ? (
                        <Badge
                          className={`${PRIORITY_COLORS[row.collected_data.conversion_priority]} text-white border-0`}
                        >
                          {row.collected_data.conversion_priority}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(row.updated_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelected(row)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <p className="text-xs text-muted-foreground">
            {filtered.length} of {rows.length} students
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? displayName(selected) : ""}</DialogTitle>
            <DialogDescription>
              Full onboarding data · Last updated{" "}
              {selected
                ? format(new Date(selected.updated_at), "MMM d, yyyy HH:mm")
                : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 pt-2">
              <div className="flex gap-2 flex-wrap">
                <Badge className={`${STEP_COLORS[selected.current_step]} text-white border-0`}>
                  Step: {STEP_LABELS[selected.current_step]}
                </Badge>
                {selected.collected_data.user_type && (
                  <Badge
                    className={`${USER_TYPE_COLORS[selected.collected_data.user_type]} text-white border-0`}
                  >
                    {selected.collected_data.user_type}
                  </Badge>
                )}
                {selected.collected_data.conversion_priority && (
                  <Badge
                    className={`${PRIORITY_COLORS[selected.collected_data.conversion_priority]} text-white border-0`}
                  >
                    Priority: {selected.collected_data.conversion_priority}
                  </Badge>
                )}
              </div>
              <CollectedDataView data={selected.collected_data} />
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">User ID: {selected.user_id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
