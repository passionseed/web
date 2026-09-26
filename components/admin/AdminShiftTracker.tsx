"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Instagram,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShiftStudentNotesPanel } from "@/components/admin/ShiftStudentNotesPanel";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";
import { cn } from "@/lib/utils";
import type { ShiftStudentSummary, ShiftStudentsResponse } from "@/types/shift";

const EMPTY_KID = { full_name: "", ig_handle: "", discord_handle: "" };

export function AdminShiftTracker() {
  const [data, setData] = useState<ShiftStudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_KID);
  const [newKid, setNewKid] = useState(EMPTY_KID);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shift/students");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load SHIFT students");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (showAddForm) nameInputRef.current?.focus();
  }, [showAddForm]);

  async function addKid(e: React.FormEvent) {
    e.preventDefault();
    const name = newKid.full_name.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/shift/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newKid),
      });
      if (!res.ok) throw new Error();
      toast.success(`Added ${name}`);
      setNewKid(EMPTY_KID);
      nameInputRef.current?.focus();
      await load();
    } catch {
      toast.error("Failed to add student");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(student: ShiftStudentSummary) {
    setEditingId(student.id);
    setEditForm({
      full_name: student.full_name,
      ig_handle: student.ig_handle ?? "",
      discord_handle: student.discord_handle ?? "",
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.full_name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shift/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      toast.success("Student updated");
      setEditingId(null);
      await load();
    } catch {
      toast.error("Failed to update student");
    } finally {
      setSaving(false);
    }
  }

  async function removeKid(student: ShiftStudentSummary) {
    if (!window.confirm(`Remove ${student.full_name} and all their notes?`)) return;
    try {
      const res = await fetch(`/api/admin/shift/students/${student.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success(`Removed ${student.full_name}`);
      if (expandedId === student.id) setExpandedId(null);
      await load();
    } catch {
      toast.error("Failed to remove student");
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 pt-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  const stats = data?.stats ?? {
    totalKids: 0,
    notesThisWeek: 0,
    kidsMissingNoteThisWeek: 0,
    currentWeekLabel: "Week 1",
  };
  const notedCount = stats.totalKids - stats.kidsMissingNoteThisWeek;
  const students = [...(data?.students ?? [])].sort(
    (a, b) => Number(a.has_note_this_week) - Number(b.has_note_this_week)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{stats.currentWeekLabel}</Badge>
          {stats.totalKids > 0 && (
            <>
              <div
                className="h-1.5 w-32 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={notedCount}
                aria-valuemax={stats.totalKids}
                aria-label={`Kids with a note in ${stats.currentWeekLabel}`}
              >
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.round((notedCount / stats.totalKids) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {notedCount} of {stats.totalKids} noted
                {stats.kidsMissingNoteThisWeek > 0 && (
                  <span className="font-medium text-amber-600 dark:text-amber-500">
                    {" "}
                    · {stats.kidsMissingNoteThisWeek} to go
                  </span>
                )}
              </p>
            </>
          )}
        </div>
        <Button
          size="sm"
          variant={showAddForm ? "secondary" : "outline"}
          onClick={() => setShowAddForm((v) => !v)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add kid
        </Button>
      </div>

      {showAddForm && (
        <form
          onSubmit={addKid}
          className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3"
        >
          <Input
            ref={nameInputRef}
            value={newKid.full_name}
            onChange={(e) => setNewKid({ ...newKid, full_name: e.target.value })}
            placeholder="Full name"
            aria-label="Full name"
            className="w-48 bg-background"
          />
          <Input
            value={newKid.ig_handle}
            onChange={(e) => setNewKid({ ...newKid, ig_handle: e.target.value })}
            placeholder="IG handle"
            aria-label="Instagram handle"
            className="w-40 bg-background"
          />
          <Input
            value={newKid.discord_handle}
            onChange={(e) => setNewKid({ ...newKid, discord_handle: e.target.value })}
            placeholder="Discord handle"
            aria-label="Discord handle"
            className="w-40 bg-background"
          />
          <Button type="submit" size="sm" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add
          </Button>
          <span className="text-xs text-muted-foreground">
            stays open so you can add the whole cohort
          </span>
        </form>
      )}

      {students.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="font-medium">No kids yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the kids of {SHIFT_COHORT.name} to start logging weekly notes.
          </p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add the first kid
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {students.map((student) => {
            const isExpanded = expandedId === student.id;
            const isEditing = editingId === student.id;
            return (
              <li
                key={student.id}
                className={cn(
                  "rounded-lg border bg-card transition-colors",
                  !isExpanded && "hover:bg-muted/50"
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : student.id)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      student.has_note_this_week ? "bg-emerald-500" : "bg-amber-500"
                    )}
                    title={
                      student.has_note_this_week
                        ? `Noted in ${stats.currentWeekLabel}`
                        : `No note in ${stats.currentWeekLabel} yet`
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium">{student.full_name}</span>
                      {student.ig_handle && (
                        <span className="text-xs text-muted-foreground">
                          @{student.ig_handle}
                        </span>
                      )}
                      {student.discord_handle && (
                        <span className="text-xs text-muted-foreground">
                          {student.discord_handle}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {student.latest_note ? student.latest_note.body : "No notes yet"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {!student.has_note_this_week && (
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-500">
                        Needs note
                      </span>
                    )}
                    {student.latest_note && (
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {formatDistanceToNow(new Date(student.latest_note.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {student.note_count} {student.note_count === 1 ? "note" : "notes"}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-4 py-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {student.ig_handle && (
                          <a
                            href={`https://instagram.com/${student.ig_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <Instagram className="h-3.5 w-3.5" />@{student.ig_handle}
                          </a>
                        )}
                        {student.discord_handle && (
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {student.discord_handle}
                          </span>
                        )}
                        {!student.ig_handle && !student.discord_handle && (
                          <span>No contact info</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Edit ${student.full_name}`}
                          onClick={() => startEdit(student)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Remove ${student.full_name}`}
                          onClick={() => removeKid(student)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border bg-background p-3">
                        <Input
                          value={editForm.full_name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, full_name: e.target.value })
                          }
                          aria-label="Full name"
                          className="w-48"
                        />
                        <Input
                          value={editForm.ig_handle}
                          onChange={(e) =>
                            setEditForm({ ...editForm, ig_handle: e.target.value })
                          }
                          aria-label="Instagram handle"
                          className="w-40"
                        />
                        <Input
                          value={editForm.discord_handle}
                          onChange={(e) =>
                            setEditForm({ ...editForm, discord_handle: e.target.value })
                          }
                          aria-label="Discord handle"
                          className="w-40"
                        />
                        <Button
                          size="sm"
                          onClick={() => saveEdit(student.id)}
                          disabled={saving}
                        >
                          <Check className="mr-1 h-4 w-4" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="mr-1 h-4 w-4" /> Cancel
                        </Button>
                      </div>
                    )}

                    <ShiftStudentNotesPanel
                      studentId={student.id}
                      currentWeekLabel={stats.currentWeekLabel}
                      onChanged={load}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
