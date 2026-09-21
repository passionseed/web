"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShiftStudentNotesPanel } from "@/components/admin/ShiftStudentNotesPanel";
import type { ShiftStudentSummary, ShiftStudentsResponse } from "@/types/shift";

const EMPTY_KID = { full_name: "", ig_handle: "", discord_handle: "" };

export function AdminShiftTracker() {
  const [data, setData] = useState<ShiftStudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_KID);
  const [newKid, setNewKid] = useState(EMPTY_KID);
  const [saving, setSaving] = useState(false);

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

  async function addKid(e: React.FormEvent) {
    e.preventDefault();
    if (!newKid.full_name.trim()) {
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
      toast.success(`Added ${newKid.full_name.trim()}`);
      setNewKid(EMPTY_KID);
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
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading SHIFT tracker...
      </div>
    );
  }

  const stats = data?.stats ?? {
    totalKids: 0,
    notesThisWeek: 0,
    kidsMissingNoteThisWeek: 0,
    currentWeekLabel: "Week 1",
  };
  const students = data?.students ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kids tracked
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.totalKids}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Notes in {stats.currentWeekLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.notesThisWeek}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Missing a note this week
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {stats.kidsMissingNoteThisWeek}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Add a kid</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addKid} className="flex flex-wrap gap-2">
            <Input
              value={newKid.full_name}
              onChange={(e) => setNewKid({ ...newKid, full_name: e.target.value })}
              placeholder="Full name"
              className="w-48"
            />
            <Input
              value={newKid.ig_handle}
              onChange={(e) => setNewKid({ ...newKid, ig_handle: e.target.value })}
              placeholder="IG handle"
              className="w-40"
            />
            <Input
              value={newKid.discord_handle}
              onChange={(e) => setNewKid({ ...newKid, discord_handle: e.target.value })}
              placeholder="Discord handle"
              className="w-40"
            />
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {students.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No kids added yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>IG</TableHead>
              <TableHead>Discord</TableHead>
              <TableHead>Last note</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <Fragment key={student.id}>
                <TableRow>
                  {editingId === student.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editForm.full_name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, full_name: e.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.ig_handle}
                          onChange={(e) =>
                            setEditForm({ ...editForm, ig_handle: e.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.discord_handle}
                          onChange={(e) =>
                            setEditForm({ ...editForm, discord_handle: e.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell colSpan={2} />
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => saveEdit(student.id)}
                            disabled={saving}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(expandedId === student.id ? null : student.id)
                          }
                          className="flex items-center gap-1 font-medium hover:underline"
                        >
                          {expandedId === student.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {student.full_name}
                        </button>
                      </TableCell>
                      <TableCell>
                        {student.ig_handle ? (
                          <a
                            href={`https://instagram.com/${student.ig_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            @{student.ig_handle}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.discord_handle ?? (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.latest_note ? (
                          <span className="text-sm">
                            <Badge variant="secondary" className="mr-1">
                              {student.latest_note.week_label}
                            </Badge>
                            {formatDistanceToNow(new Date(student.latest_note.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No notes yet</span>
                        )}
                      </TableCell>
                      <TableCell>{student.note_count}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => startEdit(student)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => removeKid(student)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
                {expandedId === student.id && editingId !== student.id && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <ShiftStudentNotesPanel
                        studentId={student.id}
                        currentWeekLabel={stats.currentWeekLabel}
                        onChanged={load}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
