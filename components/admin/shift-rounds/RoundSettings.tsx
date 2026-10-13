"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, CalendarPlus, Send, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import {
  extendRoundAction,
  importAllowlistAction,
  listRolesAction,
  setRoleAction,
  updateAllowlistAction,
  updateRoundAction,
} from "@/app/admin/shift/rounds/actions";
import { AdminEmptyState, AdminLoading } from "@/components/admin/shared/AdminStates";
import { useConfirm } from "@/components/admin/shared/useConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SHIFT_COHORTS } from "@/lib/content/shift-cohort";
import {
  formatClose,
  formatIct,
  isPolicyLocked,
  parseEmails,
  validatePolicy,
} from "@/lib/shift-round/admin/format";
import type { AdminRoundListItem, RoleGrant, RoundPolicy, RoundRole } from "@/lib/shift-round/admin/types";

import { PolicyFields, draftToPolicy, policyPatch, policyToDraft, type PolicyDraft } from "./PolicyFields";
import { ActionError, Field, LoadError, NativeSelect, Pill, SearchBox, Section, statusTone } from "./shared";
import { useAdminMutation, useAdminQuery } from "./useAdminData";
import { useRound } from "./useRound";

function PolicySection({
  round,
  now,
  onSaved,
}: {
  round: AdminRoundListItem;
  now: Date;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<PolicyDraft>(() => policyToDraft(round));
  const [errors, setErrors] = useState<Partial<Record<keyof RoundPolicy | "starts_on", string>>>({});
  const { run, busy, message } = useAdminMutation();
  useEffect(() => setDraft(policyToDraft(round)), [round]);

  const locked = (field: keyof RoundPolicy) => isPolicyLocked(field, round, now);
  const patch = useMemo(() => {
    try {
      return policyPatch(round, draftToPolicy(draft));
    } catch {
      return {};
    }
  }, [round, draft]);
  const changed = Object.keys(patch) as (keyof RoundPolicy)[];

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = validatePolicy(patch);
    for (const key of changed) if (locked(key)) nextErrors[key] = "Locked after the round started";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || changed.length === 0) return;
    const result = await run(() => updateRoundAction(round.id, patch));
    if (result?.ok) {
      toast.success("Round saved");
      onSaved();
    } else if (result && !result.ok && result.error.field) {
      setErrors({ [result.error.field]: "Rejected by the server" });
    }
  };

  return (
    <Section
      title="Policy"
      aside={
        now >= new Date(round.starts_at) ? (
          <span className="text-xs text-muted-foreground">Round has started: only titles, briefs, Discord and the cutoff (until it passes) can change.</span>
        ) : undefined
      }
    >
      <form onSubmit={save} className="space-y-4" noValidate>
        <PolicyFields idPrefix="settings" value={draft} onChange={setDraft} errors={errors} isLocked={locked} />
        <ActionError message={message} />
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={busy || changed.length === 0}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
          {changed.length > 0 && (
            <Button type="button" variant="ghost" onClick={() => setDraft(policyToDraft(round))}>
              Discard
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{changed.length ? `${changed.length} changed` : "No changes"}</span>
        </div>
      </form>
    </Section>
  );
}

function StatusSection({ round, onSaved }: { round: AdminRoundListItem; onSaved: () => void }) {
  const { run, busy, message } = useAdminMutation();
  const { confirm, confirmDialog } = useConfirm();
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  const setStatus = async (status: "published" | "archived") => {
    const ok = await confirm(
      status === "published"
        ? {
            title: `Publish round ${round.number}?`,
            description: "Students on the allowlist can see and join it in the app. Waitlisted users get a push.",
            confirmLabel: "Publish",
          }
        : {
            title: `Archive round ${round.number}?`,
            description: "It stops showing as joinable. Certificates and logs stay.",
            confirmLabel: "Archive",
            destructive: true,
          },
    );
    if (!ok) return;
    const result = await run(() => updateRoundAction(round.id, { status }));
    if (result?.ok) {
      toast.success(status === "published" ? "Round published" : "Round archived");
      onSaved();
    }
  };

  const extend = async () => {
    if (!reason.trim()) return setReasonError("Add a reason (kept in the event log).");
    setReasonError(null);
    const ok = await confirm({
      title: `Extend round ${round.number} by ${days} day${days > 1 ? "s" : ""}?`,
      description: "Close and review end move later. Students marked not eligible go back to in progress. Not allowed once any certificate has issued.",
      confirmLabel: "Extend",
      destructive: true,
    });
    if (!ok) return;
    const result = await run(() => extendRoundAction(round.id, days, reason.trim()));
    if (result?.ok) {
      toast.success(`New close: ${formatClose(result.data.closes_at)}`);
      setReason("");
      onSaved();
    }
  };

  return (
    <Section title="Status and dates">
      {confirmDialog}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Pill tone={statusTone(round.status)}>{round.status}</Pill>
        <span>Day 1 {formatIct(round.starts_at, false)}</span>
        <span>· Closes {formatClose(round.closes_at)}</span>
        <span>· Review ends {formatIct(round.review_ends_at)}</span>
        {round.extended_days > 0 && <span>· extended {round.extended_days} day(s)</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {round.status !== "published" && (
          <Button onClick={() => setStatus("published")} disabled={busy}>
            <Send className="mr-2 h-4 w-4" aria-hidden="true" /> {round.status === "archived" ? "Republish" : "Publish"}
          </Button>
        )}
        {round.status !== "archived" && (
          <Button variant="outline" onClick={() => setStatus("archived")} disabled={busy}>
            <Archive className="mr-2 h-4 w-4" aria-hidden="true" /> Archive
          </Button>
        )}
      </div>
      <div className="grid gap-2 border-t pt-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
        <Field label="Extend by" htmlFor="extend-days">
          <NativeSelect id="extend-days" className="w-full" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>
                {d} day{d > 1 ? "s" : ""}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Reason" htmlFor="extend-reason" error={reasonError ?? undefined}>
          <Input id="extend-reason" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button variant="outline" onClick={extend} disabled={busy}>
          <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" /> Extend
        </Button>
      </div>
      <ActionError message={message} />
    </Section>
  );
}

function AllowlistSection({ round }: { round: AdminRoundListItem }) {
  const { run, busy, message } = useAdminMutation();
  const { confirm, confirmDialog } = useConfirm();
  const [addText, setAddText] = useState("");
  const [removeText, setRemoveText] = useState("");
  const [cohort, setCohort] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [emails, setEmails] = useState<string[] | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Calling with empty lists reads the current count (and emails, if the RPC returns them).
  useEffect(() => {
    let cancelled = false;
    updateAllowlistAction(round.id, [], []).then((r) => {
      if (cancelled || !r.ok) return;
      setCount(r.data.count);
      setEmails(r.data.emails ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [round.id]);

  const apply = async (mode: "add" | "remove") => {
    const { valid, invalid } = parseEmails(mode === "add" ? addText : removeText);
    if (invalid.length) return setInputError(`Not emails: ${invalid.slice(0, 5).join(", ")}`);
    if (!valid.length) return setInputError("Paste at least one email.");
    setInputError(null);
    const ok = await confirm({
      title: `${mode === "add" ? "Add" : "Remove"} ${valid.length} email${valid.length > 1 ? "s" : ""}?`,
      description:
        mode === "add"
          ? "They can join this invite-only round with an account using that email."
          : "They can no longer join. Students who already joined keep their entry.",
      confirmLabel: mode === "add" ? "Add" : "Remove",
      destructive: mode === "remove",
    });
    if (!ok) return;
    const result = await run(() =>
      updateAllowlistAction(round.id, mode === "add" ? valid : [], mode === "remove" ? valid : []),
    );
    if (result?.ok) {
      setCount(result.data.count);
      setEmails(result.data.emails ?? null);
      if (mode === "add") setAddText("");
      else setRemoveText("");
      toast.success(`Allowlist now has ${result.data.count}`);
    }
  };

  const importCohort = async () => {
    if (!cohort.trim()) return setInputError("Pick a cohort to import.");
    setInputError(null);
    const ok = await confirm({
      title: `Import accepted applicants from “${cohort}”?`,
      description: "Adds every accepted application in that cohort that has a Passion Seed account.",
      confirmLabel: "Import",
    });
    if (!ok) return;
    const result = await run(() => importAllowlistAction(round.id, cohort));
    if (result?.ok) {
      toast.success(`Imported ${result.data.added}`);
      const refreshed = await updateAllowlistAction(round.id, [], []);
      if (refreshed.ok) {
        setCount(refreshed.data.count);
        setEmails(refreshed.data.emails ?? null);
      }
    }
  };

  const visible = (emails ?? []).filter((e) => !search || e.includes(search.trim().toLowerCase()));

  return (
    <Section title={`Allowlist${count === null ? "" : ` (${count})`}`} aside={round.join_mode === "open" ? <Pill tone="info">Round is open: allowlist not required</Pill> : undefined}>
      {confirmDialog}
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Add emails" htmlFor="allow-add" hint="Paste emails separated by spaces, commas or new lines.">
          <Textarea id="allow-add" rows={4} value={addText} onChange={(e) => setAddText(e.target.value)} />
          <Button size="sm" className="mt-2" onClick={() => apply("add")} disabled={busy}>
            Add to allowlist
          </Button>
        </Field>
        <Field label="Remove emails" htmlFor="allow-remove">
          <Textarea id="allow-remove" rows={4} value={removeText} onChange={(e) => setRemoveText(e.target.value)} />
          <Button size="sm" variant="outline" className="mt-2" onClick={() => apply("remove")} disabled={busy}>
            Remove from allowlist
          </Button>
        </Field>
        <Field label="Import from applications" htmlFor="allow-cohort" hint="Accepted applications with an account, by cohort name.">
          <Input id="allow-cohort" list="allow-cohorts" value={cohort} onChange={(e) => setCohort(e.target.value)} />
          <datalist id="allow-cohorts">
            {SHIFT_COHORTS.map((c) => (
              <option key={c.name} value={c.name} />
            ))}
          </datalist>
          <Button size="sm" variant="outline" className="mt-2" onClick={importCohort} disabled={busy}>
            Import cohort
          </Button>
        </Field>
      </div>
      <ActionError message={message ?? inputError} />
      {emails && (
        <div className="space-y-2 border-t pt-3">
          <SearchBox value={search} onChange={setSearch} label="Search allowlist" />
          {emails.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one on the allowlist yet.</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">No emails match.</p>
          ) : (
            <ul className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((e) => (
                <li key={e} className="truncate rounded border px-2 py-1">
                  {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Section>
  );
}

/** Grants and lists role rows. `roundId` null = global staff (used on the ops page). */
export function RolesSection({ roundId, title }: { roundId: string | null; title: string }) {
  const { data, error, loading, reload } = useAdminQuery(() => listRolesAction(roundId), [roundId]);
  const { run, busy, message } = useAdminMutation();
  const { confirm, confirmDialog } = useConfirm();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoundRole>(roundId ? "mentor" : "staff");
  const [search, setSearch] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  // The round listing also returns global staff; they are managed on the ops page.
  const own = (data ?? []).filter((r) => r.round_id === roundId);
  const globalCount = roundId ? (data ?? []).filter((r) => r.round_id === null).length : 0;
  const rows = own.filter((r) => {
    const needle = search.trim().toLowerCase();
    return !needle || [r.email ?? "", r.display_name ?? "", r.role].some((v) => v.toLowerCase().includes(needle));
  });

  const grant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!parseEmails(email).valid.length) return setInputError("Enter one email.");
    setInputError(null);
    const result = await run(() => setRoleAction(email, role, roundId, true));
    if (result?.ok) {
      toast.success(`${email} is now ${role}`);
      setEmail("");
      await reload();
    }
  };

  const revoke = async (r: RoleGrant) => {
    if (r.source === "web_admin") return;
    const who = r.email ?? r.display_name ?? r.user_id;
    if (!r.email) return setInputError("This grant has no email on file; revoke it from the database runbook.");
    const ok = await confirm({
      title: `Remove ${r.role} role from ${who}?`,
      description: r.role === "mentor" ? "Their squads keep them as mentor until you change it on the Squads page." : "They lose staff access to SHIFT rounds.",
      confirmLabel: "Remove role",
      destructive: true,
    });
    if (!ok) return;
    const result = await run(() => setRoleAction(r.email!, r.role, roundId, false));
    if (result?.ok) {
      toast.success("Role removed");
      await reload();
    }
  };

  return (
    <Section title={title}>
      {confirmDialog}
      <p className="text-xs text-muted-foreground">
        Mentors and staff also need the web admin role (Users page) to open these tools.
        {roundId === null &&
          " Every web admin is global SHIFT staff automatically; those entries can only be removed on the Users page."}
      </p>
      <form onSubmit={grant} className="flex flex-wrap items-end gap-2">
        <Field label="Email" htmlFor={`role-email-${roundId ?? "global"}`} className="min-w-64 flex-1">
          <Input id={`role-email-${roundId ?? "global"}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {roundId && (
          <Field label="Role" htmlFor="role-kind">
            <NativeSelect id="role-kind" value={role} onChange={(e) => setRole(e.target.value as RoundRole)}>
              <option value="mentor">Mentor</option>
              <option value="staff">Round staff</option>
            </NativeSelect>
          </Field>
        )}
        <Button type="submit" disabled={busy}>
          <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" /> Grant
        </Button>
      </form>
      <ActionError message={message ?? inputError} />
      {globalCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {globalCount} global staff also have access to every round (managed under Flags and jobs).
        </p>
      )}
      {error ? (
        <LoadError error={error} onRetry={reload} retrying={loading} title="Could not load roles" />
      ) : loading && !data ? (
        <AdminLoading rows={2} rowClassName="h-9" label="Loading roles" />
      ) : own.length === 0 ? (
        <AdminEmptyState title="No one yet" description="Grant a role by email above." className="py-6" />
      ) : (
        <>
          <SearchBox value={search} onChange={setSearch} label={`Search ${title.toLowerCase()}`} />
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one matches.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {rows.map((r) => (
                <li key={`${r.user_id}-${r.role}-${r.source ?? "shift_round_roles"}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span>
                    {r.display_name ?? r.email ?? r.user_id}
                    {r.display_name && r.email && <span className="text-muted-foreground"> · {r.email}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <Pill tone="info">{r.role}</Pill>
                    {r.source === "web_admin" ? (
                      <span
                        className="text-xs text-muted-foreground"
                        title="Web admins are global SHIFT staff automatically. Remove the admin role on the Users page to take this away."
                      >
                        Web admin · not removable here
                      </span>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => revoke(r)} disabled={busy} aria-label={`Remove ${r.role} role from ${r.email ?? r.user_id}`}>
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Section>
  );
}

export function RoundSettings({ roundId, now }: { roundId: string; now?: Date }) {
  const { data: round, error, loading, reload } = useRound(roundId);
  const clock = now ?? new Date();

  if (error) return <LoadError error={error} onRetry={reload} retrying={loading} title="Could not load this round" />;
  if (loading && !round) return <AdminLoading rows={4} rowClassName="h-32" label="Loading round settings" />;
  if (!round) return null;

  return (
    <div className="space-y-4">
      <StatusSection round={round} onSaved={reload} />
      <PolicySection round={round} now={clock} onSaved={reload} />
      <AllowlistSection round={round} />
      <RolesSection roundId={round.id} title="Mentors and round staff" />
    </div>
  );
}
