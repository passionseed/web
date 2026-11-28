"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import {
  nextUnlock,
  STYLE_PART_TH,
  STYLE_PARTS,
  TEAM_STYLE_TIERS,
  type NameSurface,
  type TeamStyleCardData,
} from "@/lib/hackathon/elemental/team-style";
import { BOARD_YOU_KEY, type BoardYou } from "@/lib/hackathon/elemental/team-style-phase";

import { Body, EditorialLink } from "../share/ui";
import { StyledTeamName } from "./StyledTeamName";

/**
 * The team's line, on the pay page's team card (inside its dark slab) and on
 * the share page: the board name as the board draws it, then one text line
 * (rank · what's unlocked · what unlocks next, or that a member's Instagram
 * Story unlocked it all), then "custom ชื่อทีม →" to the team
 * editor (/hackathon/join/<token>/team) and "กระดาน →". No meter: the team's
 * progress is the text line. Colours come from the surface's CSS variables;
 * the name's colour variant follows the surface around it (the dark ground
 * unless the background is light), or pass surface.
 * compact (or inside <CompactTeamLine>): the name, the rank and "กระดาน →"
 * only, for a page whose meter already says the rest (the share page).
 * Usage: <TeamLine token={token} data={teamStyle} demo={demo} />
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  label: "ทีมบนกระดาน",
  labelSolo: "ชื่อของฉันบนกระดาน",
  noName: "ยังไม่มีชื่อบนกระดาน",
  rank: (rank: number, of: number) => `อันดับ ${rank} จาก ${of}`,
  finalRank: (rank: number, of: number) => `ผลสุดท้าย อันดับ ${rank} จาก ${of}`,
  offBoard: "ยังไม่ขึ้นกระดาน",
  setToJoin: "ตั้งชื่อเพื่อขึ้นกระดาน",
  toBoard: (n: number) => `อีก ${n} เครื่องขึ้นกระดาน`,
  unlocked: (part: string) => `ปลดล็อก${part}แล้ว`,
  next: (left: number, part: string) => `อีก ${left} เครื่อง ปลดล็อก${part}`,
  allOpen: "ปลดล็อกครบแล้ว",
  story: "ปลดล็อกครบแล้ว จากสตอรี่ IG",
  frozen: "ปิดนับแล้ว custom ชื่อได้ถึงวัน Demo Day",
  closed: "ปิดแก้ไขแล้ว",
  edit: "custom ชื่อทีม",
  editSolo: "custom ชื่อ",
  setName: "ตั้งชื่อ",
  board: "กระดาน",
  lobby: "ห้องรอ",
};

/** The status line's parts, in order. Exported for tests and the editor. */
export function teamLineParts(
  data: Pick<TeamStyleCardData, "boardName" | "devices" | "rank" | "teamsOnBoard" | "final" | "editable" | "storyUnlocked">,
): string[] {
  const named = Boolean(data.boardName);
  const story = Boolean(data.storyUnlocked);
  const rank = data.rank ? (data.final ? COPY.finalRank : COPY.rank)(data.rank, data.teamsOnBoard) : named ? COPY.offBoard : null;
  let progress: string[];
  if (data.final) progress = [data.editable ? COPY.frozen : COPY.closed];
  else if (!named) progress = [COPY.setToJoin, ...(story ? [COPY.story] : [])];
  else if (data.devices < 1) progress = [COPY.toBoard(1), ...(story ? [COPY.story] : [])];
  // Every style is open, and this is why (the device tiers no longer matter).
  else if (story) progress = [COPY.story];
  else {
    const next = nextUnlock(data.devices);
    const last = [...STYLE_PARTS].reverse().find((p) => data.devices >= TEAM_STYLE_TIERS[p]);
    progress = next
      ? [...(last ? [COPY.unlocked(STYLE_PART_TH[last])] : []), COPY.next(next.left, STYLE_PART_TH[next.part])]
      : [COPY.allOpen];
  }
  return [...(rank ? [rank] : []), ...progress];
}

/** The compact line's text: the rank, or what keeps the team off the board. Progress lives on the page's meter. */
export function teamLineCompactText(data: Pick<TeamStyleCardData, "boardName" | "rank" | "teamsOnBoard" | "final">): string {
  if (data.rank) return (data.final ? COPY.finalRank : COPY.rank)(data.rank, data.teamsOnBoard);
  return data.boardName ? COPY.offBoard : COPY.setToJoin;
}

const CompactContext = createContext(false);

/**
 * Makes every TeamLine inside it compact. The share page wraps the team line
 * the route hands it in this, since its meter already says the progress and
 * links to the editor.
 */
export function CompactTeamLine({ children }: { children: ReactNode }) {
  return <CompactContext.Provider value>{children}</CompactContext.Provider>;
}

/** Light or dark, from the --el-bg the surface set (ui.tsx surfaceVars). */
function surfaceFrom(el: HTMLElement | null): NameSurface | null {
  if (!el) return null;
  const bg = getComputedStyle(el).getPropertyValue("--el-bg").trim();
  const m = /^#([0-9a-f]{6})$/i.exec(bg);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum > 0.5 ? "paper" : "ground";
}

export function TeamLine({
  token,
  data,
  demo,
  surface,
  compact = false,
}: {
  token: string;
  data: TeamStyleCardData;
  demo?: boolean;
  /** Kept for PayView: TeamLine never draws a meter, so it changes nothing. */
  hideMeter?: boolean;
  /** The name's colour variant. Without it, read from the surface around it. */
  surface?: NameSurface;
  /**
   * Name, rank and "กระดาน →" only: for a page whose meter already shows the
   * progress and the editor link (the share page). Also set by CompactTeamLine.
   */
  compact?: boolean;
}) {
  const compactFromPage = useContext(CompactContext);
  const isCompact = compact || compactFromPage;
  const ref = useRef<HTMLDivElement>(null);
  const [detected, setDetected] = useState<NameSurface>("ground");
  useEffect(() => {
    if (surface) return;
    const found = surfaceFrom(ref.current);
    if (found) setDetected(found);
  }, [surface]);

  const named = Boolean(data.boardName);
  const payHref = demo ? "/hackathon/join/demo" : `/hackathon/join/${token}`;
  const editHref = data.editHref ?? `/hackathon/join/${token}/team`;
  const boardHref = `/hackathon/elemental/leaderboard${demo ? "/demo" : ""}#${data.key}`;
  // The waiting room finds this team from the same sessionStorage note as the board.
  const lobbyHref = `/hackathon/elemental/lobby${demo ? "/demo" : ""}`;

  // Lets the board (same tab) mark "your team" and link back, without the pay token ever going in a URL.
  useEffect(() => {
    const you: BoardYou = { key: data.key, shareHref: data.shareHref, payHref, editHref, devices: data.devices, named };
    try {
      sessionStorage.setItem(BOARD_YOU_KEY, JSON.stringify(you));
    } catch {
      // Private mode or storage off: the board just won't mark the row.
    }
  }, [data.key, data.shareHref, data.devices, payHref, editHref, named]);

  return (
    <div ref={ref} data-team-line="" role="group" aria-label={data.solo ? COPY.labelSolo : COPY.label}>
      <StyledTeamName
        name={data.boardName}
        style={data.style}
        surface={surface ?? detected}
        placeholder={COPY.noName}
        className="block"
        sizeStyle={named ? { fontSize: 28, lineHeight: 1.3 } : { fontSize: 22, lineHeight: 1.4 }}
      />
      {/* Each part moves to the next line whole, so Thai never breaks inside "ปลดล็อก…". */}
      <Body secondary className="mt-1">
        {isCompact
          ? teamLineCompactText(data)
          : teamLineParts(data).map((part, i) => (
              <span key={i}>
                {i > 0 && " · "}
                <span className="inline-block">{part}</span>
              </span>
            ))}
      </Body>
      <div className="mt-3 flex flex-wrap items-center gap-x-6">
        {data.editable && !isCompact && (
          <EditorialLink href={editHref} size="sm" tone="action">
            {named ? (data.solo ? COPY.editSolo : COPY.edit) : COPY.setName}
          </EditorialLink>
        )}
        <EditorialLink href={boardHref} size="sm">
          {COPY.board}
        </EditorialLink>
        <EditorialLink href={lobbyHref} size="sm">
          {COPY.lobby}
        </EditorialLink>
      </div>
    </div>
  );
}
