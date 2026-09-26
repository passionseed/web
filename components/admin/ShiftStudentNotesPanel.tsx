"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ShiftStudentNote } from "@/types/shift";

interface ShiftStudentNotesPanelProps {
  studentId: string;
  currentWeekLabel: string;
  onChanged: () => Promise<void> | void;
}

export function ShiftStudentNotesPanel({
  studentId,
  currentWeekLabel,
  onChanged,
}: ShiftStudentNotesPanelProps) {
  const [notes, setNotes] = useState<ShiftStudentNote[] | null>(null);
  const [weekLabel, setWeekLabel] = useState(currentWeekLabel);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeek, setEditWeek] = useState("");
  const [editBody, setEditBody] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/shift/students/${studentId}/notes`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setNotes(json.notes);
    } catch {
      toast.error("Failed to load notes");
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!weekLabel.trim() || !body.trim()) {
      toast.error("Week label and note are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shift/students/${studentId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_label: weekLabel.trim(), body: body.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Note added");
      setBody("");
      await load();
      await onChanged();
    } catch {
      toast.error("Failed to add note");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(note: ShiftStudentNote) {
    setEditingId(note.id);
    setEditWeek(note.week_label);
    setEditBody(note.body);
  }

  async function saveEdit(noteId: string) {
    if (!editWeek.trim() || !editBody.trim()) {
      toast.error("Week label and note are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shift/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_label: editWeek.trim(), body: editBody.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Note updated");
      setEditingId(null);
      await load();
      await onChanged();
    } catch {
      toast.error("Failed to update note");
    } finally {
      setSaving(false);
    }
  }

  async function removeNote(noteId: string) {
    if (!window.confirm("Delete this note?")) return;
    try {
      const res = await fetch(`/api/admin/shift/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Note deleted");
      await load();
      await onChanged();
    } catch {
      toast.error("Failed to delete note");
    }
  }

  return (
    <div className="space-y-4 rounded-md bg-muted/40 p-4">
      <form onSubmit={addNote} className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={weekLabel}
            onChange={(e) => setWeekLabel(e.target.value)}
            placeholder="Week 1"
            className="w-28"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened with this kid this week?"
            rows={2}
            className="flex-1"
          />
        </div>
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add note
        </Button>
      </form>

      {notes === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading notes...
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-md border bg-background p-3">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Input
                    value={editWeek}
                    onChange={(e) => setEditWeek(e.target.value)}
                    className="w-28"
                  />
                  <Textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(note.id)} disabled={saving}>
                      <Check className="mr-1 h-4 w-4" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="mr-1 h-4 w-4" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{note.week_label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), "d MMM yyyy, HH:mm")}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit note"
                        onClick={() => startEdit(note)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete note"
                        onClick={() => removeNote(note.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
