"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import type { ShareLinkView } from "@/lib/hackathon/elemental/share-rules";

import styles from "./meter.module.css";
import { cellColors, clearOrder, freshCells, GRID_CELLS, GRID_COLUMNS, GRID_ROWS, meterModel, meterPlace, readSeen, writeSeen } from "./meter-model";
import { Body, RollingNumber, Tag, v } from "./ui";

/**
 * The meter on the share and teacher pages (merged direction §6–7): a
 * corrupted place recovering. A 10×5 grid of fire pixels over the link's
 * recovered-place photo (the Ticket's photos); each device that opens the
 * link clears one, until the photo is clean at 50. The count is every device.
 * It shows devices only: no goal, no reward.
 *
 * Motion: from the count this phone last saw (localStorage), never from 0;
 * at most 8 cells animate; nothing moves under prefers-reduced-motion. Screen
 * readers get one hidden line, not the grid.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  totalTag: "รวม",
  devicesUnit: "เครื่อง",
  full: "แชร์ต่อยังนับให้ทีมบนกระดาน",
  stamp: `ปิดนับ ${formatThaiDate(ELEMENTAL.registrationClosesOn, false)}`,
  label: "เครื่องที่เปิดลิงก์นี้",
  describe: (n: number) => `รวม ${n} เครื่อง`,
  announce: (added: number, n: number) => `เพิ่ม ${added} เครื่อง รวม ${n}`,
};

const COUNT = { fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 44, lineHeight: 1, color: v.number } as const;
const UNIT = { fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 20, lineHeight: 1, color: v.secondary } as const;

/**
 * "64 เครื่อง" (BigCount's type), with the number in the shared RollingNumber:
 * a change rolls (the old number slides up and fades) and "+2" shows under it.
 * Under reduced motion RollingNumber keeps the "+2" and drops it after 2.4s.
 */
function LiveCount({ value }: { value: number }) {
  return (
    <span className="inline-flex items-baseline whitespace-nowrap" aria-hidden="true">
      <RollingNumber value={value} style={COUNT} />
      <span className="ml-1.5" style={UNIT}>
        {COPY.devicesUnit}
      </span>
    </span>
  );
}

type Motion = { fresh: Set<number>; wave: boolean; announce: string };
const STILL: Motion = { fresh: new Set(), wave: false, announce: "" };

export function MeterCard({
  view,
  code,
  preview = false,
}: {
  view: Pick<ShareLinkView, "devices" | "phase">;
  /** The link's code: seeds the photo, the fire and the order the cells clear in. */
  code: string;
  /** No link yet (the school picker): just the empty grid and its count; nothing remembered or animated. */
  preview?: boolean;
}) {
  const m = meterModel(view);
  const place = meterPlace(code);
  const rank = useMemo(() => clearOrder(code), [code]);
  const colors = useMemo(() => cellColors(code), [code]);

  // Animate from what this phone saw last. The page renders the current state; the effect only adds the flourish.
  const [motion, setMotion] = useState<Motion>(STILL);
  // The count shown, when it isn't the live one: the last count this phone saw, for one frame, so it rolls up from there.
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
    // Nothing to celebrate on a first visit, with no change, or once counting stopped.
    if (prev == null || added <= 0 || m.frozen) {
      remember();
      return;
    }
    const prevCleared = Math.min(GRID_CELLS, prev);
    const cameClean = prevCleared < GRID_CELLS && m.full;
    const announce = COPY.announce(added, now);
    // Motion off: the cells don't move, but the count still says "+2" (RollingNumber) and the hidden line what changed.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next: Motion = still ? { ...STILL, announce } : { fresh: freshCells(rank, m.cleared, prevCleared), wave: cameClean, announce };
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
  }, [preview, code, m.devices, m.cleared, m.full, m.frozen, rank]);

  return (
    <section aria-label={COPY.label}>
      <p className="sr-only">{COPY.describe(m.devices)}</p>
      <p className="sr-only" aria-live="polite">
        {motion.announce}
      </p>

      <div aria-hidden="true" className="flex items-end justify-between gap-3">
        <Tag>{COPY.totalTag}</Tag>
        <LiveCount value={shownCount ?? m.devices} />
      </div>

      {/* mt-5: room for RollingNumber's "+2" under the count, off the pixels. */}
      <div aria-hidden="true" className="relative mt-5 overflow-hidden rounded-[2px]" style={{ aspectRatio: "2 / 1", filter: m.frozen ? "grayscale(1) brightness(0.72)" : undefined }}>
        <Image src={place.src} alt="" fill sizes="(min-width: 640px) 576px, 100vw" className="object-cover" />
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))` }}>
          {Array.from({ length: GRID_CELLS }, (_, cell) => {
            if (rank[cell] < m.cleared) {
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
        {m.frozen && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5" style={{ backgroundColor: "#0c0d0c", boxShadow: "inset 0 0 0 1px rgba(243,239,230,0.55)" }}>
            <Tag tone="text">{COPY.stamp}</Tag>
          </span>
        )}
      </div>

      {!preview && m.full && !m.frozen && (
        <div aria-hidden="true" className="mt-3">
          <Body secondary as="span">
            {COPY.full}
          </Body>
        </div>
      )}
    </section>
  );
}
