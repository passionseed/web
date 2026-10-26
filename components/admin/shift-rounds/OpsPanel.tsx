"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { jobsAction, readConfigAction, setConfigAction } from "@/app/admin/shift/rounds/actions";
import { AdminEmptyState, AdminLoading } from "@/components/admin/shared/AdminStates";
import { useConfirm } from "@/components/admin/shared/useConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatIct } from "@/lib/shift-round/admin/format";
import type { EmergencyMessage } from "@/lib/shift-round/admin/types";

import { JobStrip } from "./RoundDashboard";
import { RolesSection } from "./RoundSettings";
import { ActionError, Field, LoadError, NativeSelect, Pill, SearchBox, Section, statusTone } from "./shared";
import { useAdminMutation, useAdminQuery } from "./useAdminData";

const BOOLEAN_FLAGS: { key: string; label: string; description: string; offWarning?: string; onWarning?: string }[] = [
  {
    key: "shift_round.tab_enabled",
    label: "SHIFT tabs for everyone",
    description: "Show the SHIFT tabs to users without an entry. Students with an entry always see them.",
  },
  {
    key: "shift_round.enrollment_enabled",
    label: "New joins",
    description: "Server-enforced. Off pauses joining in every round.",
    offWarning: "Students trying to join will see “Joining is paused for now”.",
  },
  {
    key: "shift_round.submissions_enabled",
    label: "Log submissions (kill switch)",
    description: "Server-enforced for RPCs and uploads. Drafts stay on phones.",
    offWarning: "Every student's Send is blocked until you turn this back on.",
  },
  {
    key: "shift_round.transcription_enabled",
    label: "Voice transcription",
    description: "Server-enforced. Off means students type instead; recordings stay attached.",
    offWarning: "Voice-to-text stops for every student.",
  },
  {
    key: "shift_round.issuance_enabled",
    label: "Certificate issuing",
    description: "Off pauses the hourly issue job.",
    offWarning: "Certificates won't issue until this is back on.",
  },
  {
    key: "shift_round.nudges_enabled",
    label: "Evening nudges",
    description: "Push reminders on days without a log. Turn on after the app build with SHIFT ships.",
    onWarning: "Students with push on start getting evening reminders.",
  },
];

function EmergencyEditor({
  value,
  busy,
  onSave,
}: {
  value: EmergencyMessage | null;
  busy: boolean;
  onSave: (next: EmergencyMessage | null) => void;
}) {
  const [th, setTh] = useState(value?.th ?? "");
  const [en, setEn] = useState(value?.en ?? "");
  const [url, setUrl] = useState(value?.url ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Message (Thai)" htmlFor="em-th">
          <Textarea id="em-th" lang="th" rows={2} maxLength={200} value={th} onChange={(e) => setTh(e.target.value)} />
        </Field>
        <Field label="Message (English)" htmlFor="em-en">
          <Textarea id="em-en" rows={2} maxLength={200} value={en} onChange={(e) => setEn(e.target.value)} />
        </Field>
        <Field label="Link (optional, https)" htmlFor="em-url" className="sm:col-span-2">
          <Input id="em-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          disabled={busy}
          onClick={() => {
            if (!th.trim() || !en.trim()) return setError("Write both Thai and English.");
            if (url && !/^https:\/\/\S{4,490}$/.test(url)) return setError("Link must start with https://");
            setError(null);
            onSave({ th: th.trim(), en: en.trim(), url: url.trim() || null });
          }}
        >
          Show banner
        </Button>
        {value && (
          <Button variant="outline" disabled={busy} onClick={() => onSave(null)}>
            Clear banner
          </Button>
        )}
      </div>
    </div>
  );
}

export function OpsPanel() {
  const config = useAdminQuery(() => readConfigAction(), []);
  const jobs = useAdminQuery(() => jobsAction(), []);
  const { run, busy, message } = useAdminMutation();
  const { confirm, confirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [baseUrl, setBaseUrl] = useState<string | null>(null);

  const values = useMemo(() => new Map((config.data ?? []).map((r) => [r.key, r])), [config.data]);
  const flag = (key: string) => values.get(key)?.value === true;
  const emergency = (values.get("shift_round.emergency_message")?.value ?? null) as EmergencyMessage | null;
  const webBase = (values.get("shift_round.web_base_url")?.value as string | undefined) ?? "";

  const write = async (key: string, value: unknown, success: string) => {
    const result = await run(() => setConfigAction(key, value));
    if (result?.ok) {
      toast.success(success);
      config.setData((prev) => {
        const rows = (prev ?? []).filter((r) => r.key !== key);
        return [...rows, { key, value, updated_at: new Date().toISOString() }];
      });
    }
  };

  const toggle = async (f: (typeof BOOLEAN_FLAGS)[number], next: boolean) => {
    const warning = next ? f.onWarning : f.offWarning;
    if (warning) {
      const ok = await confirm({
        title: `Turn ${next ? "on" : "off"} ${f.label.toLowerCase()}?`,
        description: warning,
        confirmLabel: next ? "Turn on" : "Turn off",
        destructive: !next,
      });
      if (!ok) return;
    }
    await write(f.key, next, `${f.label}: ${next ? "on" : "off"}`);
  };

  const flagsShown = BOOLEAN_FLAGS.filter(
    (f) => !search || `${f.label} ${f.key}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const failures = (jobs.data?.failures ?? []).filter((r) => jobFilter === "all" || r.job === jobFilter);

  return (
    <div className="space-y-4">
      {confirmDialog}
      <ActionError message={message} />
      <Section title="Flags" aside={<SearchBox value={search} onChange={setSearch} label="Search flags" />}>
        {config.error ? (
          <LoadError error={config.error} onRetry={config.reload} retrying={config.loading} title="Could not load flags" />
        ) : config.loading && !config.data ? (
          <AdminLoading rows={4} rowClassName="h-12" label="Loading flags" />
        ) : (config.data ?? []).length === 0 ? (
          <AdminEmptyState title="No SHIFT flags found" description="Flags show here once SHIFT rounds are set up. If this stays empty, tell the tech team." />
        ) : flagsShown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No flags match.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {flagsShown.map((f) => {
              const row = values.get(f.key);
              return (
                <li key={f.key} className="flex items-center justify-between gap-4 p-3">
                  <div>
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {f.key}
                      {row?.updated_at ? ` · changed ${formatIct(row.updated_at)}` : ""}
                      {!row ? " · not set" : ""}
                    </p>
                  </div>
                  <Switch
                    aria-label={f.label}
                    checked={flag(f.key)}
                    disabled={busy || !row}
                    onCheckedChange={(next) => void toggle(f, next)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {config.data && (
        <>
          <Section
            title="Emergency banner"
            aside={emergency ? <Pill tone="bad">Showing in the app</Pill> : <Pill>Off</Pill>}
          >
            <EmergencyEditor
              key={JSON.stringify(emergency)}
              value={emergency}
              busy={busy}
              onSave={async (next) => {
                const ok = await confirm({
                  title: next ? "Show this banner to every SHIFT student?" : "Clear the emergency banner?",
                  confirmLabel: next ? "Show banner" : "Clear",
                  destructive: Boolean(next),
                });
                if (ok) await write("shift_round.emergency_message", next, next ? "Banner is live" : "Banner cleared");
              }}
            />
          </Section>
          <Section title="Web base URL">
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const next = (baseUrl ?? webBase).trim().replace(/\/$/, "");
                if (!/^https:\/\/[^\s/]+$/.test(next)) return toast.error("Use https://host with no path");
                const ok = await confirm({
                  title: `Change the web base URL to ${next}?`,
                  description: "Verify links, transcription and the certificate health check use it.",
                  confirmLabel: "Change",
                  destructive: true,
                });
                if (ok) await write("shift_round.web_base_url", next, "Web base URL saved");
              }}
            >
              <Field label="URL" htmlFor="web-base" className="min-w-72 flex-1">
                <Input id="web-base" type="url" value={baseUrl ?? webBase} onChange={(e) => setBaseUrl(e.target.value)} />
              </Field>
              <Button type="submit" variant="outline" disabled={busy || (baseUrl ?? webBase) === webBase}>
                Save
              </Button>
            </form>
          </Section>
        </>
      )}

      <RolesSection roundId={null} title="Global SHIFT staff" />

      <Section title="Jobs">
        {jobs.error ? (
          <LoadError error={jobs.error} onRetry={jobs.reload} retrying={jobs.loading} title="Could not load job runs" />
        ) : jobs.loading && !jobs.data ? (
          <AdminLoading rows={2} rowClassName="h-16" label="Loading jobs" />
        ) : (
          <div className="space-y-3">
            <JobStrip jobs={jobs.data?.jobs ?? []} />
            {jobs.data?.deletion_queue && (
              <p className="text-sm text-muted-foreground">
                Storage deletion queue: {jobs.data.deletion_queue.queued} queued
                {jobs.data.deletion_queue.failed > 0 && (
                  <span className="text-red-300">, {jobs.data.deletion_queue.failed} failed</span>
                )}
              </p>
            )}
            <h3 className="text-sm font-medium">Failures in the last 7 days</h3>
            <div className="flex items-center gap-2">
              <NativeSelect aria-label="Filter failures by job" value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
                <option value="all">All jobs</option>
                {(jobs.data?.jobs ?? []).map((j) => (
                  <option key={j.job} value={j.job}>
                    {j.job}
                  </option>
                ))}
              </NativeSelect>
              <Button size="sm" variant="ghost" onClick={jobs.reload} disabled={jobs.loading}>
                Refresh
              </Button>
            </div>
            {failures.length === 0 ? (
              <p className="text-sm text-muted-foreground">No failed runs in the last 7 days.</p>
            ) : (
              <ul className="divide-y rounded-md border text-sm">
                {failures.map((r, i) => (
                  <li key={r.id ?? `${r.job}-${r.started_at}-${i}`} className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <span className="font-medium">{r.job}</span>
                    <Pill tone={statusTone(r.status)}>{r.status}</Pill>
                    <span className="text-muted-foreground">{formatIct(r.started_at)}</span>
                    <span className="text-muted-foreground">
                      {r.processed_count ?? 0}/{r.due_count ?? 0}
                    </span>
                    {r.error && <span className="text-red-300">{r.error}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
