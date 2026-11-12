"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Wand2,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { useConfirm } from "@/components/admin/shared/useConfirm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── persona / consent option sets ────────────────────────────────────────────

const PERSONAS = [
  { v: "A · Senior (free)", label: "A Senior" },
  { v: "B · Builder (paid)", label: "B Builder" },
  { v: "C · Operator (none)", label: "C Operator" },
  { v: "D · Switcher (warm)", label: "D Switcher" },
] as const;

const IDENTITY = [
  { v: "anonymous", label: "Anon" },
  { v: "first-name + role", label: "First+role" },
  { v: "full name + links", label: "Full" },
] as const;

const SALARY = [
  { v: "skip", label: "Skip" },
  { v: "band by stage", label: "Band" },
  { v: "exact, attributed", label: "Exact" },
] as const;

// ── note state shape ─────────────────────────────────────────────────────────

type Notes = {
  slug: string;
  name: string;
  role: string;
  years: string;
  persona: string;
  identity: string;
  salaryConsent: string;
  path: string;
  now: string;
  where: string;
  advice: string;
  salary: string;
  skill: string;
  raw: string;
  src: string;
};

const EMPTY: Notes = {
  slug: "",
  name: "",
  role: "",
  years: "",
  persona: "",
  identity: "",
  salaryConsent: "",
  path: "",
  now: "",
  where: "",
  advice: "",
  salary: "",
  skill: "",
  raw: "",
  src: "",
};

const STORAGE_KEY = "radar_notetaker_v1";

// ── prompt builder ───────────────────────────────────────────────────────────

function line(label: string, v: string) {
  return `- ${label}: ${v.trim() ? v.trim() : "(not captured)"}`;
}

function buildPrompt(n: Notes): string {
  const slug = n.slug.trim() || "<field-slug>";
  const identity = n.identity || "(not set)";
  const salaryConsent = n.salaryConsent || "(not set)";
  const persona = n.persona || "(not set)";

  return `You are turning raw interview notes into ONE database-ready person object for PassionSeed's Career Radar.

## Editorial spine: HARD RULES (violating these breaks the product)
1. NEVER fabricate a salary, number, quote, year, or fact. If a value wasn't captured, OMIT the key. Empty > fake.
2. Salary appears ONLY if the interviewee shared it. Salary consent = "${salaryConsent}".
   - "skip"            → omit "salary" entirely.
   - "band by stage"   → ranges/bands only (e.g. "~40k entry, ~150k senior"), never an exact figure.
   - "exact, attributed" → exact figure allowed.
3. Identity consent = "${identity}".
   - "anonymous"          → omit "name"; keep "role" only; omit publisher/url.
   - "first-name + role"  → first name + role only; no links/photo.
   - "full name + links"  → full name + role + publisher/url allowed.
   - SAFETY: never pair a full name with an EXACT salary unless BOTH consents explicitly allow it.
4. Snapshot→trajectory: every snapshot needs a "where this is heading" signal (whereHeading).
5. Durable-skill anchor: advice/notes anchor on judgment, framing, decisions under uncertainty, NOT tool mastery.
6. Output VALID JSON only, no prose outside it. Quotes must be the interviewee's own words, never invented.

## Target
radar_fields.slug = "${slug}"   (persona lens: ${persona})

## Output shape: matches RealPeopleContent.people[] in components/radar/RadarCards.tsx
{
  "realPerson": {
    "name": "<omit per identity consent>",
    "role": "<role>",
    "imageUrl": "<optional headshot URL, only if provided and consented>",
    "background": "<1-line bio, back-compat>",
    "salary": "<omit unless shared; band or exact per salary consent>",
    "path": [ { "year": "<rough year, or omit>", "label": "<step>" } ],
    "nowDoing": "<daily work + with whom>",
    "whereHeading": "<where the role is going in 3–5 yrs>",
    "advice": "<what they wish they'd known>",
    "publisher": "<omit unless full identity>",
    "url": "<citation, omit unless provided>"
  },
  "salaryProgressionNotes": [
    { "level": "entry|mid|senior", "note": "<what it takes at this level + the durable skill underneath>" }
  ],
  "aiImpactVerdictDraft": "<1–2 sentences: the A→B→C shift + the durable skill that survives it>",
  "radarSource": { "title": "<short>", "publisher": "<who>", "url": "<citation url or null>" },
  "th": { "...": "Thai translation of every human-readable string above, same shape" },
  "confidenceFlags": [ "<any value you were tempted to infer but left out, for a human to verify>" ]
}
Produce both English (top level) and Thai ("th"). Thai natural, mentor-toned, for a 16-year-old.

## Raw interview notes
- Role/title: ${n.role.trim() || "(not captured)"}
- Years in field: ${n.years.trim() || "(not captured)"}
${line("Path (first step → now, pivots + years)", n.path)}
${line("Day-to-day + with whom", n.now)}
${line("Where role heads / what AI bends", n.where)}
${line("Wish they had known", n.advice)}
${line("Salary by stage (per consent above)", n.salary)}
${line("Durable skill that survived tool change", n.skill)}
${line("Citation URL", n.src)}
- Raw scratchpad (mine verbatim quotes, do not paraphrase quotes):
"""
${n.raw.trim() || "(empty)"}
"""

Return ONLY the JSON object.`;
}

// ── small presentational pieces ──────────────────────────────────────────────

function Field({
  label,
  hint,
  map,
  children,
}: {
  label: string;
  hint?: string;
  map?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between">
        <span className="text-label-md text-foreground">
          {label}
          {hint ? <span className="ml-1 font-normal text-muted-foreground">{hint}</span> : null}
        </span>
        {map ? (
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {map}
          </code>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ v: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? "" : o.v)}
            className={cn(
              "min-h-11 flex-1 rounded-lg border px-2 text-xs font-semibold transition-colors",
              active
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border bg-muted/30 text-muted-foreground hover:border-foreground/30 hover:text-foreground active:border-foreground/30 active:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────

export function RadarInterviewClient() {
  const [n, setN] = useState<Notes>(EMPTY);
  const [out, setOut] = useState("");
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // timer
  const [startedAt, setStartedAt] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const set = (k: keyof Notes) => (v: string) => setN((p) => ({ ...p, [k]: v }));

  // restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setN({ ...EMPTY, ...saved.notes });
        if (saved.startedAt) setStartedAt(saved.startedAt);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // persist
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes: n, startedAt }));
  }, [n, startedAt, hydrated]);

  // timer loop
  useEffect(() => {
    if (running && startedAt) {
      tick.current = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
      setElapsed(Date.now() - startedAt);
    }
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running, startedAt]);

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  const toggleTimer = () => {
    if (!running) {
      setStartedAt((p) => p || Date.now());
      setRunning(true);
    } else {
      setRunning(false);
    }
  };

  const clearAll = async () => {
    const ok = await confirm({
      title: "Start a new interview?",
      description: "This clears every note and the timer. The notes are only saved in this browser, so they cannot be restored.",
      confirmLabel: "Clear notes",
      destructive: true,
    });
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    setN(EMPTY);
    setOut("");
    setStartedAt(0);
    setElapsed(0);
    setRunning(false);
  };

  const generate = () => setOut(buildPrompt(n));

  const copy = async () => {
    if (!out) return;
    try {
      await navigator.clipboard.writeText(out);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const riskyConsent =
    n.identity === "full name + links" && n.salaryConsent === "exact, attributed";

  const inputCls =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div>

      {/* toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={toggleTimer} className="min-h-11">
          {running ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          {running ? "Running" : startedAt ? "Resume" : "Start timer"}
        </Button>
        <span className="rounded-lg border bg-muted/40 px-3 py-1.5 font-mono text-sm text-emerald-300">
          <span className="sr-only">Elapsed time </span>
          {fmt(elapsed)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          autosaved
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={() => void clearAll()}
          className="ml-auto min-h-11 text-muted-foreground hover:border-destructive/40 hover:text-destructive active:border-destructive/40 active:text-destructive"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          New interview
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: notes */}
        <div className="space-y-4 rounded-lg border bg-card p-5">
          <p className="admin-eyebrow">INTERVIEW NOTES</p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Field slug" map="field">
              <input
                className={inputCls}
                placeholder="ai-business"
                value={n.slug}
                onChange={(e) => set("slug")(e.target.value)}
              />
            </Field>
            <Field label="Name" hint="(if consented)">
              <input
                className={inputCls}
                placeholder="Optional"
                value={n.name}
                onChange={(e) => set("name")(e.target.value)}
              />
            </Field>
            <Field label="Role / title">
              <input
                className={inputCls}
                placeholder="AI Product Lead"
                value={n.role}
                onChange={(e) => set("role")(e.target.value)}
              />
            </Field>
            <Field label="Years in field">
              <input
                className={inputCls}
                placeholder="6"
                value={n.years}
                onChange={(e) => set("years")(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Persona" hint="(motive lens)">
            <Segmented
              options={PERSONAS}
              value={n.persona}
              onChange={set("persona")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Identity consent">
              <Segmented
                options={IDENTITY}
                value={n.identity}
                onChange={set("identity")}
              />
            </Field>
            <Field label="Salary consent">
              <Segmented
                options={SALARY}
                value={n.salaryConsent}
                onChange={set("salaryConsent")}
              />
            </Field>
          </div>

          {riskyConsent ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-foreground"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" aria-hidden="true" />
              Full identity + exact salary selected. Spine rule: never auto-pair
              full name with an exact salary unless the person OK&apos;d both
              together. Confirm verbally.
            </div>
          ) : null}

          <Field label="Path: first step → now, pivots + years" map="path[]">
            <textarea
              className={`${inputCls} min-h-[64px]`}
              placeholder="2018 analyst · 2020 → PM · 2023 → AI products…"
              value={n.path}
              onChange={(e) => set("path")(e.target.value)}
            />
          </Field>
          <Field label="Day-to-day + with whom" map="nowDoing">
            <textarea
              className={`${inputCls} min-h-[64px]`}
              placeholder="Leads a 5-person squad, works with eng + design daily…"
              value={n.now}
              onChange={(e) => set("now")(e.target.value)}
            />
          </Field>
          <Field label="Where role heads 3–5 yrs / what AI bends" map="whereHeading + aiImpact">
            <textarea
              className={`${inputCls} min-h-[64px]`}
              placeholder="Routine specs automated; judgment on what to build matters more…"
              value={n.where}
              onChange={(e) => set("where")(e.target.value)}
            />
          </Field>
          <Field label="Wish they'd known starting out" map="advice">
            <textarea
              className={`${inputCls} min-h-[56px]`}
              value={n.advice}
              onChange={(e) => set("advice")(e.target.value)}
            />
          </Field>
          <Field label="Salary by stage" hint="(only if shared)" map="salary + progression">
            <textarea
              className={`${inputCls} min-h-[56px]`}
              placeholder="entry ~40k · mid ~80k · senior ~150k (bands, or exact if consented)"
              value={n.salary}
              onChange={(e) => set("salary")(e.target.value)}
            />
          </Field>
          <Field label="Durable skill that survived every tool change" map="durable anchor">
            <textarea
              className={`${inputCls} min-h-[56px]`}
              placeholder="Framing the right problem under uncertainty…"
              value={n.skill}
              onChange={(e) => set("skill")(e.target.value)}
            />
          </Field>
          <Field label="Raw scratchpad" hint="(anything else, quotes verbatim)">
            <textarea
              className={`${inputCls} min-h-[80px]`}
              placeholder="Dump messy notes here; AI mines quotes from it."
              value={n.raw}
              onChange={(e) => set("raw")(e.target.value)}
            />
          </Field>
          <Field label="Citation URL" hint="(LinkedIn / thread)" map="radar_sources">
            <input
              className={inputCls}
              placeholder="https://…"
              value={n.src}
              onChange={(e) => set("src")(e.target.value)}
            />
          </Field>
        </div>

        {/* Right: output */}
        <div className="space-y-3 rounded-lg border bg-card p-5">
          <p className="admin-eyebrow">GENERATED AI PROMPT</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={generate} className="min-h-11">
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              Generate prompt
            </Button>
            <Button type="button" variant="outline" onClick={() => void copy()} disabled={!out} className="min-h-11">
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-body-sm text-muted-foreground">
            Paste into Claude or any LLM. Returns DB-ready JSON (<code>realPerson</code>,
            salary-progression notes, AI-impact verdict, source row) in TH + EN,
            shaped for <code>radar_cards.content</code>. Empty &gt; fake.
          </p>
          <pre className="max-h-[620px] overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/40 p-4 font-mono text-[12px] leading-relaxed text-foreground">
            {out || "Fill notes on the left, then hit Generate."}
          </pre>
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}
