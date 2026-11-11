"use client";

/**
 * Where a level's facts come from: every fact with its badge (ยืนยันแล้ว,
 * ตัวเลขจากบริษัทเจ้าของเอง, ยังรอตรวจสอบ, จำลอง), the สหรัฐฯ / เราคำนวณเอง labels,
 * the claim, and each source's outlet, date and link. Facts an item pointed
 * at (`focus`) come first and are highlighted.
 *
 * Legacy: the DB deck's chapter eyebrow still passes `sources` (numbered
 * refs). That branch goes when Unit 6 removes the chapter UI.
 */
import { ExternalLink } from "lucide-react";
import { FACT_BADGE_TH, type Fact, type FactId } from "@/lib/radar-guide/guide-types";
import { GuideSheet } from "./GuideSheet";
import { formatThaiMonthYear, type GuideSource } from "./guide-helpers";
import { asOfLabel, formatThaiDay } from "./shell/guide-format";

interface SheetBase {
  open: boolean;
  onOpenChange(open: boolean): void;
  accent?: string;
}

export interface GuideSourcesSheetProps extends SheetBase {
  /** The level title, e.g. "เงินเดือนจริงในไทย". */
  titleTh: string;
  facts: readonly Fact[];
  /** The level's asOf ("2026-11-11"), shown as "ข้อมูล ณ 11 พ.ย. 2569". */
  asOf?: string | null;
  /** Facts to list first and highlight. */
  focus?: readonly FactId[];
}

/** @deprecated DB deck chapters (removed in Unit 6). */
export interface LegacySourcesSheetProps extends SheetBase {
  chapterTitleTh: string;
  sources: readonly GuideSource[];
  updatedAt: string | null;
}

export type SourcesSheetProps = GuideSourcesSheetProps | LegacySourcesSheetProps;

/** Focused facts first, otherwise the given order. */
export function orderFacts(facts: readonly Fact[], focus: readonly FactId[] = []): Fact[] {
  if (!focus.length) return [...facts];
  const set = new Set<string>(focus);
  return [...facts.filter((f) => set.has(f.id)), ...facts.filter((f) => !set.has(f.id))];
}

function FactRow({ fact, focused }: { fact: Fact; focused: boolean }) {
  return (
    <li className="rg-fact" data-focused={focused ? "true" : undefined} data-fact={fact.id}>
      <div className="rg-chips">
        <span className="rg-chip" data-badge={fact.badge}>
          {FACT_BADGE_TH[fact.badge]}
        </span>
        {fact.usOnly ? <span className="rg-chip rg-chip--label">สหรัฐฯ</span> : null}
        {fact.ourMath ? <span className="rg-chip rg-chip--label">เราคำนวณเอง</span> : null}
      </div>
      <p className="rg-fact__claim" lang="en">
        {fact.claimEn}
      </p>
      {fact.sources.length ? (
        <ul className="rg-fact__sources">
          {fact.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="rg-fact__link">
                <span className="min-w-0 flex-1">
                  <span className="rg-fact__outlet">{source.outlet}</span>
                  {source.title ? <span className="rg-fact__title">{source.title}</span> : null}
                  <span className="rg-fact__date">{formatThaiDay(source.publishedAt) ?? source.publishedAt}</span>
                </span>
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rg-fact__note">ตัวอย่างจำลองเพื่อการเรียนรู้ ไม่ใช่เหตุการณ์จริง</p>
      )}
    </li>
  );
}

function GuideFactsSheet({ open, onOpenChange, accent, titleTh, facts, asOf, focus = [] }: GuideSourcesSheetProps) {
  const label = asOfLabel(asOf);
  const focusSet = new Set<string>(focus);
  return (
    <GuideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="ที่มาของข้อมูลด่านนี้"
      description={label ? `${titleTh} · ${label}` : titleTh}
      showDescription
      accent={accent}
      className="rg-sheet"
    >
      {facts.length > 0 ? (
        <ol className="rg-facts" data-testid="sources-list">
          {orderFacts(facts, focus).map((fact) => (
            <FactRow key={fact.id} fact={fact} focused={focusSet.has(fact.id)} />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-neutral-400">ด่านนี้ไม่มีตัวเลขหรือข่าวที่ต้องอ้างอิง</p>
      )}
    </GuideSheet>
  );
}

function LegacySheet({ open, onOpenChange, chapterTitleTh, sources, updatedAt, accent }: LegacySourcesSheetProps) {
  const month = formatThaiMonthYear(updatedAt);
  return (
    <GuideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="ที่มาของข้อมูลบทนี้"
      description={month ? `${chapterTitleTh} · อัปเดต ${month}` : chapterTitleTh}
      showDescription
      accent={accent}
    >
      {sources.length > 0 ? (
        <ol className="space-y-2">
          {sources.map((source) => (
            <li key={source.ref}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="radar-guide-row flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <span className="shrink-0 pt-0.5 text-xs tabular-nums text-neutral-500">[{source.ref}]</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug text-white">{source.title}</span>
                  {source.publisher ? (
                    <span className="mt-0.5 block text-xs text-neutral-400">{source.publisher}</span>
                  ) : null}
                </span>
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-neutral-400">บทนี้ใช้ข้อมูลจากงานวิจัยของทีมเรา ดูแหล่งข้อมูลทั้งหมดได้ท้ายหน้า</p>
      )}
    </GuideSheet>
  );
}

export function SourcesSheet(props: SourcesSheetProps) {
  return "facts" in props ? <GuideFactsSheet {...props} /> : <LegacySheet {...props} />;
}
