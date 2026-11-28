"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, BookOpen, Combine, Flag, Lightbulb, Lock, Megaphone, Play, UserRound } from "lucide-react";

import { EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ElementIcon } from "@/components/hackathon/poster/elemental/element-icons";

import styles from "../elemental-cinema.module.css";
import { ElementDetailSheet } from "../ElementDetailSheet";
import { trirong } from "../fonts";
import { JourneyStepsCompact } from "../JourneySteps";
import { elementLabel, type ElementChapter } from "../media";
import { boardCounts, buildBoard, type BoardColumn, type BoardTile, type OwnerProblem } from "../problem-owners";
import { trackElemental } from "../track";
import { OwnerProblemSheet } from "./OwnerProblemSheet";

const BODY_FONT = "var(--font-bai-jamjuree), sans-serif";
const LINE = "border-[#f3efe6]/12";
const CREAM_DIM = "text-[#cfc9bd]";
/** Every tile: the grid lines and the dark ground. Direction and height are set per kind. */
const TILE = `relative flex border-t ${LINE} bg-[#0c0d0c] p-5 text-left min-[420px]:even:border-l lg:even:border-l-0`;
const OPEN_TILE = `${TILE} group min-h-[10rem] flex-col justify-between gap-4 transition-[background-color,transform] duration-150 hover:bg-[#161715] active:scale-[0.985]`;

const two = (i: number) => String(i + 1).padStart(2, "0");

/** One small line: an icon, then a few words. The board's only kind of label. */
function IconLabel({ icon: Icon, children, color, className = "" }: { icon: LucideIcon; children: React.ReactNode; color?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} style={color ? { color } : undefined}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
      {children}
    </span>
  );
}

/** Size of one pixel on a locked tile, in px. */
const PIXEL = 12;

/**
 * A few faint pixels in a locked tile's corner, the same blocks the Elemental
 * art uses for Aether. Fixed per element, so nothing shifts on reload.
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

function TileTop({ icon, index, color, sample }: { icon: LucideIcon; index: number; color: string; sample?: boolean }) {
  return (
    <span className="flex items-center justify-between gap-2 text-xs" style={{ fontFamily: EL_FONT.mono }}>
      <span className="inline-flex items-center gap-2">
        <IconLabel icon={icon} color={color}>
          {two(index)}
        </IconLabel>
        {sample ? <span className="border border-[#f3efe6]/30 px-1.5 text-[10px] text-[#f3efe6]/70">ตัวอย่าง</span> : null}
      </span>
      <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-[#f3efe6]/35 transition-colors group-hover:text-[#faf8f4]" />
    </span>
  );
}

function StarterTile({ column, onOpen }: { column: BoardColumn; onOpen: () => void }) {
  const { chapter, detail } = column;
  return (
    <button type="button" onClick={onOpen} className={OPEN_TILE} aria-label={`โจทย์ตั้งต้น${elementLabel(chapter.th)}: ${detail.ctaTh}`}>
      <TileTop icon={Flag} index={0} color={chapter.color} />
      <span className="text-xl text-[#faf8f4]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.3 }}>
        {detail.ctaTh}
      </span>
      <IconLabel icon={BookOpen} className={`text-xs ${CREAM_DIM}`}>
        <span style={{ fontFamily: BODY_FONT }}>{detail.cases.length} เคสจริง</span>
      </IconLabel>
    </button>
  );
}

function OwnerTile({ chapter, problem, index, onOpen }: { chapter: ElementChapter; problem: OwnerProblem; index: number; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className={OPEN_TILE} aria-label={`เจ้าของโจทย์ ${problem.ownerTh}: ${problem.titleTh}`}>
      <TileTop icon={Megaphone} index={index} color={chapter.color} sample={problem.demo} />
      <span className="line-clamp-3 text-xl text-[#faf8f4]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.3 }}>
        {problem.titleTh}
      </span>
      <span className={`flex items-center gap-3 text-xs ${CREAM_DIM}`} style={{ fontFamily: BODY_FONT }}>
        <IconLabel icon={UserRound} className="min-w-0">
          <span className="line-clamp-1">{problem.ownerTh}</span>
        </IconLabel>
        {problem.clip ? (
          <IconLabel icon={Play} color={chapter.color} className="shrink-0">
            คลิป
          </IconLabel>
        ) : null}
      </span>
    </button>
  );
}

/**
 * A slim row on phones, a full tile in the desktop grid. When the brief
 * already names the element's owner (ElementDetail.owner), the tile says
 * whose problem is coming; their own tile opens once they confirm it.
 */
function LockedTile({ chapter, ownerName, seed }: { chapter: ElementChapter; ownerName?: string; seed: number }) {
  const label = ownerName ? `รอโจทย์จาก ${ownerName}` : "รอเจ้าของโจทย์";
  return (
    <div
      className={`${TILE} min-h-[4.5rem] items-center gap-2.5 overflow-hidden lg:min-h-[10rem] lg:flex-col lg:items-start lg:justify-end`}
      aria-label={`ช่องที่ยังล็อก: ${ownerName ? label : `รอเจ้าของโจทย์${elementLabel(chapter.th)}ยืนยัน`}`}
    >
      <LockedPixels color={chapter.color} seed={seed} />
      <Lock aria-hidden="true" className="relative h-5 w-5 shrink-0 text-[#f3efe6]/45" />
      <span className="relative text-sm text-[#f3efe6]/55" style={{ fontFamily: BODY_FONT }}>
        {label}
      </span>
    </div>
  );
}

function Tile({ column, tile, index, seed, onOpen }: { column: BoardColumn; tile: BoardTile; index: number; seed: number; onOpen: (key: string) => void }) {
  if (tile.kind === "starter") return <StarterTile column={column} onOpen={() => onOpen(tile.key)} />;
  if (tile.kind === "owner") return <OwnerTile chapter={column.chapter} problem={tile.problem} index={index} onOpen={() => onOpen(tile.key)} />;
  return <LockedTile chapter={column.chapter} ownerName={column.detail.owner?.name} seed={seed} />;
}

/** What each tile icon means, with how many of each: the board's scoreboard. */
function Legend({ counts }: { counts: ReturnType<typeof boardCounts> }) {
  const items: { icon: LucideIcon; label: string; n: number }[] = [
    { icon: Flag, label: "โจทย์ตั้งต้น", n: counts.starter },
    { icon: Megaphone, label: "จากเจ้าของโจทย์", n: counts.owner },
    { icon: Lock, label: "รอเปิด", n: counts.locked },
  ];
  return (
    <ul className={`mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm ${CREAM_DIM}`} style={{ fontFamily: BODY_FONT }}>
      {items.map(({ icon, label, n }) => (
        <li key={label}>
          <IconLabel icon={icon}>
            {label}
            <span className="text-[#faf8f4]" style={{ fontFamily: EL_FONT.mono }}>
              {n}
            </span>
          </IconLabel>
        </li>
      ))}
    </ul>
  );
}

/**
 * What counts as this element: the landing's one-line scope, then its
 * examples as a short list, each kept on one line so Thai never breaks
 * mid-word. Students pick any problem of the kind, so this is the part that
 * tells them what "the kind" is.
 */
function ElementScope({ chapter }: { chapter: ElementChapter }) {
  const examples = chapter.examplesTh.split(" · ");
  return (
    <div className="mt-3" style={{ fontFamily: BODY_FONT }}>
      <p className="text-[15px] leading-snug text-[#faf8f4]">{chapter.subtitleTh}</p>
      <ul className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] leading-snug ${CREAM_DIM}`} aria-label={`ตัวอย่างปัญหา${elementLabel(chapter.th)}`}>
        {examples.map((example) => (
          <li key={example} className="whitespace-nowrap before:mr-1.5 before:content-['·'] before:text-[#f3efe6]/35">
            {example}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * /hackathon/elemental/problems: every problem on one board, a column per
 * element, like a CTF's challenge board. Made for students who scan, not
 * read: icons and a few words, and the detail waits behind each tile. Each
 * tile opens its panel over the board, and the link (#water or
 * #water:owner_id) opens it again, so a problem owner can be sent straight
 * to their own tile.
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

      <section className="mx-auto max-w-7xl px-5 pb-2 pt-12 sm:px-10 sm:pt-16">
        <h1 className="text-5xl sm:text-7xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
          บอร์ดโจทย์
        </h1>
        <JourneyStepsCompact joinHref={registrationOpen ? joinHref : undefined} stepsHref={`${homeHref}#steps`} />
        <Legend counts={counts} />
      </section>

      <div className="mx-auto mt-5 max-w-7xl px-5 sm:px-10">
        <div className={`grid grid-cols-1 border-l border-t ${LINE} lg:grid-cols-5`}>
          {columns.map((column, c) => (
            <section
              key={column.chapter.key}
              aria-labelledby={`board-${column.chapter.key}`}
              className={`flex flex-col border-b border-r ${LINE}`}
            >
              <div className="px-5 pb-5 pt-6 lg:min-h-[13rem]">
                <div className="flex items-center gap-3">
                  <ElementIcon element={column.chapter.key} size={30} id={`board-icon-${column.chapter.key}`} />
                  <h2
                    id={`board-${column.chapter.key}`}
                    className="text-3xl"
                    style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: column.chapter.color, lineHeight: 1.1 }}
                  >
                    {elementLabel(column.chapter.th)}
                  </h2>
                </div>
                <ElementScope chapter={column.chapter} />
              </div>
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-1">
                {column.tiles.map((tile, i) => (
                  <Tile key={tile.key} column={column} tile={tile} index={i} seed={c + 1} onOpen={openTile} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* The rule under every brief (ANY_PROBLEM_NOTE), as two icons. */}
        <ul className={`mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm ${CREAM_DIM}`} style={{ fontFamily: BODY_FONT }}>
          <li>
            <IconLabel icon={Lightbulb}>ปัญหาอื่นในธาตุเดียวกันก็ได้</IconLabel>
          </li>
          <li>
            <IconLabel icon={Combine}>รวมหลายธาตุก็ได้</IconLabel>
          </li>
        </ul>
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
