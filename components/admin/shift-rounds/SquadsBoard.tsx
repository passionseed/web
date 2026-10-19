"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Sparkles, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";

import {
  assignSquadAction,
  deleteSquadAction,
  listEntriesAction,
  listRolesAction,
  upsertSquadAction,
} from "@/app/admin/shift/rounds/actions";
import { AdminEmptyState, AdminLoading } from "@/components/admin/shared/AdminStates";
import { useConfirm } from "@/components/admin/shared/useConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TRACK_LABEL, suggestSquads, type SquadSuggestion } from "@/lib/shift-round/admin/format";
import type { AdminEntry, AdminSquad, RoleGrant } from "@/lib/shift-round/admin/types";

import { ActionError, LoadError, NativeSelect, Pill, SearchBox, Section } from "./shared";
import { useAdminMutation, useAdminQuery } from "./useAdminData";
import { useRound } from "./useRound";

interface MentorOption {
  user_id: string;
  label: string;
}

function mentorOptions(roles: RoleGrant[]): MentorOption[] {
  const seen = new Map<string, MentorOption>();
  for (const r of roles) {
    if (seen.has(r.user_id)) continue;
    const who = r.display_name || r.email || r.user_id.slice(0, 8);
    const role = r.round_id ? r.role : "global staff";
    seen.set(r.user_id, { user_id: r.user_id, label: `${who} (${role})` });
  }
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function SquadEditor({
  squad,
  mentors,
  busy,
  onSave,
  onCancel,
  submitLabel,
}: {
  squad: Partial<AdminSquad>;
  mentors: MentorOption[];
  busy: boolean;
  onSave: (value: { name: string; mentor_user_id: string | null; discord_url: string | null }) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(squad.name ?? "");
  const [mentor, setMentor] = useState(squad.mentor_user_id ?? "");
  const [discord, setDiscord] = useState(squad.discord_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const prefix = squad.id ?? "new";

  return (
    <form
      className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || name.trim().length > 40) return setError("Name: 1-40 characters");
        if (discord && !/^https:\/\/(discord\.gg|discord\.com)\//.test(discord))
          return setError("Discord link must start with https://discord.gg/ or https://discord.com/");
        setError(null);
        onSave({ name: name.trim(), mentor_user_id: mentor || null, discord_url: discord.trim() || null });
      }}
    >
      <Input aria-label="Squad name" id={`${prefix}-name`} placeholder="Squad name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      <NativeSelect aria-label="Mentor" value={mentor} onChange={(e) => setMentor(e.target.value)}>
        <option value="">No mentor yet</option>
        {mentors.map((m) => (
          <option key={m.user_id} value={m.user_id}>
            {m.label}
          </option>
        ))}
      </NativeSelect>
      <Input aria-label="Squad Discord link" placeholder="Discord link (optional)" type="url" value={discord} onChange={(e) => setDiscord(e.target.value)} />
      <div className="flex gap-1">
        <Button type="submit" size="sm" disabled={busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-300 sm:col-span-4">
          {error}
        </p>
      )}
    </form>
  );
}

export function SquadsBoard({ roundId }: { roundId: string }) {
  const round = useRound(roundId);
  const { data, error, loading, reload } = useAdminQuery(() => listEntriesAction(roundId), [roundId]);
  // Global staff plus this round's staff and mentors.
  const roles = useAdminQuery(() => listRolesAction(roundId), [roundId]);
  const { run, busy, message } = useAdminMutation();
  const { confirm, confirmDialog } = useConfirm();

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<Record<string, string>>({});
  const [suggestion, setSuggestion] = useState<{ squads: SquadSuggestion[]; leftover: string[] } | null>(null);

  const size = data?.squad_size ?? round.data?.squad_size ?? 3;
  const entries = useMemo(() => data?.entries ?? [], [data]);
  const squads = useMemo(() => data?.squads ?? [], [data]);
  const mentors = useMemo(() => {
    const options = mentorOptions(roles.data ?? []);
    // Keep current mentors selectable even if the role list could not load, so saving preserves them.
    for (const s of squads) {
      if (s.mentor_user_id && !options.some((o) => o.user_id === s.mentor_user_id)) {
        options.push({ user_id: s.mentor_user_id, label: s.mentor_display_name ?? s.mentor_user_id.slice(0, 8) });
      }
    }
    return options;
  }, [roles.data, squads]);
  const mentorName = (id: string | null) =>
    id ? mentors.find((m) => m.user_id === id)?.label ?? squads.find((s) => s.mentor_user_id === id)?.mentor_display_name ?? id.slice(0, 8) : null;

  const members = useMemo(() => {
    const map = new Map<string, AdminEntry[]>();
    for (const e of entries) if (e.squad_id) map.set(e.squad_id, [...(map.get(e.squad_id) ?? []), e]);
    return map;
  }, [entries]);
  const unassigned = entries.filter((e) => !e.squad_id);
  const needle = search.trim().toLowerCase();
  const matches = (e: AdminEntry) => !needle || [e.handle, e.email ?? ""].some((v) => v.toLowerCase().includes(needle));
  const visibleUnassigned = unassigned.filter(matches).sort((a, b) => a.joined_at.localeCompare(b.joined_at));
  const visibleSquads = squads
    .filter((s) => !needle || s.name.toLowerCase().includes(needle) || (members.get(s.id) ?? []).some(matches))
    .sort((a, b) => a.name.localeCompare(b.name, "th", { numeric: true }));
  const isFull = (squadId: string) => (members.get(squadId)?.length ?? 0) >= size;
  const byId = new Map(entries.map((e) => [e.id, e]));

  const assign = async (entry: AdminEntry, squadId: string | null) => {
    if (squadId && isFull(squadId)) return;
    const result = await run(() => assignSquadAction(entry.id, squadId));
    if (result?.ok) {
      toast.success(squadId ? `${entry.handle} added` : `${entry.handle} removed from squad`);
      await reload();
    }
  };

  const removeMember = async (entry: AdminEntry) => {
    const ok = await confirm({
      title: `Remove ${entry.handle} from the squad?`,
      description: "Their icebreaker answer for this squad is lost. Adding them to a squad again gives a new question.",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (ok) await assign(entry, null);
  };

  const removeSquad = async (squad: AdminSquad) => {
    const count = members.get(squad.id)?.length ?? 0;
    const ok = await confirm({
      title: `Delete ${squad.name}?`,
      description: count
        ? `${count} member(s) go back to Unassigned and lose their icebreaker answers and cheers.`
        : "This squad has no members.",
      confirmLabel: "Delete squad",
      destructive: true,
    });
    if (!ok) return;
    const result = await run(() => deleteSquadAction(squad.id));
    if (result?.ok) {
      toast.success(`${squad.name} deleted`);
      await reload();
    }
  };

  const save = async (id: string | null, value: { name: string; mentor_user_id: string | null; discord_url: string | null }) => {
    const result = await run(() => upsertSquadAction(roundId, { id, ...value }));
    if (result?.ok) {
      toast.success(id ? "Squad saved" : `${value.name} created`);
      setCreating(false);
      setEditing(null);
      await reload();
    }
  };

  const applySuggestion = async () => {
    if (!suggestion) return;
    const people = suggestion.squads.reduce((n, s) => n + s.entryIds.length, 0);
    const ok = await confirm({
      title: `Create ${suggestion.squads.length} squads for ${people} students?`,
      description: "Each student gets a push that their squad is ready. Set mentors afterwards.",
      confirmLabel: "Create squads",
    });
    if (!ok) return;
    let failed = 0;
    for (const s of suggestion.squads) {
      const created = await run(() => upsertSquadAction(roundId, { id: null, name: s.name, mentor_user_id: null, discord_url: null }));
      if (!created?.ok) {
        failed++;
        break;
      }
      for (const entryId of s.entryIds) {
        const assigned = await run(() => assignSquadAction(entryId, created.data.squad_id));
        if (!assigned?.ok) failed++;
      }
    }
    setSuggestion(null);
    if (failed) toast.error("Some squads could not be created. See the error above and check the board.");
    else toast.success("Squads created");
    await reload();
  };

  const loadError = error ?? round.error;
  if (loadError) return <LoadError error={loadError} onRetry={() => { void reload(); void round.reload(); }} retrying={loading} title="Could not load squads" />;
  if ((loading && !data) || (round.loading && !round.data)) return <AdminLoading rows={4} rowClassName="h-20" label="Loading squads" />;

  return (
    <div className="space-y-4">
      {confirmDialog}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchBox value={search} onChange={setSearch} label="Search squads and students" placeholder="Search squad or handle" />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy || unassigned.length < 2}
            onClick={() => setSuggestion(suggestSquads(entries, size, squads.map((s) => s.name)))}
          >
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" /> Suggest squads
          </Button>
          <Button onClick={() => setCreating(true)} disabled={creating}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New squad
          </Button>
        </div>
      </div>
      {roles.error && (
        <p className="text-sm text-muted-foreground" role="status">
          Mentor list unavailable ({roles.error.code}). Add mentors in Settings.
        </p>
      )}
      <ActionError message={message} />

      {creating && (
        <Section title="New squad">
          <SquadEditor squad={{}} mentors={mentors} busy={busy} submitLabel="Create" onSave={(v) => save(null, v)} onCancel={() => setCreating(false)} />
        </Section>
      )}

      {suggestion && (
        <Section
          title="Suggested squads"
          aside={
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSuggestion(null)}>
                Discard
              </Button>
              <Button size="sm" onClick={applySuggestion} disabled={busy || suggestion.squads.length === 0}>
                Create these squads
              </Button>
            </div>
          }
        >
          {suggestion.squads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough unassigned students on one track to form a squad.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {suggestion.squads.map((s) => (
                <li key={s.name} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">
                    {s.name} <span className="text-xs text-muted-foreground">· {TRACK_LABEL[s.track]}</span>
                  </p>
                  <p className="text-muted-foreground">{s.entryIds.map((id) => byId.get(id)?.handle ?? id).join(", ")}</p>
                </li>
              ))}
            </ul>
          )}
          {suggestion.leftover.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Left over (add by hand): {suggestion.leftover.map((id) => byId.get(id)?.handle ?? id).join(", ")}
            </p>
          )}
        </Section>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
        <Section title={`Unassigned (${unassigned.length})`}>
          {unassigned.length === 0 ? (
            <AdminEmptyState title="Everyone has a squad" className="py-6" />
          ) : visibleUnassigned.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unassigned students match.</p>
          ) : (
            <ul className="space-y-2">
              {visibleUnassigned.map((e) => {
                const target = assignTarget[e.id] ?? "";
                return (
                  <li key={e.id} className="rounded-md border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{e.handle}</span>
                      <span className="text-xs text-muted-foreground">{TRACK_LABEL[e.track]}</span>
                    </div>
                    <div className="mt-2 flex gap-1">
                      <NativeSelect
                        aria-label={`Squad for ${e.handle}`}
                        className="min-w-0 flex-1"
                        value={target}
                        onChange={(ev) => setAssignTarget((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                      >
                        <option value="">Choose a squad…</option>
                        {squads.map((s) => (
                          <option key={s.id} value={s.id} disabled={isFull(s.id)}>
                            {s.name} ({members.get(s.id)?.length ?? 0}/{size}){isFull(s.id) ? " full" : ""}
                          </option>
                        ))}
                      </NativeSelect>
                      <Button size="sm" disabled={busy || !target || isFull(target)} onClick={() => assign(e, target)}>
                        Add
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <div className="space-y-3">
          {squads.length === 0 ? (
            <AdminEmptyState
              title="No squads yet"
              description={`Squads are ${size} students and one mentor. Use Suggest squads to group unassigned students by track.`}
            />
          ) : visibleSquads.length === 0 ? (
            <AdminEmptyState title="No squads match your search" />
          ) : (
            visibleSquads.map((s) => {
              const list = members.get(s.id) ?? [];
              return (
                <Section
                  key={s.id}
                  title={s.name}
                  aside={
                    <div className="flex items-center gap-2">
                      <Pill tone={list.length >= size ? "good" : "warn"}>
                        {list.length}/{size}
                        {list.length >= size ? " full" : ""}
                      </Pill>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(editing === s.id ? null : s.id)} aria-label={`Edit ${s.name}`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeSquad(s)} disabled={busy} aria-label={`Delete ${s.name}`}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  }
                >
                  {editing === s.id ? (
                    <SquadEditor squad={s} mentors={mentors} busy={busy} submitLabel="Save" onSave={(v) => save(s.id, v)} onCancel={() => setEditing(null)} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Mentor:{" "}
                      {mentorName(s.mentor_user_id) ?? <span className="text-amber-300">not set</span>}
                      {s.discord_url ? " · own Discord link" : " · uses round Discord"}
                    </p>
                  )}
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members yet.</p>
                  ) : (
                    <ul className="divide-y rounded-md border">
                      {list.map((m) => (
                        <li key={m.id} className="flex items-start justify-between gap-2 p-2 text-sm">
                          <div>
                            <p className="font-medium">
                              {m.handle} <span className="text-xs text-muted-foreground">· {TRACK_LABEL[m.track]}</span>
                            </p>
                            <p className="text-xs text-muted-foreground" lang="th">
                              Q{m.icebreaker_question ?? "?"}
                              {m.icebreaker_text ? `: ${m.icebreaker_text}` : ""}
                            </p>
                            <p className="text-xs" lang="th">
                              {m.icebreaker_answer ? `“${m.icebreaker_answer}”` : <span className="text-muted-foreground">No answer yet</span>}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => removeMember(m)} disabled={busy} aria-label={`Remove ${m.handle}`}>
                            <UserMinus className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
