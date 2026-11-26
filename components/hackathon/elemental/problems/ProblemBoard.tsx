"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock, Play } from "lucide-react";

import { EL_FONT } from "@/components/hackathon/poster/elemental/brand";

import { ANY_PROBLEM_NOTE } from "../challenges";
import styles from "../elemental-cinema.module.css";
import { ElementDetailSheet } from "../ElementDetailSheet";
import { trirong } from "../fonts";
import { elementLabel, type ElementChapter } from "../media";
import { boardCounts, buildBoard, type BoardColumn, type BoardTile, type OwnerProblem } from "../problem-owners";
import { trackElemental } from "../track";
import { OwnerProblemSheet } from "./OwnerProblemSheet";

const BODY_FONT = "var(--font-bai-jamjuree), sans-serif";
const LINE = "border-[#f3efe6]/12";
const TILE = `relative flex flex-col justify-between gap-4 border-t ${LINE} bg-[#0c0d0c] p-5 text-left min-[420px]:even:border-l lg:even:border-l-0`;
const OPEN_TILE = `${TILE} min-h-[10.5rem] transition-colors hover:bg-[#161715]`;

const number = (i: number) => `[${String(i + 1).padStart(2, "0")}]`;

/** Size of one pixel on a locked tile, in px. */
const PIXEL = 12;

/**
 * A few faint pixels in a locked tile's top corner, the same blocks the
 * Elemental art uses for Aether. Fixed per element, so nothing shifts on reload.
 */
function LockedPixels({ color, seed }: { color: string; seed: number }) {
  const cells: { x: number; y: number; o: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const n = (seed * 7 + i * 13) % 31;
    cells.push({ x: n % 7, y: (n * 3 + i) % 4, o: 0.12 + ((n + i) % 4) * 0.06 });
  }
  return (
    <span aria-hidden="true" className="pointer-events-none absolute right-3 top-3" style={{ width: PIXEL * 7, height: PIXEL * 4 }}>
      {cells.map((c, i) => (
        <span
          key={i}
          className="absolute"
          style={{ left: c.x * PIXEL, top: c.y * PIXEL, width: PIXEL, height: PIXEL, backgroundColor: color, opacity: c.o }}
        />
      ))}
    </span>
  );
}

function StarterTile({ column, onOpen }: { column: BoardColumn; onOpen: () => void }) {
  const { chapter, detail } = column;
  return (
    <button type="button" onClick={onOpen} className={OPEN_TILE}>
      <span className="text-xs" style={{ fontFamily: EL_FONT.mono, color: chapter.color }}>
        {number(0)} โจทย์ตั้งต้น
      </span>
      <span className="text-lg text-[#faf8f4]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.35 }}>
        {detail.ctaTh}
      </span>
      <span className="text-xs text-[#cfc9bd]" style={{ fontFamily: BODY_FONT }}>
        จาก PassionSeed · เคสจริง {detail.cases.length} เคส
      </span>
    </button>
  );
}

function OwnerTile({ chapter, problem, index, onOpen }: { chapter: ElementChapter; problem: OwnerProblem; index: number; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className={OPEN_TILE}>
      <span className="text-xs" style={{ fontFamily: EL_FONT.mono, color: chapter.color }}>
        {number(index)} เจ้าของโจทย์{problem.demo ? " [ตัวอย่าง]" : ""}
      </span>
      <span className="line-clamp-4 text-lg text-[#faf8f4]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.35 }}>
        {problem.titleTh}
      </span>
      <span className="flex items-center gap-2 text-xs text-[#cfc9bd]" style={{ fontFamily: BODY_FONT }}>
        <span className="line-clamp-1">{problem.ownerTh}</span>
        {problem.clip ? (
          <span className="inline-flex shrink-0 items-center gap-1" style={{ color: chapter.color }}>
            <Play aria-hidden="true" className="h-3 w-3" />
            คลิป
          </span>
        ) : null}
      </span>
    </button>
  );
}

function LockedTile({ chapter, index, seed }: { chapter: ElementChapter; index: number; seed: number }) {
  return (
    <div className={`${TILE} min-h-[6.5rem] overflow-hidden lg:min-h-[10.5rem]`} aria-label={`ช่องที่ยังล็อก: รอเจ้าของโจทย์${elementLabel(chapter.th)}ยืนยัน`}>
      <LockedPixels color={chapter.color} seed={seed} />
      <span className="relative inline-flex items-center gap-1.5 text-xs text-[#f3efe6]/50" style={{ fontFamily: EL_FONT.mono }}>
        {number(index)}
        <Lock aria-hidden="true" className="h-3 w-3" />
        ล็อก
      </span>
      <span className="relative text-sm text-[#f3efe6]/55" style={{ fontFamily: BODY_FONT }}>
        รอเจ้าของโจทย์{elementLabel(chapter.th)}ยืนยัน
      </span>
    </div>
  );
}

function Tile({ column, tile, index, seed, onOpen }: { column: BoardColumn; tile: BoardTile; index: number; seed: number; onOpen: (key: string) => void }) {
  if (tile.kind === "starter") return <StarterTile column={column} onOpen={() => onOpen(tile.key)} />;
  if (tile.kind === "owner") return <OwnerTile chapter={column.chapter} problem={tile.problem} index={index} onOpen={() => onOpen(tile.key)} />;
  return <LockedTile chapter={column.chapter} index={index} seed={seed} />;
}

/**
 * /hackathon/elemental/problems: every problem on one board, a column per
 * element, like a CTF's challenge board. Each tile opens its panel over the
 * board, and the link (#water or #water:owner_id) opens it again, so a
 * problem owner can be sent straight to their own tile.
 */
export function ProblemBoard({
  owners,
  joinHref,
  homeHref,
  registrationOpen,
  source,
}: {
  owners: readonly OwnerProblem[];
  joinHref: string;
  homeHref: string;
  registrationOpen: boolean;
  source?: string;
}) {
  const columns = useMemo(() => buildBoard(owners), [owners]);
  const counts = boardCounts(columns);
  const openKeys = useMemo(
    () => new Set(columns.flatMap((c) => c.tiles.filter((t) => t.kind !== "locked").map((t) => t.key))),
    [columns]
  );
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const openTile = useCallback(
    (key: string) => {
      setActiveKey(key);
      trackElemental({ step: "board_open", detail: key, source });
      window.history.replaceState(null, "", `#${key}`);
    },
    [source]
  );

  const closeTile = useCallback(() => {
    setActiveKey(null);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    trackElemental({ step: "board_view", source });
    let fromLink = "";
    try {
      fromLink = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      // A broken link (#%E0%A) just opens the board.
    }
    if (openKeys.has(fromLink)) openTile(fromLink);
    // Only on arrival: later hash changes come from openTile itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={`${trirong.variable} ${styles.cinemaRoot} min-h-screen text-[#faf8f4]`}>
      <div className={styles.filmGrain} aria-hidden="true" />

      <header className={`sticky top-0 z-40 border-b ${LINE} bg-[#0c0d0c]`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-10">
          <Link href={homeHref} className={`${styles.textLink} text-[15px] italic`} style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
            ← Elemental Hackathon
          </Link>
          {registrationOpen ? (
            <Link href={joinHref} className={`${styles.textLink} text-[15px] italic`} style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
              สมัคร →
            </Link>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-10 pt-14 sm:px-10 sm:pt-20">
        <h1 className="text-5xl sm:text-7xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
          บอร์ดโจทย์
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#e6e1d7] sm:text-lg" style={{ fontFamily: BODY_FONT }}>
          โจทย์ทั้ง 5 ธาตุในที่เดียว แต่ละธาตุมีโจทย์ตั้งต้นจากเรา และโจทย์จากเจ้าของโจทย์ คนที่ทำงานกับปัญหานั้นจริง ช่องที่ยังล็อกจะเปิดเมื่อเจ้าของโจทย์ยืนยัน
        </p>
        <p className="mt-6 text-xs text-[#cfc9bd]" style={{ fontFamily: EL_FONT.mono }}>
          [เปิดแล้ว {counts.open} · ล็อก {counts.locked}]
        </p>
      </section>

      <div className="mx-auto max-w-7xl px-5 sm:px-10">
        <div className={`grid grid-cols-1 border-l border-t ${LINE} lg:grid-cols-5`}>
          {columns.map((column, c) => (
            <section
              key={column.chapter.key}
              aria-labelledby={`board-${column.chapter.key}`}
              className={`flex flex-col border-b border-r ${LINE}`}
            >
              <div className="px-5 pb-5 pt-6">
                <h2
                  id={`board-${column.chapter.key}`}
                  className="text-4xl"
                  style={{ fontFamily: EL_FONT.display, fontWeight: 200, color: column.chapter.color, lineHeight: 1.05 }}
                >
                  {elementLabel(column.chapter.th)}
                </h2>
                <p className="mt-2 text-sm text-[#cfc9bd] lg:min-h-[2.5rem]" style={{ fontFamily: BODY_FONT }}>
                  {column.chapter.subtitleTh}
                </p>
              </div>
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-1">
                {column.tiles.map((tile, i) => (
                  <Tile key={tile.key} column={column} tile={tile} index={i} seed={c + 1} onOpen={openTile} />
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-6 text-sm text-[#cfc9bd]" style={{ fontFamily: BODY_FONT }}>
          {ANY_PROBLEM_NOTE}
        </p>
      </div>

      <section className="flex flex-col items-center px-5 pb-24 pt-20 text-center">
        {registrationOpen ? (
          <Link
            href={joinHref}
            className={`${styles.textLink} text-[2rem] italic`}
            style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: "#ffd57a" }}
          >
            สมัคร →
          </Link>
        ) : (
          <span className="text-xl text-[#f3efe6]/40" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
            ปิดรับสมัครแล้ว
          </span>
        )}
      </section>

      {columns.map((column) => (
        <ElementDetailSheet
          key={column.chapter.key}
          chapter={column.chapter}
          detail={column.detail}
          open={activeKey === column.chapter.key}
          onOpenChange={(next) => (next ? openTile(column.chapter.key) : closeTile())}
          joinHref={joinHref}
          registrationOpen={registrationOpen}
        />
      ))}
      {columns.flatMap((column) =>
        column.tiles.map((tile) =>
          tile.kind === "owner" ? (
            <OwnerProblemSheet
              key={tile.key}
              chapter={column.chapter}
              problem={tile.problem}
              open={activeKey === tile.key}
              onOpenChange={(next) => (next ? openTile(tile.key) : closeTile())}
              onOpenStarter={() => openTile(column.chapter.key)}
              joinHref={joinHref}
              registrationOpen={registrationOpen}
            />
          ) : null
        )
      )}
    </main>
  );
}
