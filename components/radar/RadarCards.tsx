"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import {
  getAiImpactLabel,
  getEntryRouteLabel,
  getJobAccessLabel,
  getOutlookLabel,
  interpretRadarMetric,
  parseRadarListItems,
} from "@/lib/radar/presentation";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, ArrowRight, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import type { RadarIntentScope } from "@/lib/my-path/radar-sync";
import { radarProgramLine } from "@/lib/content/radar-cta";
import type { GuideCtaTarget } from "@/lib/radar-guide/types";

// WebGL background, decorative only: keep it out of the server render and the
// first JS chunk (spec 2.9).
const OglTrendBackground = dynamic(
  () => import("@/components/radar/OglTrendBackground").then((mod) => mod.OglTrendBackground),
  { ssr: false }
);

type RadarIntentHandler = (
  pathSlug: string,
  buttonLabel: string | undefined,
  scope: RadarIntentScope
) => void;

/** Guide tracking hooks (spec 2.7). Cards read them from context so their props stay unchanged. */
type RadarGuideInteractions = {
  /** `interactive_tap` target, e.g. "salary:level". */
  onInteract?: (target: string) => void;
  /** `cta_click` target, e.g. "program" or "resource:1". */
  onCtaClick?: (target: GuideCtaTarget) => void;
};

const RadarInteractContext = createContext<RadarGuideInteractions>({});

function useRadarInteract(): RadarGuideInteractions {
  return useContext(RadarInteractContext);
}

// ── content shapes (one per radar_cards.kind) ────────────────────────────────

export interface CardBase {
  eyebrow?: string;
  title?: string;
}

export type HookContent = CardBase & { body?: string; stat?: string; statLabel?: string };
export type FantasyRealityContent = CardBase & { fantasy?: string; reality?: string };
export type TextContent = CardBase & {
  body?: string | string[];
  presentation?: "skills" | "startCarousel";
  skills?: Array<{ title: string; description?: string; level?: string }>;
  options?: Array<{
    title: string;
    description?: string;
    type?: string;
    url?: string;
    duration?: string;
    cost?: string;
    cta?: string;
  }>;
};
export type ReflectionContent = CardBase & {
  rating?: boolean;
  chips?: string[];
  allowText?: boolean;
  chapterKey: string;
  placeholder?: string;
};
export type JobsContent = CardBase & {
  jobs?: Array<{
    title: string;
    salary?: string;
    demand?: string;
    growth?: string;
    note?: string;
    listings?: Array<{ title: string; company?: string; url: string; source?: string }>;
  }>;
};
export type SalaryProgressionContent = CardBase & {
  currency?: string; // default currency code (e.g. 'USD')
  levels?: Array<{ level: string; years?: string; salary?: string; note?: string }>;
  // Optional Thai-Baht variant; UI shows a TH/USD toggle when present
  eyebrow_thb?: string;
  title_thb?: string;
  levels_thb?: Array<{ level: string; years?: string; salary?: string; note?: string }>;
};
export type GrowthCompareContent = CardBase & {
  unit?: string;
  items?: Array<{ label: string; growth: number; self?: boolean }>;
};
export type ListContent = CardBase & { items?: string[] };
export type AiImpactContent = CardBase & {
  verdict?: string;
  augmented?: string[];
  automated?: string[];
  ai_risk_score?: number;
};
export type MarketThailandContent = CardBase & {
  body?: string;
  openings?: string;
  companies?: string[];
  job_access?: {
    score: number;
    label?: string;
    confidence?: "high" | "medium" | "low";
    demand_score?: number;
    competition_score?: number;
    entry_barrier_score?: number;
    applicant_data?: string;
    methodology?: string;
  };
};
export type DayInLifeContent = CardBase & { steps?: Array<{ time?: string; label: string; detail?: string }> };
export type EntryRoutesContent = CardBase & {
  description?: string;
  faculties?: Array<{
    name: string;
    tier: "direct" | "related" | "alternative";
    examples?: string;
    note?: string;
  }>;
};
export type RisksContent = CardBase & { risks?: string[] };
export type RealPeopleContent = CardBase & {
  // NOTE: If you change this shape, also update the prompt template in
  // app/admin/radar-interview/RadarInterviewClient.tsx so AI-generated
  // JSON stays compatible with the renderer below.
  people?: Array<{
    name?: string;
    role?: string;
    imageUrl?: string; // small headshot or sourced photo
    background: string; // short bio (kept for back-compat)
    salary?: string; // honest, only if the person shared it — never fabricated
    path?: Array<{ year?: string; label: string }>; // trajectory: started → pivots → now
    nowDoing?: string; // what they do daily + with whom
    whereHeading?: string; // where they think the role is going next
    advice?: string; // what they wish they'd known at the start
    publisher?: string;
    url?: string;
  }>;
};
export type CtaContent = CardBase & {
  body?: string;
  button?: string;
  resources?: Array<{ label: string; url: string; note?: string }>;
};
export type FutureOutlookContent = CardBase & {
  growthRate?: string;
  growthLabel?: string;
  timeline?: Array<{ year?: string; event: string }>;
  demandSignal?: string;
  risk?: string;
};
export type SourcesContent = CardBase & {
  items?: Array<{ ref: number; title: string; publisher?: string; url: string }>;
};
export type CareerSurvivalContent = CardBase & {
  metrics?: {
    demand_growth?: number | null;
    grad_employment_pct?: number | null;
    saturation_level?: number | null;
    progression_difficulty?: number | null;
    salary_floor?: number | null;
    salary_ceiling?: number | null;
  };
  global_metrics?: {
    demand_growth?: number | null;
    grad_employment_pct?: number | null;
    saturation_level?: number | null;
    progression_difficulty?: number | null;
    salary_floor?: number | null;
    salary_ceiling?: number | null;
  };
  metric_details?: Record<string, { th?: string; en?: string; source?: string; source_url?: string }>;
  global_metric_details?: Record<string, { th?: string; en?: string; source?: string; source_url?: string }>;
  tier?: string;
  reasoning?: string;
};

// ── shared frame ─────────────────────────────────────────────────────────────

type RadarInlineEditor = {
  onChange: (path: string[], value: unknown) => void;
};

export const RadarInlineEditorContext = createContext<RadarInlineEditor | null>(null);

function EditableText({
  value,
  field,
  className,
  style,
  valueType = "string",
  onValueChange,
}: {
  value: string;
  field: string | string[];
  className: string;
  style?: React.CSSProperties;
  valueType?: "string" | "number";
  onValueChange?: (value: string) => void;
}) {
  const editor = useContext(RadarInlineEditorContext);
  const path = Array.isArray(field) ? field : [field];
  const label = path.join(".");
  if (!editor) return <span className={className} style={style}>{value}</span>;

  return (
    <span
      className={`${className} radar-inline-edit`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={`Edit ${label}`}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      onBlur={(event) => {
        const nextValue = event.currentTarget.textContent?.trim() ?? "";
        if (onValueChange) {
          onValueChange(nextValue);
          return;
        }
        editor.onChange(
          path,
          valueType === "number" ? Number(nextValue) : nextValue
        );
      }}
    >
      {value}
    </span>
  );
}

function CardFrame({
  eyebrow,
  title,
  accent,
  children,
  wide = false,
}: {
  eyebrow?: string;
  title?: string;
  accent: string;
  children?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`w-full ${wide ? "max-w-6xl" : "max-w-xl"} mx-auto flex flex-col gap-5`}>
      {eyebrow && (
        <EditableText
          value={eyebrow}
          field="eyebrow"
          className="rc-eyebrow text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: accent }}
        />
      )}
      {title && (
        <h2>
          <EditableText
            value={title}
            field="title"
            className="rc-title block text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.1]"
          />
        </h2>
      )}
      <div className="rc-content flex flex-col gap-5">
        {children}
      </div>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${className}`}>
      {children}
    </div>
  );
}

// ── per-kind renderers ───────────────────────────────────────────────────────

function HookCard({
  c,
  accent,
  fieldNameTh,
  fieldNameEn,
}: {
  c: HookContent;
  accent: string;
  fieldNameTh?: string;
  fieldNameEn?: string;
}) {
  const thaiTitle = fieldNameTh || c.eyebrow;
  const englishTitle = fieldNameEn || c.title;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      {thaiTitle && (
        <p
          className="rc-eyebrow font-radar-thai text-lg font-medium leading-tight sm:text-xl"
          style={{ color: accent }}
        >
          {thaiTitle}
        </p>
      )}
      {englishTitle && (
        <h1 className="rc-title font-radar-title text-5xl font-normal leading-[0.9] tracking-normal text-white sm:text-7xl">
          {englishTitle}
        </h1>
      )}
      <div className="rc-content flex flex-col gap-5">
      {c.stat && (
        <div className="flex items-baseline gap-3">
          <span className="text-4xl sm:text-5xl font-extrabold" style={{ color: accent }}>
            <EditableText value={c.stat} field="stat" className="inline" />
          </span>
          {c.statLabel && (
            <EditableText value={c.statLabel} field="statLabel" className="text-sm text-neutral-400" />
          )}
        </div>
      )}
      {c.body && (
        <p>
          <EditableText value={c.body} field="body" className="block text-neutral-300 text-base leading-relaxed" />
        </p>
      )}
      </div>
    </div>
  );
}

function FantasyRealityCard({ c, accent }: { c: FantasyRealityContent; accent: string }) {
  const { onInteract } = useRadarInteract();
  return (
    <section className="fantasy-reality-page" style={{ "--radar-accent": accent } as CSSProperties}>
      <div className="fantasy-reality-sheet" onClick={() => onInteract?.("fantasy:flip")}>
        <article className="fantasy-reality-panel fantasy-reality-panel--fantasy rc-panel-left">
          <div className="fantasy-reality-panel__head">
            <div>
              <p>Fantasy</p>
              <small>ภาพจำก่อนลงมือจริง</small>
            </div>
          </div>
          {c.fantasy && (
            <EditableText
              value={c.fantasy}
              field="fantasy"
              className="fantasy-reality-copy"
            />
          )}
        </article>

        <div className="fantasy-reality-divider" aria-hidden="true">
          <span>VS</span>
        </div>

        <article className="fantasy-reality-panel fantasy-reality-panel--reality rc-panel-right">
          <div className="fantasy-reality-panel__head">
            <div>
              <p>Reality</p>
              <small>สิ่งที่เจอในงานจริง</small>
            </div>
          </div>
          {c.reality && (
            <EditableText
              value={c.reality}
              field="reality"
              className="fantasy-reality-copy"
            />
          )}
        </article>
      </div>
    </section>
  );
}

function isSkillsText(c: TextContent): boolean {
  return c.presentation === "skills" || /ทักษะ|skill/i.test(`${c.eyebrow ?? ""} ${c.title ?? ""}`);
}

function isStartText(c: TextContent): boolean {
  return c.presentation === "startCarousel" || /เริ่ม|start|มหาวิทยาลัย/i.test(`${c.eyebrow ?? ""} ${c.title ?? ""}`);
}

function SkillsTextCard({ c, accent }: { c: TextContent; accent: string }) {
  const editor = useContext(RadarInlineEditorContext);
  const items = (
    c.skills?.map(({ title, description = "" }) => ({ title, description }))
      ?? parseRadarListItems(c.body)
  ).slice(0, 8);
  const updateLegacyItem = (
    index: number,
    key: "title" | "description",
    value: string
  ) => {
    const next = items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: value } : item
    );
    editor?.onChange(
      ["body"],
      next
        .map((item) =>
          item.description ? `${item.title}: ${item.description}` : item.title
        )
        .join("\n")
    );
  };

  return (
    <CardFrame eyebrow={c.eyebrow} title={c.title} accent={accent} wide>
      <div className="radar-skills-grid grid gap-2 sm:grid-cols-2">
        {items.map((item, index) => (
          <details
            key={`${item.title}-${index}`}
            open={editor ? true : undefined}
            className="radar-skill-item group rounded-xl border border-white/10 bg-white/[0.03]"
          >
            <summary className="radar-skill-summary flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2">
              <span
                className="radar-skill-number flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-neutral-950"
                style={{ background: accent }}
              >
                {index + 1}
              </span>
              {c.skills ? (
                <EditableText
                  value={item.title}
                  field={["skills", String(index), "title"]}
                  className="radar-skill-title min-w-0 flex-1 font-semibold text-white"
                />
              ) : (
                <EditableText
                  value={item.title}
                  field="body"
                  className="radar-skill-title min-w-0 flex-1 font-semibold text-white"
                  onValueChange={(value) => updateLegacyItem(index, "title", value)}
                />
              )}
              <span className="radar-expand-indicator group-open:rotate-180" aria-hidden="true">
                <ChevronDown />
              </span>
            </summary>
            {item.description && (
              <p className="radar-skill-description px-4 pb-4 pl-16 text-sm leading-relaxed text-neutral-400">
                {c.skills ? (
                  <EditableText
                    value={item.description}
                    field={["skills", String(index), "description"]}
                    className="block"
                  />
                ) : (
                  <EditableText
                    value={item.description}
                    field="body"
                    className="block"
                    onValueChange={(value) =>
                      updateLegacyItem(index, "description", value)
                    }
                  />
                )}
              </p>
            )}
          </details>
        ))}
      </div>
    </CardFrame>
  );
}

function StartCarouselTextCard({
  c,
  accent,
  onIntent,
}: {
  c: TextContent;
  accent: string;
  onIntent?: RadarIntentHandler;
}) {
  const editor = useContext(RadarInlineEditorContext);
  const trackRef = useRef<HTMLDivElement>(null);
  const [interestedRecorded, setInterestedRecorded] = useState<Set<number>>(new Set());
  const [notInterestedRecorded, setNotInterestedRecorded] = useState<Set<number>>(new Set());
  const parsed = parseRadarListItems(c.body);
  const options: NonNullable<TextContent["options"]> = c.options ?? parsed.map((item) => ({
    title: item.title,
    description: item.description,
    type: "ลองทำ",
    cta: "สนใจวิธีนี้",
  }));
  const updateLegacyOption = (
    index: number,
    key: "title" | "description",
    value: string
  ) => {
    const next = parsed.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: value } : item
    );
    editor?.onChange(
      ["body"],
      next
        .map((item) =>
          item.description ? `${item.title}: ${item.description}` : item.title
        )
        .join("\n")
    );
  };

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * Math.min(track.clientWidth * 0.82, 360),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const recordInterested = (index: number) => {
    onIntent?.(`start-option-${index + 1}`, "interested", "start-option");
    setInterestedRecorded((current) => new Set(current).add(index));
  };

  const recordNotInterested = (index: number) => {
    onIntent?.(`start-option-${index + 1}`, "not-interested", "start-option");
    setNotInterestedRecorded((current) => new Set(current).add(index));
  };

  return (
    <CardFrame eyebrow={c.eyebrow} title={c.title} accent={accent}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-400">ปัดซ้ายเพื่อดูวิธีเริ่มแบบอื่น</p>
        <div className="hidden gap-1 sm:flex">
          <button type="button" onClick={() => move(-1)} aria-label="ตัวเลือกก่อนหน้า" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white hover:bg-white/5">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => move(1)} aria-label="ตัวเลือกถัดไป" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white hover:bg-white/5">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div ref={trackRef} className="radar-horizontal-carousel -mx-6 flex gap-3 overflow-x-auto px-6 pb-3">
        {options.map((option, index) => {
          const isInterested = interestedRecorded.has(index);
          const isNotInterested = notInterestedRecorded.has(index);
          const anyRecorded = isInterested || isNotInterested;
          return (
            <article key={`${option.title}-${index}`} className="w-[82vw] max-w-[320px] shrink-0 snap-center rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
                {c.options && option.type ? (
                  <EditableText
                    value={option.type}
                    field={["options", String(index), "type"]}
                    className="inline"
                  />
                ) : (
                  option.type ?? `ทางเลือก ${index + 1}`
                )}
              </span>
              <h3 className="mt-2">
                {c.options ? (
                  <EditableText
                    value={option.title}
                    field={["options", String(index), "title"]}
                    className="block text-xl font-bold text-white"
                  />
                ) : (
                  <EditableText
                    value={option.title}
                    field="body"
                    className="block text-xl font-bold text-white"
                    onValueChange={(value) => updateLegacyOption(index, "title", value)}
                  />
                )}
              </h3>
              {option.description && (
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-400">
                  {c.options ? (
                    <EditableText
                      value={option.description}
                      field={["options", String(index), "description"]}
                      className="block"
                    />
                  ) : (
                    <EditableText
                      value={option.description}
                      field="body"
                      className="block"
                      onValueChange={(value) =>
                        updateLegacyOption(index, "description", value)
                      }
                    />
                  )}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-500">
                {option.duration && (
                  <EditableText
                    value={option.duration}
                    field={["options", String(index), "duration"]}
                    className="inline"
                  />
                )}
                {option.cost && (
                  <span>
                    ·{" "}
                    <EditableText
                      value={option.cost}
                      field={["options", String(index), "cost"]}
                      className="inline"
                    />
                  </span>
                )}
              </div>
              <div className="mt-5 grid gap-2">
                {option.url && (
                  <a href={option.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/10 text-sm font-semibold text-white">
                    เปิดดู <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={anyRecorded}
                    onClick={() => recordInterested(index)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-neutral-950 disabled:bg-white/10 disabled:text-white/60"
                    style={isInterested ? undefined : { background: accent }}
                  >
                    {isInterested ? (
                      <><Check className="h-4 w-4" /> สนใจแล้ว</>
                    ) : c.options && option.cta ? (
                      <EditableText
                        value={option.cta}
                        field={["options", String(index), "cta"]}
                        className="inline"
                      />
                    ) : (
                      option.cta ?? "สนใจวิธีนี้"
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={anyRecorded}
                    onClick={() => recordNotInterested(index)}
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium text-neutral-400 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isNotInterested ? "บันทึกแล้ว" : "ไม่สนใจลอง"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="flex justify-center gap-1.5" aria-hidden="true">
        {options.map((_, index) => (
          <span key={index} className="h-1.5 w-5 rounded-full bg-white/15" />
        ))}
      </div>
    </CardFrame>
  );
}

function TextCard({
  c,
  accent,
  onIntent,
}: {
  c: TextContent;
  accent: string;
  onIntent?: RadarIntentHandler;
}) {
  if (isSkillsText(c)) return <SkillsTextCard c={c} accent={accent} />;
  if (isStartText(c)) return <StartCarouselTextCard c={c} accent={accent} onIntent={onIntent} />;

  return (
    <CardFrame eyebrow={c.eyebrow} title={c.title} accent={accent}>
      {c.body && (
        <p>
          <EditableText
            value={Array.isArray(c.body) ? c.body.join("\n") : c.body}
            field="body"
            className="block text-neutral-300 text-base leading-relaxed whitespace-pre-line"
          />
        </p>
      )}
    </CardFrame>
  );
}

function ListCard({ c, accent }: { c: ListContent; accent: string }) {
  return (
    <CardFrame eyebrow={c.eyebrow} title={c.title} accent={accent}>
      <ul className="flex flex-col gap-2">
        {(c.items ?? []).map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check className="h-4 w-4 mt-1 shrink-0" style={{ color: accent }} />
            <EditableText
              value={item}
              field={["items", String(i)]}
              className="text-neutral-200 text-base"
            />
          </li>
        ))}
      </ul>
    </CardFrame>
  );
}

function JobsCard({ c, accent }: { c: JobsContent; accent: string }) {
  return (
    <CardFrame eyebrow={c.eyebrow} title={c.title ?? "Jobs"} accent={accent}>
      <div className="flex flex-col gap-3">
        {(c.jobs ?? []).map((job, i) => (
          <Panel key={i}>
            <div className="flex items-start justify-between gap-3">
              <EditableText
                value={job.title}
                field={["jobs", String(i), "title"]}
                className="text-white font-semibold"
              />
              {job.salary && (
                <span className="text-sm font-bold shrink-0" style={{ color: accent }}>
                  <EditableText value={job.salary} field={["jobs", String(i), "salary"]} className="inline" />
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-neutral-400">
              {job.demand && (
                <span>
                  Demand:{" "}
                  <EditableText value={job.demand} field={["jobs", String(i), "demand"]} className="inline" />
                </span>
              )}
              {job.growth && (
                <span style={{ color: accent }}>
                  <EditableText value={job.growth} field={["jobs", String(i), "growth"]} className="inline" /> growth
                </span>
              )}
            </div>
            {job.note && (
              <p className="mt-2">
                <EditableText
                  value={job.note}
                  field={["jobs", String(i), "note"]}
                  className="block text-neutral-400 text-sm leading-relaxed"
                />
              </p>
            )}
          </Panel>
        ))}
      </div>
    </CardFrame>
  );
}

function SalaryProgressionCard({ c, accent }: { c: SalaryProgressionContent; accent: string }) {
  const [currency, setCurrency] = useState<"USD" | "THB">("THB");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [introComplete, setIntroComplete] = useState(false);
  const [hasOpenedDetail, setHasOpenedDetail] = useState(false);
  const hasThb = Array.isArray(c.levels_thb) && c.levels_thb.length > 0;
  const activeLevels = currency === "THB" && hasThb ? c.levels_thb : c.levels;
  const levels = activeLevels ?? [];
  const fieldRoot = currency === "THB" && hasThb ? "levels_thb" : "levels";
  const displayedLevels = levels.slice(0, 4);
  const selected = selectedLevel === null ? null : displayedLevels[selectedLevel] ?? null;
  const selectedIndex = selectedLevel ?? 0;
  const chessPieces =
    displayedLevels.length === 3
      ? SALARY_CHESS_PIECES.filter((piece) => piece.key !== "knight")
      : SALARY_CHESS_PIECES;
  const completionAnimationName = chessPieces.some((piece) => piece.key === "queen")
    ? "salary-queen-image-reveal"
    : chessPieces.some((piece) => piece.key === "knight")
      ? "salary-knight-l-image"
      : chessPieces.some((piece) => piece.key === "rook")
        ? "salary-rook-crash-image"
        : null;
  const safariImageHue = `${Math.round(getHexHue(accent) - 45)}deg`;
  const { onInteract } = useRadarInteract();

  const changeCurrency = (nextCurrency: "USD" | "THB") => {
    if (nextCurrency !== currency) onInteract?.("salary:currency");
    setCurrency(nextCurrency);
    setSelectedLevel(null);
    setIntroComplete(false);
    setHasOpenedDetail(false);
  };

  const handleBoardAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.animationName === completionAnimationName) {
      setIntroComplete(true);
    }
  };

  return (
    <div className="salary-progression mx-auto flex w-full max-w-6xl flex-col gap-4">
      {!selected && (
        <header className="radar-standard-heading">
          <h2>Salary</h2>
          <p>ฐานเงินเดือน</p>
        </header>
      )}
      {hasThb && (
        <div className="flex rounded-full border border-white/10 bg-white/5 overflow-hidden self-start">
          <button
            onClick={() => changeCurrency("USD")}
            className={`text-[11px] font-medium px-2.5 py-0.5 transition-colors inline-flex items-center gap-1 ${
              currency === "USD" ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            🇺🇸 USD
          </button>
          <button
            onClick={() => changeCurrency("THB")}
            className={`text-[11px] font-medium px-2.5 py-0.5 transition-colors inline-flex items-center gap-1 ${
              currency === "THB" ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            🇹🇭 THB
          </button>
        </div>
      )}
      <div
        className="salary-chess-scene"
        style={
          {
            "--salary-chess-accent": accent,
            "--salary-chess-image-hue": safariImageHue,
          } as CSSProperties
        }
      >
          {selected ? (
            <div className="salary-chess-detail">
              <button
                type="button"
                className="salary-chess-back"
                onClick={() => setSelectedLevel(null)}
                aria-label="Back to salary levels"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="salary-chess-detail-copy">
                <EditableText
                  value={selected.level}
                  field={[fieldRoot, String(selectedIndex), "level"]}
                  className="salary-chess-detail-title"
                />
                <div className="salary-chess-detail-meta">
                  {selected.salary && (
                    <EditableText
                      value={formatSalaryDisplay(selected.salary)}
                      field={[fieldRoot, String(selectedIndex), "salary"]}
                      className="salary-chess-detail-salary"
                    />
                  )}
                  {selected.years && (
                    <span className="salary-chess-detail-years">
                      <EditableText
                        value={selected.years}
                        field={[fieldRoot, String(selectedIndex), "years"]}
                        className="inline"
                      />
                      {needsYearSuffix(selected.years) ? " years" : ""}
                    </span>
                  )}
                </div>
                <EditableText
                  value={selected.note || "Tap to add more details for this level."}
                  field={[fieldRoot, String(selectedIndex), "note"]}
                  className="salary-chess-detail-note"
                />
              </div>
              <SalaryChessPieceImage
                className={`salary-chess-detail-piece salary-chess-detail-piece--${chessPieces[selectedIndex]?.key ?? "pawn"}`}
                src={chessPieces[selectedIndex]?.src ?? SALARY_CHESS_PIECES[0].src}
              />
            </div>
          ) : (
            <div
              className={`salary-chess-board salary-chess-board--${displayedLevels.length || 0} ${
                introComplete ? "salary-chess-board--intro-complete" : ""
              } ${hasOpenedDetail ? "salary-chess-board--visited-detail" : ""}`}
              aria-label="Salary progression chess pieces"
              onAnimationEnd={handleBoardAnimationEnd}
            >
              {displayedLevels.map((lvl, i) => {
                const piece = chessPieces[i] ?? SALARY_CHESS_PIECES[SALARY_CHESS_PIECES.length - 1];
                return (
                  <button
                    type="button"
                    key={`${lvl.level}-${i}`}
                    className={`salary-chess-level salary-chess-level--${piece.key}`}
                    onClick={() => {
                      setIntroComplete(true);
                      setHasOpenedDetail(true);
                      setSelectedLevel(i);
                      onInteract?.("salary:level");
                    }}
                    aria-label={`View details for ${lvl.level}`}
                  >
                    <SalaryChessPieceImage
                      className="salary-chess-piece"
                      src={piece.src}
                    />
                    <span className="salary-chess-label">
                      <EditableText
                        value={lvl.level}
                        field={[fieldRoot, String(i), "level"]}
                        className="salary-chess-title"
                      />
                      {lvl.salary && (
                        <EditableText
                          value={formatSalaryDisplay(lvl.salary)}
                          field={[fieldRoot, String(i), "salary"]}
                          className="salary-chess-salary"
                        />
                      )}
                      {lvl.years && (
                        <span className="salary-chess-years">
                          <EditableText
                            value={lvl.years}
                            field={[fieldRoot, String(i), "years"]}
                            className="inline"
                          />
                          {needsYearSuffix(lvl.years) ? " years" : ""}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
              {displayedLevels.length === 0 && (
                <div className="salary-chess-empty">
                  No salary levels yet.
                </div>
              )}
            </div>
          )}
      </div>
      {!selected && displayedLevels.length > 0 && (
        <p className="salary-chess-hint">
          กดตัวหมากเพื่ออ่านข้อมูลเพิ่มเติมได้
        </p>
      )}
    </div>
  );
}

const SALARY_CHESS_PIECES = [
  { key: "pawn", src: "/images/experimental-pawn.svg" },
  { key: "knight", src: "/images/experimental-piece-131.svg" },
  { key: "rook", src: "/images/experimental-piece-130.png" },
  { key: "queen", src: "/images/experimental-piece-129.svg" },
] as const;

function needsYearSuffix(value: string) {
  return !/(yr|year|ปี)/i.test(value);
}

function getHexHue(value: string) {
  const compact = value.trim().replace(/^#/, "");
  const hex =
    compact.length === 3
      ? compact
          .split("")
          .map((digit) => `${digit}${digit}`)
          .join("")
      : compact;

  if (!/^[\da-f]{6}$/i.test(hex)) return 105;

  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (delta === 0) return 0;

  const hue =
    max === red
      ? ((green - blue) / delta) % 6
      : max === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;

  return (hue * 60 + 360) % 360;
}

function formatSalaryDisplay(value: string) {
  return value.replace(/^ประมาณ\s*/i, "");
}

function SalaryChessPieceImage({ className, src }: { className: string; src: string }) {
  return (
    <span
      className={className}
      style={{ "--salary-chess-piece-src": `url(${src})` } as CSSProperties}
      aria-hidden="true"
    >
      <span className="salary-chess-intro-pawn" aria-hidden="true">
        <img src={SALARY_CHESS_PIECES[0].src} alt="" draggable={false} />
      </span>
      <span className="salary-chess-piece-sheen" aria-hidden="true" />
      <img className="salary-chess-piece-image" src={src} alt="" draggable={false} />
    </span>
  );
}

function GrowthCompareCard({ c, accent }: { c: GrowthCompareContent; accent: string }) {
  const items = c.items ?? [];
  const max = Math.max(1, ...items.map((it) => it.growth));
  return (
    <CardFrame eyebrow={c.eyebrow} title={c.title} accent={accent}>
      <div className="flex flex-col gap-3">
        {items.map((it, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className={it.self ? "text-white font-semibold" : "text-neutral-400"}>
                <EditableText value={it.label} field={["items", String(i), "label"]} className="inline" />
              </span>
              <span className="text-neutral-300">
                +<EditableText
                  value={String(it.growth)}
                  field={["items", String(i), "growth"]}
                  className="inline"
                  valueType="number"
                />
                {c.unit ? ` ${c.unit}` : "%"}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(it.growth / max) * 100}%`,
                  background: it.self ? accent : "rgba(255,255,255,0.25)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </CardFrame>
  );
}

function aiRiskChartColor(percent: number): string {
  if (percent >= 80) return "#ef4444";
  if (percent >= 60) return "#f97316";
  if (percent >= 50) return "#facc15";
  if (percent >= 40) return "#a3e635";
  if (percent >= 30) return "#22c55e";
  if (percent >= 20) return "#14b8a6";
  return "#38bdf8";
}

function aiRiskLabel(score: number): string {
  return getAiImpactLabel(score);
}

function AiImpactCard({ c, accent }: { c: AiImpactContent; accent: string }) {
  const [activePanel, setActivePanel] = useState<"augmented" | "automated">("augmented");
  const { onInteract } = useRadarInteract();
  const showPanel = (panel: "augmented" | "automated") => {
    if (panel !== activePanel) onInteract?.("ai:detail");
    setActivePanel(panel);
  };
  const score = c.ai_risk_score ?? null;
  const percent = score === null ? 0 : Math.round(Math.max(0, Math.min(score, 10)) * 10);
  const chartColor = aiRiskChartColor(percent);
  const chartStyle = {
    "--ai-impact-color": chartColor,
    "--ai-impact-percent": `${percent}%`,
    "--ai-impact-accent": accent,
    "--ai-impact-vector-green": accent,
  } as CSSProperties;
  const augmented = c.augmented ?? [];
  const automated = c.automated ?? [];
  const visibleItems = activePanel === "augmented" ? augmented : automated;
  const activeTitle = activePanel === "augmented" ? "AI ช่วยไรได้บ้าง?" : "AI แทนไรได้บ้าง?";

  return (
    <div className="ai-pixel-page" style={chartStyle}>
      <header className="ai-pixel-heading radar-standard-heading">
        <h2 className="ai-pixel-title" aria-label="AI Impact">
          <span className="ai-pixel-title-ai" data-text="AI">AI</span>
          <span> Impact</span>
        </h2>
        <EditableText
          value="โดน AI กระทบเยอะแค่ไหน"
          field="eyebrow"
          className="ai-pixel-subtitle"
        />
      </header>

      <div className="ai-pixel-meter" aria-label={`AI replace risk ${score ?? 0} out of 10`}>
        {score !== null && (
          <p className="ai-pixel-score">
            {score}/10 {aiRiskLabel(score)}
            <span className="ml-2 align-middle text-[11px] font-normal opacity-70">(ทีมเราประเมิน)</span>
          </p>
        )}
        <PixelHelperIcon className="ai-pixel-vector ai-pixel-vector--helper" />
        <div className="ai-pixel-bar" aria-hidden="true">
          <span className="ai-pixel-bar-fill" />
        </div>
        <PixelMonsterIcon className="ai-pixel-vector ai-pixel-vector--monster" />
      </div>

      {c.verdict && (
        <p className="ai-pixel-verdict">
          <EditableText value={c.verdict} field="verdict" className="block" />
        </p>
      )}

      <div className="ai-pixel-actions" role="tablist" aria-label="รายละเอียดผลกระทบจาก AI">
        <button
          type="button"
          className="ai-pixel-toggle"
          role="tab"
          aria-selected={activePanel === "augmented"}
          aria-controls="ai-impact-panel"
          onClick={() => showPanel("augmented")}
        >
          AI ช่วยไรได้บ้าง?
        </button>
        <button
          type="button"
          className="ai-pixel-toggle"
          role="tab"
          aria-selected={activePanel === "automated"}
          aria-controls="ai-impact-panel"
          onClick={() => showPanel("automated")}
        >
          AI แทนไรได้บ้าง?
        </button>
      </div>

      <section
        id="ai-impact-panel"
        className="ai-pixel-panel"
        role="tabpanel"
        aria-label={activeTitle}
      >
        <ul>
          {visibleItems.map((t, i) => (
            <li key={`${activePanel}-${i}`}>
              <EditableText
                value={t}
                field={[activePanel, String(i)]}
                className="inline"
              />
            </li>
          ))}
        </ul>
      </section>
      </div>
  );
}

function PixelHelperIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 102 117" fill="none" aria-hidden="true">
      <path d="M21.8438 65.5312H29.125V72.8125H72.8125V65.5312H80.0938V58.25H94.6562V72.8125H80.0938V87.375H94.6562V94.6562H87.375V109.219H80.0938V116.5H58.25V109.219H43.6875V116.5H21.8438V109.219H14.5625V94.6562H7.28125V87.375H21.8438V72.8125H7.28125V58.25H21.8438V65.5312ZM7.28125 87.375H0V72.8125H7.28125V87.375ZM101.938 87.375H94.6562V72.8125H101.938V87.375ZM7.28125 58.25H0V43.6875H7.28125V58.25ZM101.938 58.25H94.6562V43.6875H101.938V58.25ZM72.8125 7.28125H80.0938V14.5625H87.375V29.125H94.6562V43.6875H87.375V50.9688H80.0938V36.4062H72.8125V43.6875H29.125V36.4062H21.8438V50.9688H14.5625V43.6875H7.28125V29.125H14.5625V14.5625H21.8438V7.28125H29.125V0H72.8125V7.28125Z" fill="black" />
      <path d="M29.125 7.28125C43.5419 7.28125 57.9588 7.28125 72.8125 7.28125C72.8125 9.68406 72.8125 12.0869 72.8125 14.5625C75.2153 14.5625 77.6181 14.5625 80.0938 14.5625C80.0938 19.3681 80.0938 24.1737 80.0938 29.125C77.6909 29.125 75.2881 29.125 72.8125 29.125C72.8125 31.5278 72.8125 33.9306 72.8125 36.4062C58.3956 36.4062 43.9787 36.4062 29.125 36.4062C29.125 34.0034 29.125 31.6006 29.125 29.125C26.7222 29.125 24.3194 29.125 21.8438 29.125C21.8438 24.3194 21.8438 19.5138 21.8438 14.5625C24.2466 14.5625 26.6494 14.5625 29.125 14.5625C29.125 12.1597 29.125 9.75688 29.125 7.28125Z" fill="var(--ai-impact-vector-green, #487B47)" />
      <path d="M29.125 87.375C33.9306 87.375 38.7362 87.375 43.6875 87.375C43.6875 89.7778 43.6875 92.1806 43.6875 94.6562C38.8819 94.6562 34.0763 94.6562 29.125 94.6562C29.125 92.2534 29.125 89.8506 29.125 87.375ZM58.25 87.375C63.0556 87.375 67.8612 87.375 72.8125 87.375C72.8125 89.7778 72.8125 92.1806 72.8125 94.6562C68.0069 94.6562 63.2013 94.6562 58.25 94.6562C58.25 92.2534 58.25 89.8506 58.25 87.375ZM21.8438 94.6562C24.2466 94.6562 26.6494 94.6562 29.125 94.6562C29.125 97.0591 29.125 99.4619 29.125 101.938C33.9306 101.938 38.7362 101.938 43.6875 101.938C43.6875 104.34 43.6875 106.743 43.6875 109.219C36.4791 109.219 29.2706 109.219 21.8438 109.219C21.8438 104.413 21.8438 99.6075 21.8438 94.6562ZM43.6875 94.6562C48.4931 94.6562 53.2987 94.6562 58.25 94.6562C58.25 97.0591 58.25 99.4619 58.25 101.938C53.4444 101.938 48.6388 101.938 43.6875 101.938C43.6875 99.5347 43.6875 97.1319 43.6875 94.6562ZM72.8125 94.6562C75.2153 94.6562 77.6181 94.6562 80.0938 94.6562C80.0938 99.4619 80.0938 104.267 80.0938 109.219C72.8853 109.219 65.6769 109.219 58.25 109.219C58.25 106.816 58.25 104.413 58.25 101.938C63.0556 101.938 67.8612 101.938 72.8125 101.938C72.8125 99.5347 72.8125 97.1319 72.8125 94.6562Z" fill="var(--ai-impact-vector-green, #487B47)" />
      <path d="M36.4062 29.125C46.0175 29.125 55.6287 29.125 65.5312 29.125C65.5312 31.5278 65.5312 33.9306 65.5312 36.4062C55.92 36.4062 46.3088 36.4062 36.4062 36.4062C36.4062 34.0034 36.4062 31.6006 36.4062 29.125Z" fill="#FEFEFE" />
      <path d="M43.6875 65.5312C48.4931 65.5312 53.2987 65.5312 58.25 65.5312C58.25 67.9341 58.25 70.3369 58.25 72.8125C53.4444 72.8125 48.6388 72.8125 43.6875 72.8125C43.6875 70.4097 43.6875 68.0069 43.6875 65.5312Z" fill="#BA5F61" />
      <path d="M72.8125 72.8125H58.25V65.5312H65.5312V50.9688H58.25V65.5312H43.6875V50.9688H36.4062V65.5312H43.6875V72.8125H29.125V65.5312H21.8438V58.25H7.28125V43.6875H14.5625V50.9688H21.8438V36.4062H29.125V43.6875H72.8125V36.4062H80.0938V50.9688H87.375V43.6875H94.6562V58.25H80.0938V65.5312H72.8125V72.8125Z" fill="white" />
      <path d="M7.28125 72.8125H21.8438V87.375H7.28125V72.8125Z" fill="white" />
      <path d="M80.0938 72.8125H94.6562V87.375H80.0938V72.8125Z" fill="white" />
      <path d="M58.25 50.9688C60.6528 50.9688 63.0556 50.9688 65.5312 50.9688C65.5312 55.7744 65.5312 60.58 65.5312 65.5312C63.1284 65.5312 60.7256 65.5312 58.25 65.5312C58.25 60.7256 58.25 55.92 58.25 50.9688Z" fill="black" />
      <path d="M36.4062 50.9688C38.8091 50.9688 41.2119 50.9688 43.6875 50.9688C43.6875 55.7744 43.6875 60.58 43.6875 65.5312C41.2847 65.5312 38.8819 65.5312 36.4062 65.5312C36.4062 60.7256 36.4062 55.92 36.4062 50.9688Z" fill="black" />
    </svg>
  );
}

function PixelMonsterIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 137 103" fill="none" aria-hidden="true">
      <path d="M44.1328 3.5V14.5889H55.2793V25.6787H81.7207V14.5889H92.8672V3.5H111.206V21.6846H99.9629V25.6787H111.206V36.8633H115.257V14.5889H133.5V66.1367H122.354V77.3213H111.206V81.3154H122.354V99.5H104.11V88.4111H92.8672V77.3213H44.1328V88.4111H32.8896V99.5H14.6465V81.3154H25.7939V77.3213H14.6465V66.1367H3.5V14.5889H21.7432V36.8633H25.7939V25.6787H37.0371V21.6846H25.7939V3.5H44.1328ZM88.8164 47.9521H92.8672V43.959H88.8164V47.9521ZM44.1328 47.9521H48.1836V43.959H44.1328V47.9521Z" fill="var(--ai-impact-vector-green, #487B47)" stroke="black" strokeWidth="7" />
    </svg>
  );
}

const COMPANY_MONOGRAMS: Record<string, string> = {
  "AIS": "AIS",
  "SCB": "SCB",
  "SCB (Siam Commercial Bank)": "SCB",
  "Bangkok Bank": "BBL",
  "PTT Global Chemical": "PTT GC",
  "DECODE Thailand": "DE",
  "Kasikornbank (KBank)": "KBank",
  "Digital Economy Promotion Agency (depa)": "depa",
  "Government agencies (e.g., NCSA Thailand)": "NCSA",
  "KBTG": "KBTG",
  "Shopee": "Shopee",
  "Central Group": "CENTRAL",
  "True Digital": "TRUE DIGITAL",
  "LINE MAN Wongnai": "LINE MAN\nWONGNAI",
  "Grab": "Grab",
};

const COMPANY_WORDMARK_COLORS: Record<string, string> = {
  "AIS": "#6b9822",
  "SCB": "#4e2a84",
  "SCB (Siam Commercial Bank)": "#4e2a84",
  "PTT Global Chemical": "#006ab6",
  "DECODE Thailand": "#202020",
  "Kasikornbank (KBank)": "#13854a",
  "Digital Economy Promotion Agency (depa)": "#6d4898",
  "Government agencies (e.g., NCSA Thailand)": "#173f68",
  "KBTG": "#18864b",
  "Shopee": "#ee4d2d",
  "Central Group": "#b21f2d",
  "True Digital": "#d71920",
  "LINE MAN Wongnai": "#00a950",
  "Grab": "#00b14f",
};

// Locally bundled high-resolution marks (public/images/company-logos/).
// Preferred over remote favicons, which are often low-res or missing entirely.
const COMPANY_LOGOS: Record<string, string> = {
  "SCB DataX": "/images/company-logos/scb-datax.jpg",
  "Bangkok Bank": "/images/company-logos/bangkok-bank.svg",
  "ttb": "/images/company-logos/ttb.svg",
  "True Corporation": "/images/company-logos/true-corporation.svg",
  "ETDA": "/images/company-logos/etda.png",
  "SCG": "/images/company-logos/scg.svg",
  "CP Axtra": "/images/company-logos/cp-axtra.svg",
  "Fujitsu Thailand": "/images/company-logos/fujitsu.svg",
  "MUI Robotics": "/images/company-logos/mui-robotics.png",
  "Agoda": "/images/company-logos/agoda.svg",
};

function companyLogoUrl(company: string): string | null {
  return COMPANY_LOGOS[company] ?? null;
}

function CompanyLogo({ company, logoUrl }: { company: string; logoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!logoUrl || failed) {
    return (
      <span
        className="market-ticket__wordmark"
        style={{ color: COMPANY_WORDMARK_COLORS[company] ?? "#352c28" }}
        aria-hidden="true"
      >
        {COMPANY_MONOGRAMS[company] ?? company.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  // Company marks are local assets or remote favicons; native img avoids coupling to Next image domains.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={logoUrl} alt={`${company} logo`} loading="lazy" onError={() => setFailed(true)} />;
}

function MarketThailandCard({ c, accent }: { c: MarketThailandContent; accent: string }) {
  const access = c.job_access;
  const accessScore = access
    ? Math.max(0, Math.min(100, Math.round(access.score)))
    : null;
  // `confidence` is an editorial-quality flag, not student-facing information —
  // it stays in the data and out of the card.
  const factors = access ? [
    { key: "demand_score", label: "ความต้องการจ้าง", value: access.demand_score, positive: true },
    { key: "competition_score", label: "การแข่งขัน", value: access.competition_score, positive: false },
    { key: "entry_barrier_score", label: "ด่านทักษะแรกเข้า", value: access.entry_barrier_score, positive: false },
  ].filter((factor) => factor.value != null) : [];

  return (
    <div className="market-section-frame">
      <header className="market-section-heading">
        <h2>Competition?</h2>
        <p>จะหางานนี้ได้ไหม?</p>
      </header>
      <div className="rc-content flex flex-col gap-5">
      {access && accessScore !== null ? (
        <div className="market-ticket">
          <div className="market-ticket__paper">
            <div className="market-ticket__main">
            <div className="market-ticket__score-row">
              <div>
                <p className="market-ticket__kicker">คะแนนโอกาสหางาน (ทีมเราประเมิน)</p>
                <div className="market-ticket__score">
                  <EditableText value={String(accessScore)} field={["job_access", "score"]} className="inline" valueType="number" />
                  <span>/100</span>
                </div>
              </div>
              <div className="market-ticket__verdict">
                <strong>{getJobAccessLabel(accessScore)}</strong>
                <span>ยิ่งคะแนนสูง ยิ่งหางานได้ง่าย</span>
              </div>
            </div>

            <div className="market-ticket__metrics">
              {factors.map((factor) => {
                const value = Math.max(0, Math.min(10, Number(factor.value)));
                // Three bars, two directions. Tone + fill + an always-on caption
                // carry the polarity so "8/10" is never read as good by default.
                const tone = factor.positive ? "good" : "caution";
                return (
                  <div
                    key={factor.key}
                    className={`market-ticket__metric market-ticket__metric--${tone}`}
                    style={{ "--metric-fill": `${value * 10}%` } as CSSProperties}
                  >
                    <span>{factor.label}</span>
                    <strong>{value}/10</strong>
                    <span className="market-ticket__metric-bar" aria-hidden="true" />
                    <small>
                      {factor.positive ? "ยิ่งสูงยิ่งดี" : "ยิ่งสูงยิ่งหางานยาก"}
                    </small>
                  </div>
                );
              })}
            </div>

            {c.body && (
              <p className="market-ticket__note">
                <EditableText value={c.body} field="body" className="block" />
              </p>
            )}
            </div>

            <aside className="market-ticket__companies" aria-label="ตัวอย่างบริษัทที่จ้าง">
              <p>ตัวอย่างบริษัทที่จ้าง</p>
              <div className="market-ticket__logo-grid">
                {(c.companies ?? []).slice(0, 9).map((company) => (
                  <div className="market-ticket__logo" key={company} title={company}>
                    <CompanyLogo company={company} logoUrl={companyLogoUrl(company)} />
                    <span className="sr-only">{company}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      ) : c.openings ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-medium text-neutral-400">
            ประกาศงานที่พบในไทย
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold" style={{ color: accent }}>
              <EditableText value={c.openings} field="openings" className="inline" />
            </span>
            <span className="text-sm text-neutral-300">ตำแหน่ง</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-neutral-500">
            จำนวนประกาศรับสมัครโดยประมาณ ณ เวลาที่เก็บข้อมูล
            จากแหล่งอ้างอิงของหน้านี้ ไม่ใช่จำนวนงานทั้งหมดในตลาด
          </p>
          <p className="mt-2 text-xs font-medium leading-relaxed text-neutral-300">
            แปลว่า: มีความต้องการจ้างงานให้เห็นชัด แต่ตัวเลขนี้เพียงอย่างเดียว
            ยังบอกไม่ได้ว่าสมัครง่ายหรือการแข่งขันสูงแค่ไหน
          </p>
        </div>
      ) : null}
      {c.body && !access && (
        <p>
          <EditableText value={c.body} field="body" className="block text-neutral-300 text-base leading-relaxed" />
        </p>
      )}
      {!access && c.companies && c.companies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {c.companies.map((co, i) => (
            <span
              key={i}
              className="text-xs rounded-full border border-white/10 bg-white/5 px-3 py-1 text-neutral-300"
            >
              <EditableText value={co} field={["companies", String(i)]} className="inline" />
            </span>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function DayInLifeCard({ c, accent }: { c: DayInLifeContent; accent: string }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const hasAnyTime = (c.steps ?? []).some((s) => s.time);

  return (
    <CardFrame eyebrow={c.eyebrow} title={c.title} accent={accent} wide>
      {hasAnyTime ? (
        /* Legacy time-based layout */
        <div className="flex flex-col">
          {(c.steps ?? []).map((s, i) => (
            <div key={i} className="flex gap-4 pb-4 last:pb-0">
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold tabular-nums" style={{ color: accent }}>
                  <EditableText value={s.time ?? ""} field={["steps", String(i), "time"]} className="inline" />
                </span>
                <span className="flex-1 w-px bg-white/10 mt-1" />
              </div>
              <p className="pb-1">
                <EditableText
                  value={s.label}
                  field={["steps", String(i), "label"]}
                  className="block text-neutral-200 text-base leading-relaxed"
                />
              </p>
            </div>
          ))}
        </div>
      ) : (
        /* Activity cards layout */
        <div className="grid gap-3 md:grid-cols-2">
          {(c.steps ?? []).map((s, i) => {
            const isOpen = expanded === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setExpanded(isOpen ? null : i)}
                className="text-left w-full rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 transition-all duration-200 hover:bg-white/[0.06] hover:border-white/15"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                    style={{ background: accent }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-neutral-200 text-[15px] leading-relaxed">{s.label}</p>
                    {s.detail && (
                      <div
                        className={`overflow-hidden transition-all duration-200 ${
                          isOpen ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"
                        }`}
                      >
                        <p className="text-neutral-400 text-sm leading-relaxed border-t border-white/5 pt-2">
                          {s.detail}
                        </p>
                      </div>
                    )}
                  </div>
                  {s.detail && (
                    <span
                      className={`radar-expand-indicator mt-0.5 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    >
                      <ChevronDown />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </CardFrame>
  );
}

const TIER_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  direct: { label: getEntryRouteLabel("direct"), bg: "bg-emerald-500/20", text: "text-emerald-400" },
  related: { label: getEntryRouteLabel("related"), bg: "bg-amber-500/20", text: "text-amber-400" },
  alternative: { label: getEntryRouteLabel("alternative"), bg: "bg-sky-500/20", text: "text-sky-400" },
};

function EntryRoutesCard({ c, accent }: { c: EntryRoutesContent; accent: string }) {
  const description = c.description?.trim();

  return (
    <CardFrame eyebrow={c.eyebrow} title={c.title ?? "มีเส้นทางไหนเข้าสู่อาชีพนี้ได้บ้าง?"} accent={accent} wide>
      {description && (
        <p className="entry-routes-description mb-2">
          <EditableText value={description} field="description" className="block text-neutral-400 text-sm leading-relaxed" />
        </p>
      )}
      <div className="entry-routes-grid grid gap-3 md:grid-cols-2">
        {(c.faculties ?? []).map((f, i) => {
          const style = TIER_STYLES[f.tier] ?? TIER_STYLES.related;
          return (
            <Panel key={i} className="entry-route-card">
              <div className="entry-route-card__heading flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
                <EditableText
                  value={f.name}
                  field={["faculties", String(i), "name"]}
                  className="text-white font-semibold text-base"
                />
              </div>
              {f.note && (
                <p className="entry-route-card__note mt-1">
                  <EditableText
                    value={f.note}
                    field={["faculties", String(i), "note"]}
                    className="block text-neutral-400 text-sm italic"
                  />
                </p>
              )}
            </Panel>
          );
        })}
      </div>
    </CardFrame>
  );
}

function RisksCard({ c, accent }: { c: RisksContent; accent: string }) {
  return (
    <CardFrame eyebrow={c.eyebrow} title={c.title ?? "Real talk"} accent={accent} wide>
      <ul className="grid gap-3 md:grid-cols-2">
        {(c.risks ?? []).map((r, i) => (
          <li key={i} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <span className="text-rose-400 mt-0.5 shrink-0">⚠</span>
            <EditableText
              value={r}
              field={["risks", String(i)]}
              className="text-neutral-200 text-base leading-relaxed"
            />
          </li>
        ))}
      </ul>
    </CardFrame>
  );
}

function RealPeopleCard({ c, accent }: { c: RealPeopleContent; accent: string }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <CardFrame eyebrow={c.eyebrow} title={c.title} accent={accent} wide>
      <div className="grid gap-3 md:grid-cols-2">
        {(c.people ?? []).map((p, i) => {
          const isExpanded = expanded.has(i);
          const hasMore =
            (p.path && p.path.length > 0) ||
            p.nowDoing ||
            p.whereHeading ||
            p.advice ||
            p.publisher ||
            p.url;

          return (
            <Panel key={i}>
              {/* header: image + name / role + salary chip */}
              <div className="flex items-start gap-3 mb-2">
                {p.imageUrl && (
                  <Image
                    src={p.imageUrl}
                    alt={p.name || "profile"}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover border border-white/10 shrink-0 bg-white/5"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {p.name && (
                        <EditableText
                          value={p.name}
                          field={["people", String(i), "name"]}
                          className="font-semibold text-white"
                        />
                      )}
                      {p.role && (
                        <p className="mt-0.5">
                          <EditableText
                            value={p.role}
                            field={["people", String(i), "role"]}
                            className="block text-xs text-neutral-400"
                          />
                        </p>
                      )}
                    </div>
                    {p.salary && (
                      <span
                        className="shrink-0 text-xs font-bold rounded-full px-2.5 py-1"
                        style={{ color: accent, background: `${accent}1a` }}
                      >
                        <EditableText
                          value={p.salary}
                          field={["people", String(i), "salary"]}
                          className="inline"
                        />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p>
                <EditableText
                  value={p.background}
                  field={["people", String(i), "background"]}
                  className="block text-neutral-200 text-base leading-relaxed"
                />
              </p>

              {/* expanded detail */}
              {isExpanded && (
                <div className="mt-3 flex flex-col gap-3">
                  {/* trajectory: started → pivots → now */}
                  {p.path && p.path.length > 0 && (
                    <div className="flex flex-col">
                      {p.path.map((step, j) => (
                        <div key={j} className="flex gap-3 pb-2.5 last:pb-0">
                          <div className="flex flex-col items-center">
                            <span
                              className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0"
                              style={{ background: accent }}
                            />
                            {j < p.path!.length - 1 && <span className="flex-1 w-px bg-white/10 mt-1" />}
                          </div>
                          <p className="text-neutral-300 text-sm leading-relaxed">
                            {step.year && (
                              <EditableText
                                value={step.year}
                                field={["people", String(i), "path", String(j), "year"]}
                                className="font-semibold tabular-nums mr-1.5"
                                style={{ color: accent }}
                              />
                            )}
                            <EditableText
                              value={step.label}
                              field={["people", String(i), "path", String(j), "label"]}
                              className="inline"
                            />
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {p.nowDoing && (
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      <span className="text-neutral-500">Now · </span>
                      <EditableText
                        value={p.nowDoing}
                        field={["people", String(i), "nowDoing"]}
                        className="inline"
                      />
                    </p>
                  )}
                  {p.whereHeading && (
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      <span className="text-neutral-500">Heading · </span>
                      <EditableText
                        value={p.whereHeading}
                        field={["people", String(i), "whereHeading"]}
                        className="inline"
                      />
                    </p>
                  )}
                  {p.advice && (
                    <p
                      className="text-sm italic leading-relaxed border-l-2 pl-3"
                      style={{ borderColor: accent, color: "rgb(229 229 229)" }}
                    >
                      “
                      <EditableText
                        value={p.advice}
                        field={["people", String(i), "advice"]}
                        className="inline"
                      />
                      ”
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    {p.publisher && (
                      <EditableText
                        value={p.publisher}
                        field={["people", String(i), "publisher"]}
                        className="inline"
                      />
                    )}
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1 hover:text-neutral-300"
                      >
                        source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {hasMore && (
                <button
                  onClick={() => toggle(i)}
                  className="radar-expand-action mt-3 inline-flex items-center gap-1.5 text-xs font-semibold"
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <>
                      Show less <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      Read more <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              )}
            </Panel>
          );
        })}
      </div>
    </CardFrame>
  );
}

function FutureOutlookCard({ c, accent }: { c: FutureOutlookContent; accent: string }) {
  return (
    <div className="future-outlook-scene" style={{ "--future-outlook-accent": accent } as CSSProperties}>
      <OglTrendBackground accent={accent} />
      <div className="future-outlook-vignette" aria-hidden="true" />
      <div className="future-outlook-content">
        {c.eyebrow && (
          <EditableText
            value={c.eyebrow}
            field="eyebrow"
            className="rc-eyebrow future-outlook-eyebrow"
            style={{ color: accent }}
          />
        )}
        {c.title && (
          <h2>
            <EditableText
              value={c.title}
              field="title"
              className="rc-title future-outlook-title"
            />
          </h2>
        )}

        {c.growthRate && (
          <div className="future-outlook-growth">
            <div className="future-outlook-growth-rate" style={{ color: accent }}>
              <EditableText value={c.growthRate} field="growthRate" className="inline" />
            </div>
            {c.growthLabel && (
              <p>
                <EditableText value={c.growthLabel} field="growthLabel" className="block" />
              </p>
            )}
          </div>
        )}

        {c.timeline && c.timeline.length > 0 && (
          <div className="future-outlook-timeline">
            {c.timeline.map((t, i) => (
              <div key={i} className="future-outlook-timeline-row">
                <span className="future-outlook-year" style={{ color: accent }}>
                  {t.year && (
                    <EditableText
                      value={t.year}
                      field={["timeline", String(i), "year"]}
                      className="inline"
                    />
                  )}
                </span>
                <p>
                  <EditableText
                    value={t.event}
                    field={["timeline", String(i), "event"]}
                    className="block"
                  />
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="future-outlook-panels">
          {c.demandSignal && (
            <section className="future-outlook-panel">
              <p className="future-outlook-panel-label">Demand Signal</p>
              <p>
                <EditableText value={c.demandSignal} field="demandSignal" className="block" />
              </p>
            </section>
          )}

          {c.risk && (
            <section className="future-outlook-panel future-outlook-panel--risk">
              <p className="future-outlook-panel-label">Risk</p>
              <p>
                <EditableText value={c.risk} field="risk" className="block" />
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SourcesCard({ c, accent }: { c: SourcesContent; accent: string }) {
  return (
    <CardFrame eyebrow={c.eyebrow ?? "Sources"} title={c.title ?? "Where this comes from"} accent={accent} wide>
      <ol className="sources-index-grid">
        {(c.items ?? []).map((s, index) => (
          <li key={s.ref} className="sources-index-card">
            <span className="sources-index-number">[{s.ref}]</span>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="sources-index-link"
            >
              <EditableText
                value={s.title}
                field={["items", String(index), "title"]}
                className="sources-index-title"
              />
              {s.publisher && (
                <span className="sources-index-publisher">
                  <EditableText
                    value={s.publisher}
                    field={["items", String(index), "publisher"]}
                    className="inline"
                  />
                </span>
              )}
              <ExternalLink className="sources-index-external" />
            </a>
          </li>
        ))}
      </ol>
    </CardFrame>
  );
}

const CTA_BODY_TH =
  "ถ้าสนใจสายนี้ กดบอกไว้ได้เลย เราจะเก็บสายนี้ไว้ในเส้นทางของเธอ แล้วลองเริ่มจากของฟรีก่อนก็ได้";
const CTA_INTENT_LABEL_TH = "สนใจสายนี้";

/** The CTA card's resource links that are real external URLs. */
export function ctaResources(content: unknown): NonNullable<CtaContent["resources"]> {
  const list = (content as CtaContent | null | undefined)?.resources;
  return (Array.isArray(list) ? list : []).filter(
    (r) => !!r && typeof r.url === "string" && /^https?:\/\//.test(r.url)
  );
}

/**
 * The path slug an intent is recorded under: the last segment of the field's
 * squad URL, else "interested" (what CtaCard has always sent).
 */
export function ctaPathSlug(squadUrl: string | null | undefined, origin?: string): string {
  if (!squadUrl) return "interested";
  try {
    const base = origin ?? (typeof window === "undefined" ? "https://passionseed.org" : window.location.origin);
    const url = new URL(squadUrl, base);
    return url.pathname.split("/").filter(Boolean).pop() || "interested";
  } catch {
    return "interested";
  }
}

/**
 * The free resource chips ("หรือลองเล่นด้วยตัวเองก่อน (ฟรี)"). Used by the CTA
 * card and by GuideOutro's resources slot on the field page.
 */
export function CtaResourceLinks({
  resources,
  onCtaClick,
}: {
  resources: NonNullable<CtaContent["resources"]>;
  onCtaClick?: (target: GuideCtaTarget) => void;
}) {
  if (resources.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-neutral-400">
        หรือลองเล่นด้วยตัวเองก่อน (ฟรี)
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {resources.map((r, i) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            title={r.note}
            onClick={() => onCtaClick?.(`resource:${i + 1}`)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-neutral-200 transition-colors hover:bg-white/10"
          >
            {r.label} <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * The CTA card. The paid 1:1 "นัดคุยกับรุ่นพี่" session and its LINE QR are
 * gone: no feature may open a private channel between adults and students
 * (AGENTS.md safeguarding). The intent button records interest only.
 */
function CtaCard({
  c,
  accent,
  squadUrl,
  fieldSlug,
  onIntent,
}: {
  c: CtaContent;
  accent: string;
  squadUrl?: string | null;
  fieldSlug?: string;
  onIntent?: RadarIntentHandler;
}) {
  const { onCtaClick } = useRadarInteract();
  const resources = ctaResources(c);
  const program = radarProgramLine(fieldSlug);
  const [interestedRecorded, setInterestedRecorded] = useState(false);
  const [notInterestedRecorded, setNotInterestedRecorded] = useState(false);
  const anyRecorded = interestedRecorded || notInterestedRecorded;

  const recordInterested = () => {
    if (anyRecorded) return;
    onCtaClick?.("intent");
    onIntent?.(ctaPathSlug(squadUrl), "interested", "field");
    setInterestedRecorded(true);
  };

  const recordNotInterested = () => {
    onIntent?.("interested", "not-interested", "field");
    setNotInterestedRecorded(true);
  };

  return (
    <CardFrame accent={accent}>
      <p>
        <EditableText
          value={CTA_BODY_TH}
          field="body"
          className="block text-neutral-300 text-base leading-relaxed"
        />
      </p>
      <div className="flex flex-col gap-2">
        <Button
          className={`mt-2 min-h-12 w-full font-semibold transition-all ${
            interestedRecorded ? "text-white" : "text-neutral-950"
          }`}
          style={{ background: interestedRecorded ? undefined : accent }}
          variant={interestedRecorded ? "outline" : "default"}
          onClick={recordInterested}
          disabled={anyRecorded}
        >
          <span className="inline-flex items-center gap-2">
            {interestedRecorded ? (
              <><Check className="h-4 w-4" /> บันทึกแล้ว</>
            ) : (
              CTA_INTENT_LABEL_TH
            )}
          </span>
        </Button>
        <button
          type="button"
          disabled={anyRecorded}
          onClick={recordNotInterested}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium text-neutral-400 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {notInterestedRecorded ? "บันทึกแล้ว" : "ไม่สนใจลอง"}
        </button>
      </div>
      {program && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">{program.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">{program.body}</p>
          <Link
            href={program.href}
            onClick={() => onCtaClick?.("program")}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            {program.cta} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
      <CtaResourceLinks resources={resources} onCtaClick={onCtaClick} />
    </CardFrame>
  );
}

// ── career survival indicators ──────────────────────────────────────────────

const SURVIVAL_METRICS: Array<{
  key: string;
  emoji: string;
  label: string;
  labelEn: string;
  unit?: string;
  max: number;
  invert?: boolean;
  isSalary?: boolean;
}> = [
  { key: "demand_growth", emoji: "📈", label: "ความต้องการตลาด", labelEn: "Market Demand", max: 10 },
  // A team-estimated score, not a measured employment rate (spec 2.9).
  { key: "grad_employment_pct", emoji: "🚀", label: "คะแนนโอกาสงานจบใหม่ (ทีมเราประเมิน)", labelEn: "New Grad Job Score (our estimate)", unit: "/100", max: 100 },
  { key: "saturation_level", emoji: "🧃", label: "ความอิ่มตัว", labelEn: "Market Saturation", max: 10, invert: true },
  { key: "progression_difficulty", emoji: "🗼", label: "ความยากในการเติบโต", labelEn: "Growth Difficulty", max: 10, invert: true },
  { key: "salary_floor", emoji: "💰", label: "เงินเดือนเริ่มต้น", labelEn: "Entry Salary", max: 1, isSalary: true },
  { key: "salary_ceiling", emoji: "🚀", label: "เงินเดือนสูงสุด", labelEn: "Max Salary", max: 1, isSalary: true },
];

function survivalBarColor(value: number, max: number, invert?: boolean): string {
  const ratio = value / max;
  if (invert) {
    return ratio >= 0.7 ? "#f59e0b" : ratio >= 0.4 ? "#f59e0b" : "#10b981";
  }
  return ratio >= 0.7 ? "#10b981" : ratio >= 0.4 ? "#f59e0b" : "#ef4444";
}

function formatSurvivalSalary(val: number): string {
  if (val >= 1000) return `${(val / 1000).toFixed(0)},000`;
  return val.toLocaleString();
}

function CareerSurvivalCard({ c, accent }: { c: CareerSurvivalContent; accent: string }) {
  const [showGlobal, setShowGlobal] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const metrics = showGlobal ? c.global_metrics : c.metrics;
  const details = showGlobal ? c.global_metric_details : c.metric_details;
  if (!metrics) return null;

  const tierConfig = {
    growing: { emoji: "🟢", label: "Growing", labelTh: getOutlookLabel("growing"), color: "#10b981" },
    shifting: { emoji: "🟡", label: "Shifting", labelTh: getOutlookLabel("shifting"), color: "#f59e0b" },
    exposed: { emoji: "🔴", label: "Exposed", labelTh: getOutlookLabel("exposed"), color: "#ef4444" },
  } as const;
  const tier = c.tier ? tierConfig[c.tier as keyof typeof tierConfig] : null;

  const scoreMetrics = SURVIVAL_METRICS.filter((m) => !m.isSalary);
  const vals = scoreMetrics
    .map(({ key, max, invert }) => {
      const v = (metrics as Record<string, number | null | undefined>)[key];
      if (v == null) return null;
      const ratio = v / max;
      return invert ? 1 - ratio : ratio;
    })
    .filter((v): v is number => v !== null);
  const overallScore = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) : null;

  return (
    <CardFrame eyebrow={c.eyebrow} title={c.title} accent={accent}>
      <div className="career-survival-stack rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-0">
        {/* Header row: tier + score + toggle */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            {tier && (
              <span className="rc-tier-badge text-lg">{tier.emoji}</span>
            )}
            {overallScore !== null && (
              <span className="rc-score-value text-xl font-black tabular-nums" style={{ color: tier?.color ?? accent }}>
                {overallScore}<span className="text-xs font-medium text-neutral-400">/10</span>
              </span>
            )}
            {tier && (
              <span className="text-xs text-neutral-400">{tier.labelTh}</span>
            )}
          </div>
          {c.global_metrics && (
            <div className="flex rounded-full border border-white/10 bg-white/5 overflow-hidden">
              <button
                onClick={() => setShowGlobal(false)}
                className={`text-[11px] font-medium px-2.5 py-0.5 transition-colors ${
                  !showGlobal ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                🇹🇭 TH
              </button>
              <button
                onClick={() => setShowGlobal(true)}
                className={`text-[11px] font-medium px-2.5 py-0.5 transition-colors ${
                  showGlobal ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                🌐 Global
              </button>
            </div>
          )}
        </div>

        {SURVIVAL_METRICS.map(({ key, emoji, label, max, invert, isSalary }, idx) => {
          const val = (metrics as Record<string, number | null | undefined>)[key];
          if (val == null) return null;
          const detail = details?.[key];
          const isExpanded = expandedKey === key;
          const interpretation = interpretRadarMetric(key, val, max);

          return (
            <button
              key={key}
              onClick={() => detail ? setExpandedKey(isExpanded ? null : key) : undefined}
              className={`career-survival-metric rc-stagger text-left py-1.5 border-b border-white/5 last:border-b-0 rounded-lg transition-colors ${
                detail ? "cursor-pointer hover:bg-white/[0.04] active:bg-white/[0.06] -mx-2 px-2" : ""
              }`}
              style={{ transitionDelay: `${0.3 + idx * 0.07}s` }}
            >
              {isSalary ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base shrink-0">{emoji}</span>
                    <span className="text-xs text-neutral-400 flex-1">{label}</span>
                    <span className="text-white font-bold text-sm tabular-nums">
                      {formatSurvivalSalary(val)}฿/mo
                    </span>
                    {detail && (
                      <span className={`radar-expand-indicator radar-expand-indicator--compact ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true">
                        <ChevronDown />
                      </span>
                    )}
                  </div>
                  <p className="ml-7 mt-0.5 text-[11px] text-neutral-400">{interpretation}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-base shrink-0">{emoji}</span>
                    <span className="text-xs text-neutral-300 flex-1">{label}</span>
                    <span className="text-white font-bold text-xs tabular-nums min-w-10 text-right">
                      {val}{key === "grad_employment_pct" ? "/100" : "/10"}
                    </span>
                    {detail && (
                      <span className={`radar-expand-indicator radar-expand-indicator--compact ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true">
                        <ChevronDown />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-7">
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden flex-1">
                      <div
                        className="rc-bar-fill h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (val / max) * 100)}%`,
                          background: survivalBarColor(val, max, invert),
                          transitionDelay: `${0.35 + idx * 0.1}s`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="ml-7 mt-0.5 text-[11px] text-neutral-400">{interpretation}</p>
                </>
              )}

              {isExpanded && detail && (
                <div className="mt-1.5 ml-7 text-xs text-neutral-400 leading-relaxed">
                  {detail.th && <p>{detail.th}</p>}
                  {detail.en && <p className="text-neutral-500 mt-0.5">{detail.en}</p>}
                  {detail.source && (
                    <p className="mt-1 text-[10px] text-neutral-500">
                      📎{" "}
                      {detail.source_url ? (
                        <a
                          href={detail.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 hover:text-neutral-300 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {detail.source}
                        </a>
                      ) : (
                        detail.source
                      )}
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </CardFrame>
  );
}

// ── reflection (interactive) ─────────────────────────────────────────────────

function ReflectionCard({
  c,
  accent,
  submitted,
  onSubmit,
}: {
  c: ReflectionContent;
  accent: string;
  submitted: boolean;
  onSubmit: (payload: { rating?: number; tags?: string[]; text?: string }) => Promise<void> | void;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleChip = (chip: string) =>
    setSelected((prev) =>
      prev.includes(chip) ? prev.filter((x) => x !== chip) : [...prev, chip]
    );

  const canSubmit = c.rating ? rating !== null : selected.length > 0 || text.trim().length > 0;

  const handle = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        rating: rating ?? undefined,
        tags: selected.length ? selected : undefined,
        text: text.trim() || undefined,
      });
    } catch {
      setError("Could not save this answer. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <CardFrame eyebrow={c.eyebrow} title={c.title} accent={accent}>
        <div className="flex items-center gap-2 text-emerald-300">
          <Check className="h-5 w-5" /> <span>Saved - keep going</span>
        </div>
      </CardFrame>
    );
  }

  return (
    <CardFrame eyebrow={c.eyebrow} title={c.title} accent={accent}>
      {c.rating && (
        <div className="flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              className="flex-1 aspect-square rounded-xl border text-lg font-bold transition-all"
              style={{
                borderColor: rating === n ? accent : "rgba(255,255,255,0.1)",
                background: rating === n ? `${accent}22` : "rgba(255,255,255,0.05)",
                color: rating === n ? accent : "#a3a3a3",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {c.chips && c.chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {c.chips.map((chip, index) => {
            const on = selected.includes(chip);
            return (
              <button
                key={chip}
                onClick={() => toggleChip(chip)}
                className="rounded-full border px-4 py-2 text-sm font-medium transition-all"
                style={{
                  borderColor: on ? accent : "rgba(255,255,255,0.1)",
                  background: on ? `${accent}22` : "rgba(255,255,255,0.05)",
                  color: on ? accent : "#a3a3a3",
                }}
              >
                <EditableText
                  value={chip}
                  field={["chips", String(index)]}
                  className="inline"
                />
              </button>
            );
          })}
        </div>
      )}

      {c.allowText && (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={c.placeholder ?? "ไม่บังคับ เขียนสั้นๆ ประโยคเดียวก็พอ"}
          className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 resize-none"
          rows={3}
        />
      )}

      <Button
        onClick={handle}
        disabled={!canSubmit || busy}
        className="w-full font-semibold text-white disabled:opacity-40"
        style={{ background: accent }}
      >
        {busy ? "Saving..." : "Continue"}
      </Button>
      {error && <p className="text-sm text-rose-300">{error}</p>}
    </CardFrame>
  );
}

// ── dispatch ─────────────────────────────────────────────────────────────────

export type FieldSource = { ref: number; title: string; publisher?: string | null; url: string };

export interface RadarCardViewProps {
  kind: string;
  content: Record<string, unknown>;
  accent: string;
  fieldNameTh?: string;
  fieldNameEn?: string;
  fieldSlug?: string;
  squadUrl?: string | null;
  fieldSources?: FieldSource[];
  reflectionSubmitted?: boolean;
  showSignupPrompt?: boolean;
  signupHref?: string;
  onReflect?: (payload: { rating?: number; tags?: string[]; text?: string }) => Promise<void> | void;
  onIntent?: RadarIntentHandler;
  /** Guide `interactive_tap` (spec 2.7): "salary:level", "fantasy:flip", "ai:detail", ... */
  onInteract?: (target: string) => void;
  /** Guide `cta_click` from the CTA card: "intent", "program", "resource:<n>". */
  onCtaClick?: (target: GuideCtaTarget) => void;
}

export function SourceRefs({ refs, sources }: { refs: number[]; sources: FieldSource[] }) {
  const matched = refs
    .map((r) => sources.find((s) => s.ref === r))
    .filter((s): s is FieldSource => !!s);
  if (matched.length === 0) return null;
  return (
    <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1">
      {matched.map((s) => (
        <a
          key={s.ref}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors inline-flex items-center gap-1"
        >
          <span className="tabular-nums">[{s.ref}]</span>
          <span className="truncate max-w-[200px]">{s.title}</span>
          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
        </a>
      ))}
    </div>
  );
}

const SIMPLE_RADAR_TITLES: Record<string, string> = {
  careerSurvival: "Outlook",
  fantasyReality: "Reality",
  list: "Essentials",
  jobs: "Roles",
  growthCompare: "Growth",
  dayInLife: "Day-to-day",
  entryRoutes: "Study Path",
  risks: "Trade-offs",
  realPeople: "Real Paths",
  futureOutlook: "Future",
  sources: "Sources",
  cta: "Next Step",
  reflection: "Reflect",
};

function getSimpleRadarTitle(kind: string, content: Record<string, unknown>) {
  if (kind === "text") {
    const presentation = String(content.presentation ?? "").toLowerCase();
    if (presentation.includes("skill")) return "Skills";
    if (presentation.includes("start")) return "Start";
    return "Explore";
  }

  return SIMPLE_RADAR_TITLES[kind] ?? "Explore";
}

function getThaiRadarSubtitle(content: Record<string, unknown>) {
  const candidates = [content.title, content.eyebrow];
  const thai = candidates.find(
    (value) => typeof value === "string" && /[\u0E00-\u0E7F]/.test(value),
  );
  return typeof thai === "string" ? thai : "";
}

export function RadarCardView({
  kind,
  content,
  accent,
  fieldNameTh,
  fieldNameEn,
  fieldSlug,
  squadUrl,
  fieldSources = [],
  reflectionSubmitted = false,
  onReflect,
  onIntent,
  onInteract,
  onCtaClick,
}: RadarCardViewProps) {
  const interactions = useMemo(() => ({ onInteract, onCtaClick }), [onInteract, onCtaClick]);
  return (
    <RadarInteractContext.Provider value={interactions}>
      <RadarCardViewBody
        kind={kind}
        content={content}
        accent={accent}
        fieldNameTh={fieldNameTh}
        fieldNameEn={fieldNameEn}
        fieldSlug={fieldSlug}
        squadUrl={squadUrl}
        fieldSources={fieldSources}
        reflectionSubmitted={reflectionSubmitted}
        onReflect={onReflect}
        onIntent={onIntent}
      />
    </RadarInteractContext.Provider>
  );
}

function RadarCardViewBody({
  kind,
  content,
  accent,
  fieldNameTh,
  fieldNameEn,
  fieldSlug,
  squadUrl,
  reflectionSubmitted = false,
  onReflect,
  onIntent,
}: Omit<RadarCardViewProps, "onInteract" | "onCtaClick">) {
  const c = content as never;

  let cardNode: React.ReactNode;
  switch (kind) {
    case "hook":
      cardNode = (
        <HookCard
          c={c}
          accent={accent}
          fieldNameTh={fieldNameTh}
          fieldNameEn={fieldNameEn}
        />
      );
      break;
    case "careerSurvival":
      cardNode = <CareerSurvivalCard c={c} accent={accent} />;
      break;
    case "fantasyReality":
      cardNode = <FantasyRealityCard c={c} accent={accent} />;
      break;
    case "text":
      cardNode = <TextCard c={c} accent={accent} onIntent={onIntent} />;
      break;
    case "list":
      cardNode = <ListCard c={c} accent={accent} />;
      break;
    case "jobs":
      cardNode = <JobsCard c={c} accent={accent} />;
      break;
    case "salaryProgression":
      cardNode = <SalaryProgressionCard c={c} accent={accent} />;
      break;
    case "growthCompare":
      cardNode = <GrowthCompareCard c={c} accent={accent} />;
      break;
    case "aiImpact":
      cardNode = <AiImpactCard c={c} accent={accent} />;
      break;
    case "marketThailand":
      cardNode = <MarketThailandCard c={c} accent={accent} />;
      break;
    case "dayInLife":
      cardNode = <DayInLifeCard c={c} accent={accent} />;
      break;
    case "entryRoutes":
      cardNode = <EntryRoutesCard c={c} accent={accent} />;
      break;
    case "risks":
      cardNode = <RisksCard c={c} accent={accent} />;
      break;
    case "realPeople":
      cardNode = <RealPeopleCard c={c} accent={accent} />;
      break;
    case "futureOutlook":
      cardNode = <FutureOutlookCard c={c} accent={accent} />;
      break;
    case "sources":
      cardNode = <SourcesCard c={c} accent={accent} />;
      break;
    case "cta":
      cardNode = (
        <CtaCard
          c={c}
          accent={accent}
          squadUrl={squadUrl}
          fieldSlug={fieldSlug}
          onIntent={onIntent}
        />
      );
      break;
    case "reflection":
      cardNode = (
        <ReflectionCard
          c={c}
          accent={accent}
          submitted={reflectionSubmitted}
          onSubmit={onReflect ?? (() => {})}
        />
      );
      break;
    default:
      cardNode = <TextCard c={c} accent={accent} />;
  }

  const hasEditorialHeading = ["hook", "fantasyReality", "salaryProgression", "aiImpact", "marketThailand"].includes(kind);
  if (hasEditorialHeading) return cardNode;

  const englishTitle = getSimpleRadarTitle(kind, content);
  const thaiSubtitle = kind === "cta" ? "สนใจสายนี้แล้วไงต่อ?" : getThaiRadarSubtitle(content);

  const presentation = String(content.presentation ?? "").toLowerCase();
  const presentationClass =
    kind === "text" && presentation.includes("skill")
      ? " radar-standard-page--skills"
      : "";

  return (
    <section className={`radar-standard-page radar-standard-page--${kind}${presentationClass}`}>
      <header className="radar-standard-heading">
        <h2>{englishTitle}</h2>
        {thaiSubtitle && <p>{thaiSubtitle}</p>}
      </header>
      <div className="radar-standard-body">{cardNode}</div>
    </section>
  );
}
