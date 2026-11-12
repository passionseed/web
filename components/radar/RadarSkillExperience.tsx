"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Play } from "lucide-react";
import { recordRadarStartOptionInterest } from "@/lib/supabase/radar";

export type RadarStartOption = {
  id: string;
  kind: "youtube" | "resource" | "course" | "pathlab" | "project" | "community";
  title_th: string;
  summary_th: string | null;
  provider: string | null;
  destination_url: string | null;
  destination_ref: string | null;
  metadata: Record<string, unknown>;
};

export type RadarSkillSummary = {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  description_th: string | null;
  is_primary: boolean;
  start_options: RadarStartOption[];
};

const KIND_LABELS: Record<RadarStartOption["kind"], string> = {
  youtube: "YouTube",
  resource: "อ่าน / ดู",
  course: "คอร์ส",
  pathlab: "PathLab",
  project: "โปรเจกต์",
  community: "คอมมูนิตี้",
};

/**
 * The first start option of the primary skill (else of the first skill that
 * has one): the outro's "ลองอันนี้ก่อน" tile (spec 2.8, item 1).
 */
export function firstStartOption(skills: readonly RadarSkillSummary[]): RadarStartOption | null {
  const ordered = [...skills.filter((s) => s.is_primary), ...skills.filter((s) => !s.is_primary)];
  for (const skill of ordered) {
    if (skill.start_options.length > 0) return skill.start_options[0];
  }
  return null;
}

export interface StartOptionTileProps {
  option: RadarStartOption;
  accent: string;
  /** Radar Guide visit, stored in the interest event's metadata for the funnel. */
  visitId?: string | null;
  /** Called when the student opens the option's destination. */
  onOpen?: () => void;
}

export function StartOptionTile({ option, accent, visitId = null, onOpen }: StartOptionTileProps) {
  const [interestedRecorded, setInterestedRecorded] = useState(false);
  const [notInterestedRecorded, setNotInterestedRecorded] = useState(false);
  const anyIntentRecorded = interestedRecorded || notInterestedRecorded;
  const destination = option.destination_url ?? option.destination_ref;
  const duration = typeof option.metadata.duration === "string" ? option.metadata.duration : null;
  const cost = typeof option.metadata.cost === "string" ? option.metadata.cost : null;

  const record = async (eventType: "opened" | "interested" | "not_interested") => {
    if (eventType === "opened") onOpen?.();
    await recordRadarStartOptionInterest(option.id, eventType, visitId);
    if (eventType === "interested") setInterestedRecorded(true);
    if (eventType === "not_interested") setNotInterestedRecorded(true);
  };

  return (
    <article className="w-[82vw] max-w-[320px] shrink-0 snap-center rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
            {KIND_LABELS[option.kind]}
          </span>
          <h4 className="mt-1 font-semibold text-white">{option.title_th}</h4>
          {option.summary_th && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-neutral-400">
              {option.summary_th}
            </p>
          )}
        </div>
        {option.kind === "youtube" && <Play className="mt-1 h-5 w-5 shrink-0" style={{ color: accent }} />}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500">
        {option.provider && <span>{option.provider}</span>}
        {duration && <span>· {duration}</span>}
        {cost && <span>· {cost}</span>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {destination ? (
          option.destination_url ? (
            <a
              href={option.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void record("opened")}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-white hover:bg-white/5"
            >
              เปิดดู <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <Link
              href={option.destination_ref!}
              onClick={() => void record("opened")}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-white hover:bg-white/5"
            >
              เริ่มลอง <ArrowRight className="h-4 w-4" />
            </Link>
          )
        ) : <span />}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={anyIntentRecorded}
            onClick={() => void record("interested")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-neutral-950 disabled:bg-white/10 disabled:text-white/60"
            style={interestedRecorded ? undefined : { background: accent }}
          >
            {interestedRecorded ? <><Check className="h-4 w-4" /> สนใจแล้ว</> : "บอกว่าสนใจ"}
          </button>
          <button
            type="button"
            disabled={anyIntentRecorded}
            onClick={() => void record("not_interested")}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium text-neutral-400 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {notInterestedRecorded ? "บันทึกแล้ว" : "ไม่สนใจลอง"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function RadarSkillExperience({
  skills,
  accent,
  startFirst = false,
  visitId = null,
  onInteract,
}: {
  skills: RadarSkillSummary[];
  accent: string;
  /** Field guide: start options lead, the skill list follows (spec 2.1, chapter `start`). */
  startFirst?: boolean;
  visitId?: string | null;
  /** Guide `interactive_tap`; fires "skill:open" when a start option is opened. */
  onInteract?: (target: string) => void;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  if (skills.length === 0) return null;
  const startOptions = skills.flatMap((skill) => skill.start_options).slice(0, 6);
  const openOption = () => onInteract?.("skill:open");

  const moveCarousel = (direction: -1 | 1) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollBy({
      left: direction * Math.min(carousel.clientWidth * 0.82, 360),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const intro = (
    <header>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
        ทักษะที่ใช้จริง
      </p>
      <h2 className="mt-2 text-3xl font-bold text-white">งานนี้เก่งจากอะไร</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-400">
        เลือกทักษะเพื่อดูงานที่เกี่ยวข้อง หรือเริ่มจากคำแนะนำสั้นๆ ที่เหมาะกับเวลาของคุณ
      </p>
    </header>
  );
  const skillList = (
    <div className="divide-y divide-white/10">
      {skills.map((skill) => (
        <Link
          key={skill.id}
          href={`/radar/skills/${skill.slug}`}
          className="flex min-h-16 items-center gap-3 py-3 focus-visible:outline-none focus-visible:ring-2"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">{skill.name_th}</h3>
              {skill.is_primary && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-neutral-300">
                  ทักษะหลัก
                </span>
              )}
            </div>
            {skill.description_th && (
              <p className="mt-1 line-clamp-1 text-sm text-neutral-400">{skill.description_th}</p>
            )}
          </div>
          <ArrowRight className="h-4 w-4 shrink-0" style={{ color: accent }} />
        </Link>
      ))}
    </div>
  );
  const startRail = (
    <>
      {startOptions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
                เริ่มลงมือ
              </p>
              <h3 className="mt-1 text-xl font-bold text-white">ไม่ต้องรอจบมหาวิทยาลัย</h3>
              <p className="mt-1 text-sm text-neutral-500">ปัดซ้ายเพื่อดูตัวเลือกต่อไป</p>
            </div>
            <div className="hidden gap-1 sm:flex">
              <button type="button" onClick={() => moveCarousel(-1)} aria-label="ตัวเลือกก่อนหน้า" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white hover:bg-white/5">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => moveCarousel(1)} aria-label="ตัวเลือกถัดไป" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white hover:bg-white/5">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div ref={carouselRef} className="radar-horizontal-carousel -mx-6 flex gap-3 overflow-x-auto px-6 pb-3">
            {startOptions.map((option) => (
              <StartOptionTile
                key={option.id}
                option={option}
                accent={accent}
                visitId={visitId}
                onOpen={openOption}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );

  if (startFirst) {
    return (
      <section className="mx-auto w-full max-w-xl space-y-7">
        {startRail}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
            ทักษะที่ใช้จริง
          </p>
          {skillList}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-xl space-y-7">
      {intro}
      {skillList}
      {startRail}
    </section>
  );
}
