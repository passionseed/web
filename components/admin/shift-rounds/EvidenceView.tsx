"use client";

import { useEffect, useState } from "react";
import { ImageOff, RefreshCw } from "lucide-react";

import { signMediaAction } from "@/app/admin/shift/rounds/actions";
import { Button } from "@/components/ui/button";
import { REASON_LABEL, TYPE_LABEL, describeError, formatIct } from "@/lib/shift-round/admin/format";
import type { AdminError, AdminEvidence, EvidenceMedia } from "@/lib/shift-round/admin/types";

import { Pill, statusTone } from "./shared";

/** Payload keys shown first, with staff labels. Unknown keys are listed after. */
const FIELD_LABEL: Record<string, string> = {
  who_label: "Who",
  channel: "Channel",
  occurred_on: "When",
  ideas: "Ideas",
  reachable: "Can reach them without an adult",
  built: "Built today",
  broke: "What broke",
  heard: "What users said",
  key_point: "Key point",
  text: "Problem statement",
  user_group: "User group",
  what_tried: "What they tried",
  planned_change: "Planned change",
  kind: "Kind",
  what: "What changed",
  url: "Demo URL",
  visibility: "Visibility",
  link: "Link",
  note: "Note",
  input: "Input",
  source_evidence_id: "Source log",
};
/** Shown inside another field (`picked` marks one of the ideas). */
const LONG_FIELDS = new Set(["transcript", "picked"]);

function isHttps(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\/[^\s]{4,490}$/.test(value);
}

/** `ideas` log (step 1): 3 to 6 ideas with who has the problem; `picked` is 0-based. */
function IdeasList({ ideas, picked }: { ideas: unknown[]; picked: unknown }) {
  return (
    <ol className="list-decimal space-y-0.5 pl-5" lang="th">
      {ideas.map((idea, i) => {
        const o = idea && typeof idea === "object" ? (idea as Record<string, unknown>) : {};
        const chosen = picked === i;
        return (
          <li key={i} className={chosen ? "font-medium text-foreground" : undefined}>
            {String(o.text ?? "")}
            {o.who ? <span className="text-muted-foreground"> · {String(o.who)}</span> : null}
            {chosen && <Pill tone="good">picked</Pill>}
          </li>
        );
      })}
    </ol>
  );
}

function renderValue(key: string, value: unknown, payload: Record<string, unknown> = {}) {
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
  if (key === "ideas" && Array.isArray(value)) return <IdeasList ideas={value} picked={payload.picked} />;
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if ((key === "link" || key === "url") && isHttps(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer nofollow ugc" className="break-all text-sky-300 underline">
        {value}
      </a>
    );
  }
  if (typeof value === "object") return <code className="text-xs">{JSON.stringify(value)}</code>;
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
}

/** Signs media paths on demand (5-minute URLs, reviewer's session). */
export function useSignedMedia(media: EvidenceMedia[]) {
  const paths = media.filter((m) => !m.purged_at && !m.purged).map((m) => m.path);
  const key = paths.join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<AdminError | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    signMediaAction(key.split("|"))
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setUrls(result.data);
        else setError(result.error);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError({ code: "retryable", category: "retryable", message: String(e) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  return { urls, error, loading, retry: () => setAttempt((n) => n + 1) };
}

export function MediaBlock({ media }: { media: EvidenceMedia[] }) {
  const { urls, error, loading, retry } = useSignedMedia(media);
  if (media.length === 0) return null;
  return (
    <div className="space-y-2">
      {error && (
        <div role="alert" className="flex items-center gap-2 text-sm text-red-300">
          Media could not load. {describeError(error)}
          <Button size="sm" variant="ghost" onClick={retry}>
            <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" /> Retry
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {media.map((m) => {
          if (m.purged_at || m.purged) {
            return (
              <p key={m.path} className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageOff className="h-4 w-4" aria-hidden="true" /> {m.kind} deleted under retention
              </p>
            );
          }
          const url = urls[m.path];
          if (!url) {
            return (
              <div key={m.path} className="h-24 w-32 animate-pulse rounded-md bg-muted" aria-busy={loading} aria-label={`Loading ${m.kind}`} />
            );
          }
          return m.kind === "photo" ? (
            <a key={m.path} href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
              <img src={url} alt="Student evidence photo" className="max-h-64 rounded-md border object-contain" />
            </a>
          ) : (
            <audio key={m.path} controls src={url} preload="none" className="w-full max-w-md">
              <track kind="captions" />
            </audio>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Links expire after 5 minutes. Don&apos;t download or share student media.</p>
    </div>
  );
}

export function EvidenceView({ item, showMedia = true }: { item: AdminEvidence; showMedia?: boolean }) {
  const payload = item.payload ?? {};
  const keys = Object.keys(payload);
  const ordered = [
    ...Object.keys(FIELD_LABEL).filter((k) => keys.includes(k)),
    ...keys.filter((k) => !(k in FIELD_LABEL) && !LONG_FIELDS.has(k)),
  ];
  const transcript = payload.transcript;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="info">{TYPE_LABEL[item.type] ?? item.type}</Pill>
        <Pill tone={statusTone(item.status)}>{item.status}</Pill>
        {item.reviewed_at && <Pill tone="good">spot-checked</Pill>}
        {item.after_close && <Pill tone="warn">after close</Pill>}
        {item.counted === false && item.status !== "withdrawn" && item.status !== "rejected" && (
          <Pill tone="muted">not counted</Pill>
        )}
        <span className="text-xs text-muted-foreground">Logged {formatIct(item.submitted_at)}</span>
      </div>
      {item.status === "rejected" && item.status_reason_code && (
        <p className="text-sm text-red-300">
          Rejected: {REASON_LABEL[item.status_reason_code]}
          {item.status_note ? ` · “${item.status_note}”` : ""}
        </p>
      )}
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
        {ordered.map((key) => (
          <div key={key} className="contents">
            <dt className="text-muted-foreground">{FIELD_LABEL[key] ?? key}</dt>
            <dd>{renderValue(key, payload[key], payload)}</dd>
          </div>
        ))}
      </dl>
      {typeof transcript === "string" && transcript && (
        <details className="rounded-md border p-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Transcript ({transcript.length} characters)</summary>
          <p className="mt-2 whitespace-pre-wrap" lang="th">
            {transcript}
          </p>
        </details>
      )}
      {item.source && (
        <div className="rounded-md border border-dashed p-3 text-sm">
          <p className="text-xs text-muted-foreground">Linked source</p>
          <p>
            {TYPE_LABEL[item.source.type]} · {item.source.who_label ?? "—"}{" "}
            <Pill tone={statusTone(item.source.status)}>{item.source.status}</Pill>
          </p>
          {item.source.key_point && <p className="mt-1 text-muted-foreground">{item.source.key_point}</p>}
        </div>
      )}
      {showMedia && <MediaBlock media={item.media ?? []} />}
    </div>
  );
}
