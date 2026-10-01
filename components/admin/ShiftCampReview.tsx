"use client";
import { ShiftCampImage } from "./ShiftCampImage";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShiftAction, ShiftSnapshot } from "@/lib/shift/camp-contract";
export type CampCommandProps = {
  busy: boolean;
  act: (
    action: ShiftAction,
    payload: Record<string, unknown>,
    cid?: string | null,
  ) => Promise<boolean>;
};
type CohortProps = CampCommandProps & { s: ShiftSnapshot };
const participantName = (s: ShiftSnapshot, id: string) =>
  s.participants.find((p) => p.id === id)?.name ?? "Staff";

export function MentorCheckpoints({ s, busy, act }: CohortProps) {
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const who = (id: string) => participantName(s, id);
  const currentDay =
    Math.floor(
      (Date.now() - Date.parse(`${s.cohort.starts_on}T00:00:00+07:00`)) /
        86400000,
    ) + 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mentor checkpoints</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!s.projects.length && (
          <p className="text-muted-foreground">
            Projects will appear when participants create them.
          </p>
        )}
        {s.projects.map((p) => (
          <div key={p.id} className="space-y-3 rounded-xl border p-4">
            <h3 className="text-lg font-semibold">{p.title}</h3>
            <p className="whitespace-pre-wrap">{p.scope || p.description}</p>
            <p className="text-sm text-muted-foreground">
              {p.members.map(who).join(", ")}
            </p>
            {[1, 4, 7].map((day) => {
              const key = `${p.id}:${day}`;
              const existing = s.checkpoints.find(
                (cp) => cp.project_id === p.id && cp.day === day,
              );
              return (
                <div key={day} className="space-y-2">
                  <p className="font-medium">
                    Day {day}:{" "}
                    {existing
                      ? "Reviewed"
                      : currentDay >= day
                        ? "Review due"
                        : "Upcoming"}
                  </p>
                  <Textarea
                    aria-label={`Day ${day} feedback for ${p.title}`}
                    placeholder="Guidance that leaves the decision with the participant"
                    value={feedback[key] ?? existing?.feedback ?? ""}
                    onChange={(e) =>
                      setFeedback({ ...feedback, [key]: e.target.value })
                    }
                  />
                  <Button
                    variant="outline"
                    disabled={
                      busy || !(feedback[key] ?? existing?.feedback)?.trim()
                    }
                    onClick={() =>
                      void act("checkpoint", {
                        project_id: p.id,
                        day,
                        feedback: feedback[key] ?? existing?.feedback,
                      })
                    }
                  >
                    Save feedback
                  </Button>
                </div>
              );
            })}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function PresentationModeration({ s, busy, act }: CohortProps) {
  const who = (id: string) => participantName(s, id);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Presentations and moderation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {s.updates
          .filter((u) => u.published_at)
          .map((u) => (
            <div key={u.id} className="space-y-2 rounded-xl border p-4">
              <p className="font-medium">
                {s.projects.find((p) => p.id === u.project_id)?.title} · Day{" "}
                {u.day} · {u.hidden ? "Hidden" : "Published"} ·{" "}
                {s.comments.filter((c) => c.post_id === u.post_id).length}{" "}
                responses
              </p>
              {Object.entries(u.body)
                .filter(([k, v]) => k !== "screenshots" && k !== "link" && !!v)
                .map(([k, v]) => (
                  <p key={k} className="whitespace-pre-wrap">
                    <strong>{k}:</strong> {String(v)}
                  </p>
                ))}
              <p className="text-sm text-muted-foreground">
                Contributors: {u.contributor_ids.map(who).join(", ")}
              </p>
              {u.body.screenshots?.map((path) => (
                <ShiftCampImage key={path} path={path} />
              ))}
              {u.body.link && /^https?:\/\//.test(u.body.link) && (
                <a
                  className="block text-primary underline"
                  href={u.body.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Try the project
                </a>
              )}
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void act("moderate", { id: u.id, hidden: !u.hidden })
                }
              >
                {u.hidden ? "Restore presentation" : "Hide presentation"}
              </Button>
              {s.comments
                .filter((c) => c.post_id === u.post_id)
                .map((c) => (
                  <div key={c.id} className="space-y-2 rounded-md border p-3">
                    <p className="text-sm">
                      {who(c.author_id)}: {c.body} {c.hidden ? "· Hidden" : ""}
                    </p>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void act("moderate_comment", {
                          id: c.id,
                          hidden: !c.hidden,
                        })
                      }
                    >
                      {c.hidden ? "Restore comment" : "Hide comment"}
                    </Button>
                  </div>
                ))}
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

export function GroupConversations({ s, busy, act }: CohortProps) {
  const [messages, setMessages] = useState<Record<string, string>>({});
  const who = (id: string) => participantName(s, id);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Group conversations and activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {s.groups.map((g) => {
          const projects = s.projects.filter((p) =>
            p.members.some((id) => g.members.includes(id)),
          );
          const latest = s.updates
            .filter(
              (u) =>
                u.published_at && projects.some((p) => p.id === u.project_id),
            )
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
          return (
            <div key={g.id} className="space-y-3 rounded-xl border p-4">
              <p className="font-semibold">
                {g.name} · {g.members.map(who).join(", ")}
              </p>
              <p className="text-sm text-muted-foreground">
                Last presentation:{" "}
                {latest
                  ? new Date(latest.updated_at).toLocaleString()
                  : "None yet"}
              </p>
              {s.messages
                .filter((m) => m.group_id === g.id)
                .map((m) => (
                  <div key={m.id} className="space-y-2">
                    <p>
                      {who(m.author_id)}: {m.body} {m.hidden ? "· Hidden" : ""}
                    </p>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void act("moderate_message", {
                          id: m.id,
                          hidden: !m.hidden,
                        })
                      }
                    >
                      {m.hidden ? "Restore message" : "Hide message"}
                    </Button>
                  </div>
                ))}
              <Textarea
                aria-label={`Message ${g.name}`}
                placeholder="Support the group"
                value={messages[g.id] ?? ""}
                onChange={(e) =>
                  setMessages({ ...messages, [g.id]: e.target.value })
                }
              />
              <Button
                disabled={busy || !messages[g.id]?.trim()}
                onClick={async () => {
                  if (
                    await act("message", {
                      group_id: g.id,
                      body: messages[g.id],
                    })
                  )
                    setMessages({ ...messages, [g.id]: "" });
                }}
              >
                Send to group
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function PrivateCheckins({ s }: { s: ShiftSnapshot }) {
  const who = (id: string) => participantName(s, id);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Private participant check-ins</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Self-reports for conversation and evaluation, not an SDT score.
        </p>
        {s.checkins.map((c) => (
          <p key={`${c.user_id}:${c.day}`}>
            {who(c.user_id)} · Day {c.day} · Choice {c.choice ?? "Skipped"} ·
            Capability {c.capability ?? "Skipped"} · Support{" "}
            {c.support ?? "Skipped"}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

export function PilotObservations({ s }: { s: ShiftSnapshot }) {
  const participants = s.participants.filter((p) => p.role === "participant");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pilot observations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p>
          {participants.length} participants · {s.projects.length} projects ·{" "}
          {s.updates.filter((u) => u.published_at).length} presentations ·{" "}
          {s.comments.length} feedback responses
        </p>
        <p>
          {participants.filter((p) => !p.group_id).length} unmatched
          participants ·{" "}
          {
            s.updates.filter(
              (u) =>
                u.published_at &&
                !s.comments.some((c) => c.post_id === u.post_id),
            ).length
          }{" "}
          unanswered presentations
        </p>
        <p className="text-sm text-muted-foreground">
          Review the distribution of contributions and feedback, mentor effort,
          external testing evidence, and participant interviews before
          expanding.
        </p>
      </CardContent>
    </Card>
  );
}
