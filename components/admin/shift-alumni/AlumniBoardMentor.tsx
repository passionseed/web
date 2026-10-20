"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createTeamAction,
  setMemberTeamAction,
  startRoundAction,
  type MentorActionResult,
} from "@/app/admin/shift/alumni/board/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BOARD_PATH, QUIET_DAYS, statusLabel } from "@/lib/shift/alumniBoard";
import type { MentorRow } from "@/lib/supabase/shift-alumni-board/mentor";
import type { Team } from "@/lib/supabase/shift-alumni-board/team";

/**
 * Mentor tools on /admin/shift/alumni/board: everyone at a glance, teams,
 * and the button that starts a new round at each alumni session.
 */

const NO_TEAM = "none";

/** Runs a mentor action, toasts the outcome and refreshes the page. */
function useMentorAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function run(action: () => Promise<MentorActionResult>, success: string): Promise<boolean> {
    setBusy(true);
    try {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      toast.success(success);
      startTransition(() => router.refresh());
      return true;
    } catch {
      toast.error("Failed to save. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, run };
}

function TeamSelect({ row, teams }: { row: MentorRow; teams: Team[] }) {
  const { busy, run } = useMentorAction();
  return (
    <Select
      value={row.team_id ?? NO_TEAM}
      disabled={busy}
      onValueChange={(value) => {
        const teamId = value === NO_TEAM ? null : value;
        const label = teams.find((t) => t.id === teamId)?.name ?? "no team";
        void run(() => setMemberTeamAction(row.user_id, teamId), `${row.nickname}: ${label}`);
      }}
    >
      <SelectTrigger className="h-8 w-40" aria-label={`Team for ${row.nickname}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_TEAM}>No team</SelectItem>
        {teams.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** 🔴 stuck, ⚪ quiet, ⏱️ starts, 🧪 tests and 🔥 streak in one cell. */
function Signals({ row }: { row: MentorRow }) {
  return (
    <div className="space-y-1 text-sm">
      {row.stuck && (
        <div>
          🔴 {row.stuck}
          {row.replies > 0 && <span className="text-muted-foreground"> 💬{row.replies}</span>}
        </div>
      )}
      <div className="flex flex-wrap gap-2 text-muted-foreground">
        {row.quiet && <span title={`Quiet ${QUIET_DAYS}+ days`}>⚪ quiet</span>}
        {row.starts > 0 && <span title="Timers started this round">⏱️{row.starts}</span>}
        <span title="Real-user tests, all time">🧪{row.tests}</span>
        {row.streak > 0 && <span title="Rounds in a row with the week goal done">🔥{row.streak}</span>}
      </div>
    </div>
  );
}

export function MentorMembersTable({ rows, teams }: { rows: MentorRow[]; teams: Team[] }) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-lg font-semibold">Members</h3>
      <p className="text-sm text-muted-foreground">
        Confirmed alumni accounts. Confirm new accounts on the Alumni tab first, then put them in a team.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No confirmed alumni yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nickname</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>This week</TableHead>
              <TableHead>Signals</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.user_id}>
                <TableCell>
                  <div className="font-medium">{row.nickname}</div>
                  <div className="text-xs text-muted-foreground">{row.cohort}</div>
                </TableCell>
                <TableCell>
                  <TeamSelect row={row} teams={teams} />
                </TableCell>
                <TableCell className="max-w-xs text-sm">
                  <div>{row.weekGoal || <span className="text-muted-foreground">No goal yet</span>}</div>
                  <Badge variant="secondary" className="mt-1">
                    {statusLabel(row.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Signals row={row} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

function AddTeamForm() {
  const { busy, run } = useMentorAction();
  const [name, setName] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (await run(() => createTeamAction(trimmed), `Team added: ${trimmed}`)) setName("");
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-wrap gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        placeholder="Team name"
        aria-label="New team name"
        className="max-w-xs"
        required
      />
      <Button type="submit" disabled={busy || !name.trim()}>
        Add team
      </Button>
    </form>
  );
}

export function MentorTeams({ teams }: { teams: Team[] }) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-lg font-semibold">Teams</h3>
      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">No teams yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {teams.map((t) => (
            <li key={t.id}>
              <Link
                href={`${BOARD_PATH}/team?id=${t.id}`}
                className="inline-block rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <AddTeamForm />
    </section>
  );
}

export function StartRoundButton() {
  const { busy, run } = useMentorAction();
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={() => {
        if (!window.confirm("Start a new round? Do this at each alumni session.")) return;
        void run(() => startRoundAction(), "New round started");
      }}
    >
      Start new round
    </Button>
  );
}
