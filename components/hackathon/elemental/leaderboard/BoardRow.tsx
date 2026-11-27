"use client";

import { useState, type CSSProperties } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import type { TeamNameStyle } from "@/lib/hackathon/elemental/team-style";

import { Fine, Tag } from "../share/ui";
import { StyledTeamName } from "../team-style/StyledTeamName";
import styles from "./board.module.css";

/**
 * One team on the board, as the board draws it and as the team editor
 * previews it (TeamEditor shows the team's own row with the draft name).
 * Board names, schools and two numbers: never a person's name. Every number
 * is Trirong (Bai Jamjuree digits aren't all one width). The team name is the
 * only loud thing; the first rank is in flameCore. Ground surface only.
 */

// copy: placeholder — Angpao rewrites
export const ROW_COPY = {
  paid: "จ่ายแล้ว",
  devices: "เครื่อง",
  paidShort: "จ่าย",
  rankTeam: "อันดับ · ทีม",
  solo: "มาคนเดียว",
  you: "ทีมคุณ",
  noName: "ยังไม่มีชื่อ",
  rank: (rank: number) => `อันดับ ${rank}`,
  noRank: "ยังไม่มีอันดับ",
};

export type BoardRowEntry = {
  key: string;
  /** Null: not on the board yet (the editor's preview). */
  rank: number | null;
  name: string | null;
  style: TeamNameStyle;
  schools: string[];
  solo: boolean;
  paid: number;
  devices: number;
};

const fine: CSSProperties = { fontFamily: EL_FONT.body, fontSize: 13, lineHeight: "20px", color: "var(--el-fine)" };

const trirong = (weight: 200 | 300 | 400, size: number): CSSProperties => ({ fontFamily: EL_FONT.display, fontWeight: weight, fontSize: size, lineHeight: 1 });

/**
 * A number that changed on a poll: the old one slides up 6px and fades
 * (120ms snap), the new one comes in (240ms tension), and "+2" shows under it
 * in flameCore for 2.4s. Nothing moves under prefers-reduced-motion. The first
 * render never animates.
 */
export function RollingNumber({ value, style, align = "end", className }: { value: number; style?: CSSProperties; align?: "start" | "end"; className?: string }) {
  const [prev, setPrev] = useState(value);
  const [change, setChange] = useState<{ from: number; delta: number; n: number } | null>(null);
  // The "previous value" pattern: set during render, so the change paints in the same frame.
  if (value !== prev) {
    setChange({ from: prev, delta: value - prev, n: (change?.n ?? 0) + 1 });
    setPrev(value);
  }
  return (
    <span className={`${styles.roll} tabular-nums ${className ?? ""}`} style={style}>
      {change && (
        <span key={`out-${change.n}`} aria-hidden="true" className={styles.rollOut}>
          {change.from}
        </span>
      )}
      <span key={`in-${change?.n ?? 0}`} className={change ? styles.rollIn : undefined}>
        {value}
      </span>
      {change && change.delta > 0 && (
        <span key={`delta-${change.n}`} aria-hidden="true" className={`${styles.delta} ${align === "end" ? styles.deltaEnd : styles.deltaStart}`}>
          +{change.delta}
        </span>
      )}
    </span>
  );
}

function Schools({ entry, you }: { entry: BoardRowEntry; you: boolean }) {
  const shown = entry.schools.slice(0, 2);
  const more = entry.schools.length - shown.length;
  const text = shown.length ? shown.join(" · ") : entry.solo ? ROW_COPY.solo : "";
  if (!text && !you) return null;
  return (
    <div className="mt-1 flex min-w-0 items-baseline gap-2">
      {you && (
        <Tag tone="action" className="shrink-0">
          {ROW_COPY.you}
        </Tag>
      )}
      {/* Not <Fine>: its text-wrap: pretty would undo truncate's nowrap. */}
      {text && (
        <span className="min-w-0 truncate" style={fine}>
          {text}
        </span>
      )}
      {more > 0 && (
        <Fine as="span" className="shrink-0">
          +{more}
        </Fine>
      )}
    </div>
  );
}

/** "9 จ่ายแล้ว": a Trirong number and a quiet label (the top three). */
function Stat({ value, label, strong }: { value: number; label: string; strong?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <RollingNumber value={value} align="start" style={{ ...trirong(strong ? 400 : 300, 28), color: strong ? "var(--el-number)" : "var(--el-secondary)" }} />
      <span style={{ fontFamily: EL_FONT.body, fontSize: 14, lineHeight: "22px", color: "var(--el-secondary)" }}>{label}</span>
    </span>
  );
}

export function BoardRow({
  entry,
  you = false,
  pinned = false,
  as: El = "li",
  bare = false,
}: {
  entry: BoardRowEntry;
  you?: boolean;
  /** Your row on the board: pinned to the bottom while it's further down the list. */
  pinned?: boolean;
  as?: "li" | "div";
  /** No rule under it and no id (the editor's preview, which has its own frame). */
  bare?: boolean;
}) {
  const top = entry.rank !== null && entry.rank <= 3;
  const first = entry.rank === 1;
  const rowCls = `${bare ? "" : "border-b"} ${you ? styles.you : ""} ${you && pinned ? styles.pinned : ""}`;
  const id = bare ? undefined : entry.key;
  const name = (
    <StyledTeamName
      name={entry.name}
      style={entry.style}
      placeholder={ROW_COPY.noName}
      className="block"
      sizeStyle={top ? { fontSize: first ? 36 : 30, lineHeight: 1.3 } : { fontSize: 22, lineHeight: 1.4 }}
    />
  );

  if (top) {
    return (
      <El id={id} className={`scroll-mt-24 px-3 py-5 sm:px-4 ${rowCls}`} style={{ borderColor: "var(--el-rule)" }}>
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-6">
          <span
            className="pt-1 tabular-nums"
            style={{ ...trirong(200, 48), color: first ? EL.flameCore : "var(--el-number)" }}
            aria-label={ROW_COPY.rank(entry.rank as number)}
          >
            {entry.rank}
          </span>
          <div className="min-w-0">
            {name}
            <Schools entry={entry} you={you} />
          </div>
          <div className="col-start-2 mt-3 flex items-baseline gap-6 sm:col-start-3 sm:mt-0 sm:flex-col sm:items-end sm:gap-2">
            <Stat value={entry.paid} label={ROW_COPY.paid} strong />
            <Stat value={entry.devices} label={ROW_COPY.devices} />
          </div>
        </div>
      </El>
    );
  }

  return (
    <El
      id={id}
      className={`scroll-mt-24 grid grid-cols-[2rem_minmax(0,1fr)_2.75rem_3.25rem] items-baseline gap-x-3 px-3 py-4 sm:px-4 ${rowCls}`}
      style={{ borderColor: "var(--el-rule)" }}
    >
      <span
        className="tabular-nums"
        style={{ ...trirong(300, 20), color: "var(--el-secondary)" }}
        aria-label={entry.rank !== null ? ROW_COPY.rank(entry.rank) : ROW_COPY.noRank}
      >
        {entry.rank ?? "–"}
      </span>
      <div className="min-w-0">
        {name}
        <Schools entry={entry} you={you} />
      </div>
      <RollingNumber value={entry.paid} className="text-right" style={{ ...trirong(400, 20), color: "var(--el-number)" }} />
      <RollingNumber value={entry.devices} className="text-right" style={{ ...trirong(300, 18), color: "var(--el-secondary)" }} />
    </El>
  );
}

/**
 * The column labels over the rows from fourth place down. The editor's
 * preview uses it as its stamp line: label on the left ("[ตัวอย่าง]"), and the
 * columns only when the preview row is one of those rows.
 */
export function RestHeader({
  as: El = "li",
  label,
  labelTone = "secondary",
  columns = true,
  compact = false,
}: {
  as?: "li" | "div";
  label?: string;
  labelTone?: "secondary" | "action";
  columns?: boolean;
  compact?: boolean;
}) {
  return (
    <El
      aria-hidden="true"
      className={`grid grid-cols-[2rem_minmax(0,1fr)_2.75rem_3.25rem] gap-x-3 px-3 sm:px-4 ${compact ? "pt-3" : "border-b pb-2 pt-8"}`}
      style={{ borderColor: "var(--el-rule)" }}
    >
      <span className="col-span-2">
        <Tag tone={labelTone}>{label ?? ROW_COPY.rankTeam}</Tag>
      </span>
      {columns && (
        <>
          <span className="text-right">
            <Tag bracket={false}>{ROW_COPY.paidShort}</Tag>
          </span>
          <span className="text-right">
            <Tag bracket={false}>{ROW_COPY.devices}</Tag>
          </span>
        </>
      )}
    </El>
  );
}
