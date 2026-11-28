"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import type { ShareLinkView } from "@/lib/hackathon/elemental/share-rules";
import { nameColor, nameStyleCss, DEFAULT_STYLE, STYLE_PART_TH, type StylePart } from "@/lib/hackathon/elemental/team-style";

import styles from "./meter.module.css";
import {
  cellColors,
  clearOrder,
  freshCells,
  GRID_CELLS,
  GRID_COLUMNS,
  GRID_ROWS,
  meterModel,
  meterPlace,
  readSeen,
  tierEdge,
  writeSeen,
  type MeterModel,
  type MeterTeam,
  type MeterTier,
} from "./meter-model";
import { Body, EditorialLink, RollingNumber, Tag, v } from "./ui";

/**
 * The meter on the share page: the team's way to its next name style. A
 * corrupted place recovering, one cell per team device, column by column, so
 * the styles are bands of the photo (dashed lines at colours 10 and fonts
 * 25; effects at 50 heal it all). Above it, the three styles as stubs, earned
 * or still a dashed ghost; the count is the team's devices toward the next one;
 * one line under it says this person's own link. Once everything is open (by
 * devices or a Story proof): a calm "ปลดล็อกครบแล้ว" and the way to custom the
 * name. Without team data it just counts the link's devices.
 *
 * Motion: from the count this phone last saw (localStorage), never from 0;
 * at most 8 cells animate; nothing moves under prefers-reduced-motion. Screen
 * readers get one hidden line, not the grid.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  label: "ความคืบหน้าของทีม",
  labelCount: "เครื่องที่เปิดลิงก์นี้",
  teamTag: "ทั้งทีม",
  soloTag: "ของคุณ",
  totalTag: "รวม",
  devicesUnit: "เครื่อง",
  unlocked: "ได้แล้ว",
  at: (n: number) => `ครบ ${n} เครื่อง`,
  yourLink: (n: number) => `ลิงก์ของคุณ ${n} เครื่อง`,
  allUnlocked: "ปลดล็อกครบแล้ว",
  byStory: "จากสตอรี่ IG",
  custom: "custom ชื่อทีม",
  customSolo: "custom ชื่อของฉัน",
  stamp: `ปิดนับ ${formatThaiDate(ELEMENTAL.registrationClosesOn, false)}`,
  describe: (m: MeterModel) =>
    m.mode === "count"
      ? `รวม ${m.devices} เครื่อง`
      : m.next
        ? `ทั้งทีม ${m.devices} เครื่อง อีก ${m.next.left} เครื่อง ปลดล็อก${STYLE_PART_TH[m.next.part]}`
        : `ทั้งทีม ${m.devices} เครื่อง ปลดล็อกครบแล้ว`,
  announce: (added: number, n: number) => `เพิ่ม ${added} เครื่อง รวม ${n}`,
};

const COUNT = { fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 44, lineHeight: 1, color: v.number } as const;
const SMALL = { fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 20, lineHeight: 1, color: v.secondary } as const;

/** "19/25" or "64 เครื่อง", the number in the shared RollingNumber (a change rolls, "+2" shows under it). */
function LiveCount({ value, goal }: { value: number; goal?: number }) {
  return (
    <span className="inline-flex items-baseline whitespace-nowrap" aria-hidden="true">
      <RollingNumber value={value} style={COUNT} />
      {goal != null ? (
        <span style={SMALL}>/{goal}</span>
      ) : (
        <span className="ml-1.5" style={SMALL}>
          {COPY.devicesUnit}
        </span>
      )}
    </span>
  );
}

/** A small taste of what each style gives, on its earned stub. */
function TierSample({ part }: { part: StylePart }) {
  if (part === "color")
    return (
      <span className="flex h-3 w-full gap-[2px]">
        {(["ember", "flame", "water", "leaf", "aether"] as const).map((c) => (
          <span key={c} className="flex-1" style={{ backgroundColor: nameColor(c) }} />
        ))}
      </span>
    );
  if (part === "font") return <span style={{ ...nameStyleCss({ ...DEFAULT_STYLE, font: "chakra" }), fontSize: 18, lineHeight: 1 }}>กข Aa</span>;
  return <span style={{ ...nameStyleCss({ ...DEFAULT_STYLE, effect: "gradient", pair: "fire" }), fontSize: 18, lineHeight: 1 }}>กข Aa</span>;
}

/** One style as a stub: earned (a taste of it, [ได้แล้ว]) or a dashed ghost saying when it opens. */
function TierStub({ tier }: { tier: MeterTier }) {
  const name = STYLE_PART_TH[tier.part];
  if (!tier.unlocked) {
    return (
      <div className="min-w-0 flex-1 rounded-[2px] border border-dashed px-2.5 py-2" style={{ borderColor: "rgba(243,239,230,0.28)" }}>
        <p className="truncate" style={{ fontFamily: EL_FONT.body, fontWeight: 600, fontSize: 13, lineHeight: "20px", color: v.fine }}>
          {name}
        </p>
        <p className="truncate" style={{ fontFamily: EL_FONT.body, fontSize: 13, lineHeight: "20px", color: v.fine }}>
          {COPY.at(tier.at)}
        </p>
      </div>
    );
  }
  return (
    <div className="min-w-0 flex-1 rounded-[2px] px-2.5 py-2" style={{ backgroundColor: EL.char, boxShadow: "inset 0 0 0 1px rgba(255,213,122,0.45)" }}>
      <div className="flex h-5 items-center">
        <TierSample part={tier.part} />
      </div>
      <p className="mt-1 flex items-baseline justify-between gap-1">
        <span className="truncate" style={{ fontFamily: EL_FONT.body, fontWeight: 600, fontSize: 13, lineHeight: "20px", color: v.text }}>
          {name}
        </span>
        <Tag tone="action" bracket={false}>
          {COPY.unlocked}
        </Tag>
      </p>
    </div>
  );
}

type Motion = { fresh: Set<number>; wave: boolean; announce: string };
const STILL: Motion = { fresh: new Set(), wave: false, announce: "" };

export function MeterCard({
  link,
  team,
  code,
  editHref,
  preview = false,
}: {
  link: Pick<ShareLinkView, "devices" | "phase" | "storyProof">;
  /** The team's devices and Story unlock (team-style data); without it, the link's devices only. */
  team?: MeterTeam | null;
  /** The link's code: seeds the photo, the fire and the ragged edge. */
  code: string;
  /** The team editor, for "custom ชื่อทีม" once everything is open. */
  editHref?: string;
  /** No link yet (the school picker): the empty card; nothing remembered or animated. */
  preview?: boolean;
}) {
  const m = meterModel(link, team);
  const place = meterPlace(code);
  const rank = useMemo(() => clearOrder(code), [code]);
  const colors = useMemo(() => cellColors(code), [code]);
  // Everything open: the photo is shown healed, whatever the count.
  const cleared = m.allUnlocked ? GRID_CELLS : m.cleared;

  // Animate from what this phone saw last. The page renders the current state; the effect only adds the flourish.
  const [motion, setMotion] = useState<Motion>(STILL);
  const [shownCount, setShownCount] = useState<number | null>(null);
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (preview) return;
    const now = m.devices;
    const prev = seen.current ?? readSeen(code);
    const remember = () => {
      seen.current = now;
      writeSeen(code, now);
    };
    const added = prev != null ? now - prev : 0;
    if (prev == null || added <= 0 || m.frozen) {
      remember();
      return;
    }
    const prevCleared = Math.min(GRID_CELLS, prev);
    const announce = COPY.announce(added, now);
    // Motion off: the cells don't move, but the count still says "+2" (RollingNumber) and the hidden line what changed.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next: Motion = still ? { ...STILL, announce } : { fresh: freshCells(rank, m.cleared, prevCleared), wave: prevCleared < GRID_CELLS && m.cleared === GRID_CELLS, announce };
    // Remembered only once it plays, so a cancelled run (React's dev double effect, a quick re-render) plays it again.
    let roll: ReturnType<typeof setTimeout> | undefined;
    const start = setTimeout(() => {
      remember();
      setMotion(next);
      setShownCount(prev);
      roll = setTimeout(() => setShownCount(null), 60);
    }, 0);
    const stop = setTimeout(() => setMotion((cur) => ({ ...cur, wave: false, fresh: new Set() })), 2400);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
      if (roll) clearTimeout(roll);
    };
  }, [preview, code, m.devices, m.cleared, m.frozen, rank]);

  const isTeam = m.mode === "team";
  const count = shownCount ?? m.devices;
  let foot: ReactNode = null;
  if (!preview && isTeam && m.allUnlocked && !m.frozen) {
    foot = (
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Body as="span">
          {COPY.allUnlocked}
          {m.byStory && (
            <>
              {" "}
              <Tag tone="action">{COPY.byStory}</Tag>
            </>
          )}
        </Body>
        {editHref && (
          <EditorialLink href={editHref} size="sm" tone="action">
            {m.solo ? COPY.customSolo : COPY.custom}
          </EditorialLink>
        )}
      </div>
    );
  }

  return (
    <section aria-label={isTeam ? COPY.label : COPY.labelCount}>
      <p className="sr-only">{COPY.describe(m)}</p>
      <p className="sr-only" aria-live="polite">
        {motion.announce}
      </p>

      {isTeam && !preview && (
        <div aria-hidden="true" className="mb-6 flex gap-2">
          {m.tiers.map((t) => (
            <TierStub key={t.part} tier={t} />
          ))}
        </div>
      )}

      <div aria-hidden="true" className="flex items-end justify-between gap-3">
        <Tag>{!isTeam ? COPY.totalTag : m.solo ? COPY.soloTag : COPY.teamTag}</Tag>
        <LiveCount value={count} goal={isTeam && m.next && !m.frozen ? m.next.at : undefined} />
      </div>

      {/* mt-5: room for RollingNumber's "+2" under the count, off the pixels. */}
      <div aria-hidden="true" className="relative mt-5 overflow-hidden rounded-[2px]" style={{ aspectRatio: "2 / 1", filter: m.frozen ? "grayscale(1) brightness(0.72)" : undefined }}>
        <Image src={place.src} alt="" fill sizes="(min-width: 640px) 576px, 100vw" className="object-cover" />
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))` }}>
          {Array.from({ length: GRID_CELLS }, (_, cell) => {
            if (rank[cell] < cleared) {
              const fresh = motion.fresh.has(cell);
              const order = fresh ? [...motion.fresh].sort((a, b) => rank[a] - rank[b]).indexOf(cell) : 0;
              return (
                <span key={cell} className="relative">
                  {fresh && <span className={`absolute inset-0 ${styles.clearing}`} style={{ animationDelay: `${order * 50}ms` }} />}
                  {motion.wave && <span className={`absolute inset-0 ${styles.wave}`} style={{ animationDelay: `${(cell % GRID_COLUMNS) * 35}ms` }} />}
                </span>
              );
            }
            // A little of the place shows through even at 0.
            return <span key={cell} style={{ backgroundColor: colors[cell], opacity: 0.88 }} />;
          })}
        </div>
        {/* The style bands: colours end at 2 columns, fonts at 5 (effects heal it all). */}
        {isTeam &&
          !m.allUnlocked &&
          m.tiers.slice(0, -1).map((t) => (
            <span
              key={t.part}
              className="absolute inset-y-0 border-l-2 border-dashed"
              style={{ left: `${tierEdge(t.at) * 100}%`, borderColor: t.unlocked ? "rgba(255,213,122,0.45)" : EL.flameCore }}
            />
          ))}
        {m.frozen && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5" style={{ backgroundColor: "#0c0d0c", boxShadow: "inset 0 0 0 1px rgba(243,239,230,0.55)" }}>
            <Tag tone="text">{COPY.stamp}</Tag>
          </span>
        )}
      </div>

      {/* Each style's number under its line ([10] [25] [50]); the next one in the action colour, so the count above reads as "toward that one". */}
      {isTeam && !m.allUnlocked && !preview && (
        <div aria-hidden="true" className="relative mt-1.5 h-5">
          {m.tiers.map((t) => {
            const edge = tierEdge(t.at);
            const isNext = !m.frozen && m.next?.at === t.at;
            return (
              <span
                key={t.part}
                className="absolute top-0"
                style={edge >= 1 ? { right: 0 } : { left: `${edge * 100}%`, transform: "translateX(-50%)" }}
              >
                <Tag tone={isNext ? "action" : "secondary"} className={t.unlocked ? "opacity-50" : undefined}>
                  {t.at}
                </Tag>
              </span>
            );
          })}
        </div>
      )}

      {isTeam && !preview && !m.solo && (
        <Body secondary className="mt-3">
          {COPY.yourLink(m.linkDevices)}
        </Body>
      )}
      {foot}
    </section>
  );
}

/** The teacher page's count: just the devices that opened the link, rolling when it changes. */
export function DeviceCount({ link, code }: { link: Pick<ShareLinkView, "devices" | "phase">; code: string }) {
  const devices = Math.max(0, Math.floor(link.devices));
  const [shown, setShown] = useState<number | null>(null);
  const seen = useRef<number | null>(null);
  useEffect(() => {
    const prev = seen.current ?? readSeen(code);
    seen.current = devices;
    writeSeen(code, devices);
    if (prev == null || devices <= prev || link.phase === "after-close") return;
    const start = setTimeout(() => setShown(prev), 0);
    const roll = setTimeout(() => setShown(null), 60);
    return () => {
      clearTimeout(start);
      clearTimeout(roll);
    };
  }, [code, devices, link.phase]);
  return (
    <div className="flex items-end justify-between gap-3 border-y py-5" style={{ borderColor: v.rule }}>
      <Tag>{COPY.labelCount}</Tag>
      <span className="sr-only">{`${devices} ${COPY.devicesUnit}`}</span>
      <LiveCount value={shown ?? devices} />
    </div>
  );
}
