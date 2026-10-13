"use client";

import { useMemo, useState } from "react";
import { Check, Circle } from "lucide-react";

import { entryDetailAction } from "@/app/admin/shift/rounds/actions";
import { AdminEmptyState, AdminLoading } from "@/components/admin/shared/AdminStates";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { MISSION_LABEL, TRACK_LABEL, TYPE_LABEL, formatIct } from "@/lib/shift-round/admin/format";
import type { AdminCheckin, AdminEvent, AdminEvidence } from "@/lib/shift-round/admin/types";

import { EvidenceView } from "./EvidenceView";
import { LoadError, NativeSelect, Pill, SearchBox, Section, statusTone } from "./shared";
import { useAdminQuery } from "./useAdminData";

type Kind = "all" | "evidence" | "checkin" | "event";

type TimelineItem =
  | { kind: "evidence"; at: string; key: string; evidence: AdminEvidence }
  | { kind: "checkin"; at: string; key: string; checkin: AdminCheckin }
  | { kind: "event"; at: string; key: string; event: AdminEvent };

export function EntryDetail({ entryId }: { entryId: string }) {
  const { data, error, loading, reload } = useAdminQuery(() => entryDetailAction(entryId), [entryId]);
  const [kind, setKind] = useState<Kind>("all");
  const [search, setSearch] = useState("");

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!data) return [];
    const items: TimelineItem[] = [
      ...data.evidence.map((e) => ({ kind: "evidence" as const, at: e.submitted_at, key: `e-${e.id}`, evidence: e })),
      ...data.checkins.map((c) => ({ kind: "checkin" as const, at: c.submitted_at, key: `c-${c.checkpoint}`, checkin: c })),
      ...data.events.map((ev, i) => ({ kind: "event" as const, at: ev.created_at, key: `v-${ev.id ?? i}`, event: ev })),
    ];
    const needle = search.trim().toLowerCase();
    return items
      .filter((i) => kind === "all" || i.kind === kind)
      .filter((i) => {
        if (!needle) return true;
        const text =
          i.kind === "evidence"
            ? `${i.evidence.type} ${i.evidence.status} ${JSON.stringify(i.evidence.payload)}`
            : i.kind === "checkin"
              ? `${i.checkin.checkpoint} ${JSON.stringify(i.checkin.answers)}`
              : `${i.event.name} ${JSON.stringify(i.event.props ?? {})}`;
        return text.toLowerCase().includes(needle);
      })
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [data, kind, search]);

  if (error) return <LoadError error={error} onRetry={reload} retrying={loading} title="Could not load this entry" />;
  if (loading && !data) return <AdminLoading rows={5} rowClassName="h-24" label="Loading entry" />;
  if (!data) return null;
  const { entry, missions } = data;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="SHIFT entrant"
        title={entry.handle}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {TRACK_LABEL[entry.track]} · {entry.beta_group ?? "group not set"} · joined day {entry.joined_day} (
            {formatIct(entry.joined_at)}) · {entry.squad_name ?? "no squad"}
            <Pill tone={statusTone(entry.outcome)}>{entry.outcome.replace("_", " ")}</Pill>
          </span>
        }
      />

      <Section title={`Missions · ${missions.missions_complete} of 6 · talked to ${missions.people_talked_to} people`}>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {missions.missions.map((m) => (
            <li key={m.key} className="flex items-start gap-2 rounded-md border p-2 text-sm">
              {m.complete ? (
                <Check className="mt-0.5 h-4 w-4 text-emerald-400" aria-label="Complete" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" aria-label="Not complete" />
              )}
              <div>
                <p className="font-medium">{MISSION_LABEL[m.key]}</p>
                <p className="text-xs text-muted-foreground">
                  {m.parts.map((p) => `${TYPE_LABEL[p.type]} ${p.have}/${p.need}`).join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Timeline"
        aside={
          <div className="flex flex-wrap gap-2">
            <SearchBox value={search} onChange={setSearch} label="Search timeline" />
            <NativeSelect aria-label="Show" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              <option value="all">Everything</option>
              <option value="evidence">Logs</option>
              <option value="checkin">Check-ins</option>
              <option value="event">Events</option>
            </NativeSelect>
          </div>
        }
      >
        {data.evidence.length + data.checkins.length + data.events.length === 0 ? (
          <AdminEmptyState title="Nothing logged yet" />
        ) : timeline.length === 0 ? (
          <AdminEmptyState title="Nothing matches" />
        ) : (
          <ol className="space-y-3">
            {timeline.map((item) => (
              <li key={item.key} className="rounded-md border p-3">
                {item.kind === "evidence" ? (
                  <EvidenceView item={item.evidence} />
                ) : item.kind === "checkin" ? (
                  <div className="space-y-1 text-sm">
                    <p>
                      <Pill tone="info">check-in · {item.checkin.checkpoint}</Pill>{" "}
                      <span className="text-xs text-muted-foreground">{formatIct(item.at)}</span>
                    </p>
                    <dl className="grid gap-x-4 sm:grid-cols-[10rem_1fr]">
                      {Object.entries(item.checkin.answers).map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="text-muted-foreground">{k}</dt>
                          <dd className="whitespace-pre-wrap" lang="th">
                            {String(v)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : (
                  <p className="text-sm">
                    <span className="font-mono text-xs">{item.event.name}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {formatIct(item.at)}
                      {item.event.actor_id ? ` · by ${item.event.actor_id.slice(0, 8)}` : ""}
                    </span>
                    {item.event.props && Object.keys(item.event.props).length > 0 && (
                      <code className="ml-2 text-xs text-muted-foreground">{JSON.stringify(item.event.props)}</code>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
