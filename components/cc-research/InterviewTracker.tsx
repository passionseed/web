"use client";

import { useMemo, useState } from "react";
import type {
  CcInterview,
  CcInterviewOutcome,
  CcInterviewStatus,
  CcLeadRow,
  CcPersona,
} from "@/lib/cc-research/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NewInterview {
  leadId: string;
  persona: CcPersona;
  contactName: string;
  contactRole: string;
  scheduledAt: string;
  status: CcInterviewStatus;
  outcome: CcInterviewOutcome;
  painThemeTags: string;
  notes: string;
}

interface InterviewTrackerProps {
  leads: CcLeadRow[];
  interviews: CcInterview[];
  onCreate: (payload: Omit<NewInterview, "painThemeTags"> & { painThemeTags: string[] }) => Promise<void>;
}

const personaOptions: CcPersona[] = ["student", "advisor", "counselor", "career_services", "transfer_office", "employer"];

function emptyInterview(): NewInterview {
  return {
    leadId: "",
    persona: "advisor",
    contactName: "",
    contactRole: "",
    scheduledAt: "",
    status: "scheduled",
    outcome: "scheduled",
    painThemeTags: "",
    notes: "",
  };
}

export function InterviewTracker({ leads, interviews, onCreate }: InterviewTrackerProps) {
  const [form, setForm] = useState<NewInterview>(emptyInterview());
  const [error, setError] = useState<string | null>(null);

  const leadNames = useMemo(() => new Map(leads.map((lead) => [lead.id, lead.institutionName])), [leads]);
  const toTimestamp = (value: string | null) => (+new Date(value || 0)) || 0;

  const submit = async () => {
    if (!form.leadId) {
      setError("Select a lead before saving.");
      return;
    }

    setError(null);
    await onCreate({
      ...form,
      painThemeTags: form.painThemeTags
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    });
    setForm(emptyInterview());
  };

  return (
    <Card className="border-white/15 bg-black/20">
      <CardHeader>
        <CardTitle>Interview Tracker</CardTitle>
        <CardDescription>
          Track outreach calls, note pain themes, and close the evidence loop for future learning.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3 rounded-md border border-white/10 p-3">
          <h3 className="text-sm font-medium">Add interview</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="interview-lead">Lead</Label>
              <select
                id="interview-lead"
                className="w-full rounded-md border border-white/10 bg-background px-2 py-2 text-sm"
                value={form.leadId}
                onChange={(event) => setForm((previous) => ({ ...previous, leadId: event.target.value }))}
              >
                <option value="">Select lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.institutionName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="interview-persona">Persona</Label>
              <select
                id="interview-persona"
                className="w-full rounded-md border border-white/10 bg-background px-2 py-2 text-sm"
                value={form.persona}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, persona: event.target.value as CcPersona }))
                }
              >
                {personaOptions.map((persona) => (
                  <option key={persona} value={persona}>
                    {persona}
                  </option>
                ))}
              </select>
            </div>
            <Input
              placeholder="Contact name"
              value={form.contactName}
              onChange={(event) => setForm((previous) => ({ ...previous, contactName: event.target.value }))}
            />
            <Input
              placeholder="Contact role"
              value={form.contactRole}
              onChange={(event) => setForm((previous) => ({ ...previous, contactRole: event.target.value }))}
            />
            <div>
              <Label htmlFor="interview-date">Scheduled at</Label>
              <Input
                id="interview-date"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) => setForm((previous) => ({ ...previous, scheduledAt: event.target.value }))}
              />
            </div>
            <select
              className="rounded-md border border-white/10 bg-background px-2 py-2 text-sm"
              value={form.status}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, status: event.target.value as NewInterview["status"] }))
              }
            >
              <option value="scheduled">scheduled</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
              <option value="no_show">no_show</option>
              <option value="reschedule">reschedule</option>
            </select>
            <select
              className="rounded-md border border-white/10 bg-background px-2 py-2 text-sm"
              value={form.outcome}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, outcome: event.target.value as NewInterview["outcome"] }))
              }
            >
              <option value="scheduled">scheduled</option>
              <option value="completed">completed</option>
              <option value="no_show">no_show</option>
              <option value="declined">declined</option>
              <option value="reschedule">reschedule</option>
            </select>
          </div>
          <Input
            placeholder="Pain themes (comma-separated)"
            value={form.painThemeTags}
            onChange={(event) => setForm((previous) => ({ ...previous, painThemeTags: event.target.value }))}
          />
          <Textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
          />
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <Button size="sm" onClick={() => void submit()}>
            Save interview
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Recent interviews</h3>
          {interviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interviews captured yet.</p>
          ) : (
            interviews
              .slice()
              .sort((a, b) => toTimestamp(b.scheduledAt) - toTimestamp(a.scheduledAt))
              .map((interview) => (
                <div key={interview.id} className="rounded-md border border-white/10 bg-white/5 p-3 text-sm">
                  <p className="font-medium">{leadNames.get(interview.leadId) || interview.leadId}</p>
                  <p className="text-xs text-muted-foreground">
                    {interview.persona} • {interview.contactName || "no contact"}
                    {interview.scheduledAt ? ` • ${new Date(interview.scheduledAt).toLocaleString()}` : ""}
                  </p>
                  <p className="mt-1">
                    Status: {interview.status} • Outcome: {interview.outcome}
                  </p>
                  {interview.painThemeTags.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Themes: {interview.painThemeTags.join(", ")}
                    </p>
                  ) : null}
                  {interview.notes ? (
                    <p className="mt-2 text-xs text-muted-foreground">Notes: {interview.notes}</p>
                  ) : null}
                </div>
              ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
