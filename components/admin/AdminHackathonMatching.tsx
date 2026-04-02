"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EventResponse = {
  event: {
    id: string;
    name: string;
    status: string;
    min_team_size: number;
    max_team_size: number;
    ranking_deadline: string | null;
    matched_at: string | null;
  } | null;
  summary: {
    unteamedCount: number;
    metSubmissionCount: number;
    rankingSubmissionCount: number;
  };
};

export function AdminHackathonMatching() {
  const [data, setData] = useState<EventResponse | null>(null);
  const [name, setName] = useState("Hackathon Team Matching");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/admin/hackathon/matching/event");
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error || "Failed to load matching event");
      return;
    }

    setData(payload);
    if (payload.event?.name) {
      setName(payload.event.name);
    }
  };

  useEffect(() => {
    load().catch(() => {
      setLoading(false);
      setError("Failed to load matching event");
    });
  }, []);

  const createEvent = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/admin/hackathon/matching/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const payload = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(payload.error || "Failed to create matching event");
      return;
    }

    setData(payload);
    setMessage("Matching event is live.");
  };

  const runMatching = async () => {
    if (!data?.event) return;

    setRunning(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/admin/hackathon/matching/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: data.event.id }),
    });
    const payload = await response.json();
    setRunning(false);

    if (!response.ok) {
      setError(payload.error || "Failed to run matching event");
      return;
    }

    setMessage(
      `Created ${payload.result.teamCount} teams for ${payload.result.assignedParticipantCount} participants.`
    );
    await load();
  };

  if (loading) {
    return <div className="py-8 text-sm text-slate-400">Loading matching event…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-sm text-slate-400">Unteamed participants</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {data?.summary.unteamedCount ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-sm text-slate-400">Met list submissions</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {data?.summary.metSubmissionCount ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-sm text-slate-400">Ranking submissions</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {data?.summary.rankingSubmissionCount ?? 0}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Matching event</h3>
          <p className="text-sm text-slate-400 mt-1">
            Open one live event, let participants add people they met and rank them, then run the auto matcher.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Event name"
            className="max-w-md"
          />
          <Button onClick={createEvent} disabled={saving}>
            {saving ? "Creating…" : data?.event ? "Reuse live event" : "Create live event"}
          </Button>
          <Button
            variant="secondary"
            onClick={runMatching}
            disabled={!data?.event || running}
          >
            {running ? "Running…" : "Run auto-match"}
          </Button>
        </div>

        {data?.event && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
            <p>
              <span className="text-slate-500">Name:</span> {data.event.name}
            </p>
            <p className="mt-1">
              <span className="text-slate-500">Status:</span> {data.event.status}
            </p>
            <p className="mt-1">
              <span className="text-slate-500">Team size:</span> {data.event.min_team_size} - {data.event.max_team_size}
            </p>
            {data.event.matched_at && (
              <p className="mt-1">
                <span className="text-slate-500">Matched at:</span>{" "}
                {new Date(data.event.matched_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {(message || error) && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              error
                ? "border-red-500/30 bg-red-950/20 text-red-200"
                : "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
            }`}
          >
            {error || message}
          </div>
        )}
      </div>
    </div>
  );
}
