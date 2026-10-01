"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function CohortSetup({ busy, act }: CampCommandProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [map, setMap] = useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a scheduled cohort</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          aria-label="Cohort name"
          placeholder="Cohort name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
        />
        <Input
          aria-label="Start date (Bangkok)"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Input
          aria-label="Existing curriculum map ID (optional)"
          placeholder="Existing curriculum map UUID, or leave blank to create the SHIFT map"
          value={map}
          onChange={(e) => setMap(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Creates a private cohort, classroom, and canonical seven-node
          curriculum. An existing map is reused without changing its content.
        </p>
        <Button
          disabled={busy || !name.trim() || !date}
          onClick={() =>
            void act(
              "create_cohort",
              { name, starts_on: date, map_id: map },
              null,
            )
          }
        >
          Create cohort
        </Button>
      </CardContent>
    </Card>
  );
}

export function Enrollment({ busy, act }: CampCommandProps) {
  const [account, setAccount] = useState("");
  const [role, setRole] = useState("participant");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Enroll authenticated accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Use the account UUID from user management. Applications and tracker
          records are not matched by name.
        </p>
        <Input
          aria-label="Account UUID"
          placeholder="Account UUID"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />
        <select
          aria-label="Enrollment role"
          className="rounded-md border p-2"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="participant">Participant</option>
          <option value="mentor">Assigned mentor</option>
        </select>
        <Button
          disabled={busy || !account}
          onClick={async () => {
            if (await act("enroll", { user_id: account, role })) setAccount("");
          }}
        >
          Enroll
        </Button>
      </CardContent>
    </Card>
  );
}

export function PeerPlacement({ s, busy, act }: CohortProps) {
  const [groupName, setGroupName] = useState("");
  const [groupUser, setGroupUser] = useState("");
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const participants = s.participants.filter((p) => p.role === "participant");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Peer groups and placement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            aria-label="New group name"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <select
            aria-label="First group member"
            className="rounded-md border p-2"
            value={groupUser}
            onChange={(e) => setGroupUser(e.target.value)}
          >
            <option value="">Choose unmatched participant</option>
            {participants
              .filter((p) => !p.group_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <Button
            disabled={busy || !groupName || !groupUser}
            onClick={() =>
              void act("create_group", {
                name: groupName,
                user_id: groupUser,
              })
            }
          >
            Create group
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Target three peers. A group of two may run if the cohort remainder
          requires it. Placement never changes project ownership.
        </p>
        {participants.map((p) => (
          <div key={p.id} className="space-y-2 rounded-xl border p-4">
            <div className="font-medium">
              {p.name} {p.group_id ? "" : "· Unmatched"}
            </div>
            <p className="text-sm text-muted-foreground">
              Availability: {p.introduction?.availability || "Not supplied"} ·
              Interests: {p.introduction?.interests || "Not supplied"}
            </p>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label={`Group for ${p.name}`}
                className="rounded-md border p-2"
                value={assignments[p.id] ?? p.group_id ?? ""}
                onChange={(e) =>
                  setAssignments({
                    ...assignments,
                    [p.id]: e.target.value,
                  })
                }
              >
                <option value="">Choose group</option>
                {s.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.members.length}/3)
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                disabled={busy || !(assignments[p.id] ?? p.group_id)}
                onClick={() =>
                  void act("assign_group", {
                    user_id: p.id,
                    group_id: assignments[p.id] ?? p.group_id,
                  })
                }
              >
                Place / reassign
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SupportQueue({ s, busy, act }: CohortProps) {
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const who = (id: string) => participantName(s, id);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Support queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!s.requests.some((r) => !r.resolved_at) && (
          <p className="text-muted-foreground">No unresolved requests.</p>
        )}
        {s.requests
          .filter((r) => !r.resolved_at)
          .map((r) => (
            <div key={r.id} className="space-y-3 rounded-xl border p-4">
              <p className="font-medium">
                {r.kind === "report" ? "Report" : "Help"} · {who(r.user_id)}
              </p>
              <p className="whitespace-pre-wrap">{r.body}</p>
              <Textarea
                aria-label="Resolution"
                placeholder="How was this resolved?"
                value={resolutions[r.id] ?? ""}
                onChange={(e) =>
                  setResolutions({
                    ...resolutions,
                    [r.id]: e.target.value,
                  })
                }
              />
              <Button
                disabled={busy || !resolutions[r.id]?.trim()}
                onClick={() =>
                  void act("resolve_request", {
                    id: r.id,
                    resolution: resolutions[r.id],
                  })
                }
              >
                Resolve
              </Button>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
