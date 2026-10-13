"use client";

import { Lock } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ictDate, ictMidnightIso } from "@/lib/shift-round/admin/format";
import type { RoundPolicy, Track } from "@/lib/shift-round/admin/types";

import { Field, NativeSelect } from "./shared";

/** Form state: `starts_on` is the ICT date; it becomes `starts_at` at 00:00 ICT. */
export type PolicyDraft = Omit<RoundPolicy, "starts_at"> & { starts_on: string };

type NumberKey =
  | "number"
  | "duration_days"
  | "review_window_hours"
  | "join_cutoff_day"
  | "rate_limit_per_hour"
  | "grace_minutes"
  | "squad_size"
  | "retention_months"
  | "audio_retention_days";

const NUMBER_FIELDS: { key: NumberKey; label: string; hint: string }[] = [
  { key: "duration_days", label: "Duration (days)", hint: "5-28 as planned; extensions are added on top." },
  { key: "join_cutoff_day", label: "Join cutoff day", hint: "Last day new students can join." },
  { key: "review_window_hours", label: "Review window (hours)", hint: "After close, before certificates issue." },
  { key: "squad_size", label: "Squad size", hint: "Students per squad, 2-6." },
  { key: "rate_limit_per_hour", label: "Logs per hour (limit)", hint: "Per student." },
  { key: "grace_minutes", label: "Offline grace (minutes)", hint: "Logs made before close, sent late." },
  { key: "retention_months", label: "Evidence retention (months)", hint: "After close." },
  { key: "audio_retention_days", label: "Audio retention (days)", hint: "After review ends." },
];

export function PolicyFields({
  idPrefix,
  value,
  onChange,
  errors = {},
  isLocked = () => false,
  showNumber = true,
}: {
  idPrefix: string;
  value: PolicyDraft;
  onChange: (next: PolicyDraft) => void;
  errors?: Partial<Record<keyof RoundPolicy | "starts_on", string>>;
  isLocked?: (field: keyof RoundPolicy) => boolean;
  showNumber?: boolean;
}) {
  const set = <K extends keyof PolicyDraft>(key: K, v: PolicyDraft[K]) => onChange({ ...value, [key]: v });
  const id = (key: string) => `${idPrefix}-${key}`;
  const lockNote = (field: keyof RoundPolicy) =>
    isLocked(field) ? (
      <span className="inline-flex items-center gap-1">
        <Lock className="h-3 w-3" aria-hidden="true" /> Locked after the round started
      </span>
    ) : undefined;
  const numberInput = (key: NumberKey) => (
    <Input
      id={id(key)}
      type="number"
      inputMode="numeric"
      value={Number.isFinite(value[key]) ? String(value[key]) : ""}
      readOnly={isLocked(key)}
      aria-readonly={isLocked(key) || undefined}
      aria-invalid={errors[key] ? true : undefined}
      onChange={(e) => set(key, e.target.value === "" ? Number.NaN : Number(e.target.value))}
    />
  );
  const toggleTrack = (track: Track, on: boolean) =>
    set(
      "tracks_open",
      on ? [...new Set([...value.tracks_open, track])] : value.tracks_open.filter((t) => t !== track),
    );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {showNumber && (
          <Field label="Round number" htmlFor={id("number")} error={errors.number} hint={lockNote("number")}>
            {numberInput("number")}
          </Field>
        )}
        <Field
          label="Day 1 (ICT)"
          htmlFor={id("starts_on")}
          error={errors.starts_on ?? errors.starts_at}
          hint={lockNote("starts_at") ?? "Starts at 00:00 Bangkok time."}
        >
          <Input
            id={id("starts_on")}
            type="date"
            value={value.starts_on}
            readOnly={isLocked("starts_at")}
            aria-readonly={isLocked("starts_at") || undefined}
            onChange={(e) => set("starts_on", e.target.value)}
          />
        </Field>
        <Field label="Join mode" htmlFor={id("join_mode")} hint={lockNote("join_mode") ?? "Invite = allowlist only."}>
          <NativeSelect
            id={id("join_mode")}
            className="w-full"
            value={value.join_mode}
            disabled={isLocked("join_mode")}
            onChange={(e) => set("join_mode", e.target.value as PolicyDraft["join_mode"])}
          >
            <option value="invite">Invite only</option>
            <option value="open">Open</option>
          </NativeSelect>
        </Field>
        <Field
          label="Nudge time (ICT)"
          htmlFor={id("nudge_local_time")}
          error={errors.nudge_local_time}
          hint={lockNote("nudge_local_time")}
        >
          <Input
            id={id("nudge_local_time")}
            type="time"
            value={value.nudge_local_time.slice(0, 5)}
            readOnly={isLocked("nudge_local_time")}
            aria-readonly={isLocked("nudge_local_time") || undefined}
            onChange={(e) => set("nudge_local_time", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title (Thai)" htmlFor={id("title_th")} error={errors.title_th}>
          <Input id={id("title_th")} lang="th" maxLength={80} value={value.title_th} onChange={(e) => set("title_th", e.target.value)} />
        </Field>
        <Field label="Title (English)" htmlFor={id("title_en")} error={errors.title_en}>
          <Input id={id("title_en")} maxLength={80} value={value.title_en} onChange={(e) => set("title_en", e.target.value)} />
        </Field>
        <Field label="Brief (Thai)" htmlFor={id("brief_th")} error={errors.brief_th} hint={`${value.brief_th.length}/400`}>
          <Textarea id={id("brief_th")} lang="th" rows={3} maxLength={400} value={value.brief_th} onChange={(e) => set("brief_th", e.target.value)} />
        </Field>
        <Field label="Brief (English)" htmlFor={id("brief_en")} error={errors.brief_en} hint={`${value.brief_en.length}/400`}>
          <Textarea id={id("brief_en")} rows={3} maxLength={400} value={value.brief_en} onChange={(e) => set("brief_en", e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {NUMBER_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={id(f.key)} error={errors[f.key]} hint={lockNote(f.key) ?? f.hint}>
            {numberInput(f.key)}
          </Field>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Tracks open</legend>
          {(["high_school", "university"] as Track[]).map((track) => (
            <label key={track} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={value.tracks_open.includes(track)}
                disabled={isLocked("tracks_open")}
                onCheckedChange={(on) => toggleTrack(track, on === true)}
              />
              {track === "high_school" ? "High school" : "University (deferred past beta)"}
            </label>
          ))}
          {errors.tracks_open && <p className="text-xs text-red-300">{errors.tracks_open}</p>}
          {isLocked("tracks_open") && <p className="text-xs text-muted-foreground">{lockNote("tracks_open")}</p>}
        </fieldset>
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.mentor_led}
              disabled={isLocked("mentor_led")}
              onCheckedChange={(on) => set("mentor_led", on === true)}
            />
            Mentor-led round
          </label>
          <Field label="Round Discord link" htmlFor={id("discord_url")} error={errors.discord_url} hint="https://discord.gg/… or https://discord.com/…">
            <Input
              id={id("discord_url")}
              type="url"
              value={value.discord_url ?? ""}
              onChange={(e) => set("discord_url", e.target.value.trim() || null)}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

const POLICY_KEYS: (keyof RoundPolicy)[] = [
  "number",
  "title_th",
  "title_en",
  "brief_th",
  "brief_en",
  "tracks_open",
  "starts_at",
  "duration_days",
  "review_window_hours",
  "join_cutoff_day",
  "nudge_local_time",
  "rate_limit_per_hour",
  "grace_minutes",
  "squad_size",
  "retention_months",
  "audio_retention_days",
  "join_mode",
  "mentor_led",
  "discord_url",
];

export function draftToPolicy(draft: PolicyDraft): RoundPolicy {
  const { starts_on, ...rest } = draft;
  return {
    ...rest,
    title_th: rest.title_th.trim(),
    title_en: rest.title_en.trim(),
    brief_th: rest.brief_th.trim(),
    brief_en: rest.brief_en.trim(),
    starts_at: starts_on ? ictMidnightIso(starts_on) : "",
  };
}

export function policyToDraft(round: RoundPolicy): PolicyDraft {
  const draft = {} as Record<string, unknown>;
  for (const key of POLICY_KEYS) draft[key] = round[key];
  const { starts_at: _startsAt, ...rest } = draft as unknown as RoundPolicy;
  return { ...rest, starts_on: round.starts_at ? ictDate(round.starts_at) : "" };
}

/** Changed policy fields only, for update_round's patch. */
export function policyPatch(before: RoundPolicy, after: RoundPolicy): Partial<RoundPolicy> {
  const patch: Partial<RoundPolicy> = {};
  const same = (key: keyof RoundPolicy) => {
    const a = before[key];
    const b = after[key];
    if (key === "starts_at") return Date.parse(String(a)) === Date.parse(String(b));
    if (key === "nudge_local_time") return String(a).slice(0, 5) === String(b).slice(0, 5);
    if (key === "discord_url") return (a || null) === (b || null);
    return JSON.stringify(a) === JSON.stringify(b);
  };
  for (const key of POLICY_KEYS) {
    if (!same(key)) {
      (patch as Record<string, unknown>)[key] = after[key];
    }
  }
  return patch;
}
