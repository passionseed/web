"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import {
  nextUnlock,
  type TeamNameStyle,
  type TeamStyleCardData,
} from "@/lib/hackathon/elemental/team-style";
import {
  BOARD_YOU_KEY,
  type BoardYou,
} from "@/lib/hackathon/elemental/team-style-phase";

import { btnSmall, outline } from "../share/ui";
import { StyledTeamName } from "./StyledTeamName";
import { PART_TH, TeamMeter } from "./TeamMeter";
import { TeamStyleEditor } from "./TeamStyleEditor";

/**
 * The team's line on the board, for the pay page's share card: its board
 * name as the board shows it, rank, team devices toward the next unlock, a
 * button that opens the editor inline, and the way to the board.
 * Usage: <TeamStyleRow token={token} data={teamStyle} demo={demo} />
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  title: "ทีมบนกระดาน",
  titleSolo: "ชื่อของฉันบนกระดาน",
  rank: (rank: number, of: number) => `อันดับ ${rank} จาก ${of}`,
  offBoard: "ยังไม่ขึ้นกระดาน",
  final: "ผลสุดท้าย",
  setToJoin: "ตั้งชื่อเพื่อขึ้นกระดาน",
  meter: "เครื่องของทั้งทีม",
  meterSolo: "เครื่องที่เปิดลิงก์ของฉัน",
  toBoard: (n: number) => `อีก ${n} เครื่องขึ้นกระดาน`,
  next: (left: number, part: keyof typeof PART_TH) =>
    `อีก ${left} เครื่อง ปลดล็อก${PART_TH[part]}`,
  allOpen: "ปลดล็อกครบแล้ว แต่งได้ทุกแบบ",
  frozen: "ปิดนับแล้ว แต่งชื่อได้ถึงวัน Demo Day",
  edit: "แต่งชื่อ",
  setName: "ตั้งชื่อ",
  board: "ดูกระดาน",
  saved: "บันทึกแล้ว",
};

export function TeamStyleRow({
  token,
  data,
  demo,
}: {
  token: string;
  data: TeamStyleCardData;
  demo?: boolean;
}) {
  const [saved, setSaved] = useState<{
    style: TeamNameStyle;
    boardName: string | null;
  }>({ style: data.style, boardName: data.boardName });
  const [open, setOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const named = Boolean(saved.boardName);
  const payHref = demo ? "/hackathon/join/demo" : `/hackathon/join/${token}`;
  const boardHref = `/hackathon/elemental/leaderboard${demo ? "/demo" : ""}#${data.key}`;

  // The demo page opens the editor with &edit=1.
  useEffect(() => {
    if (demo && new URLSearchParams(window.location.search).get("edit") === "1")
      setOpen(true);
  }, [demo]);

  // Lets the board (same tab) mark "your team" and link back, without the pay token ever going in a URL.
  useEffect(() => {
    const you: BoardYou = {
      key: data.key,
      shareHref: data.shareHref,
      payHref,
      devices: data.devices,
      named,
    };
    try {
      sessionStorage.setItem(BOARD_YOU_KEY, JSON.stringify(you));
    } catch {
      // Private mode or storage off: the board just won't mark the row.
    }
  }, [data.key, data.shareHref, data.devices, payHref, named]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(t);
  }, [justSaved]);

  const next = nextUnlock(data.devices);
  const status = data.final
    ? COPY.frozen
    : named && data.devices < 1
      ? COPY.toBoard(1)
      : next
        ? COPY.next(next.left, next.part)
        : COPY.allOpen;
  const rankText = data.rank
    ? COPY.rank(data.rank, data.teamsOnBoard)
    : COPY.offBoard;

  return (
    <div className="space-y-3" data-team-row="">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold">
          {data.solo ? COPY.titleSolo : COPY.title}
        </h3>
        <span
          className="shrink-0 text-sm tabular-nums"
          style={{ color: data.rank ? EL.ink : EL.inkSoft }}
        >
          {data.final && data.rank ? `${COPY.final} · ` : ""}
          {rankText}
        </span>
      </div>

      {/* While editing, the editor's pinned preview shows the name instead. */}
      {!open && (
        <StyledTeamName
          name={saved.boardName}
          style={saved.style}
          placeholder={COPY.setToJoin}
          className="block text-[1.75rem] leading-[1.3]"
          sizeStyle={
            named
              ? undefined
              : {
                  fontSize: "1.0625rem",
                  fontStyle: "normal",
                  fontWeight: 600,
                  color: EL.flame,
                }
          }
        />
      )}

      <TeamMeter
        devices={data.devices}
        label={data.solo ? COPY.meterSolo : COPY.meter}
      />
      <p className="text-base font-semibold">{status}</p>

      {!open && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {data.editable && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={`${btnSmall} min-h-11`}
              style={outline}
            >
              {named ? COPY.edit : COPY.setName}
            </button>
          )}
          <Link
            href={boardHref}
            className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
          >
            {COPY.board}
          </Link>
          {justSaved && (
            <span
              className="ml-auto inline-flex items-center gap-1.5 text-sm"
              role="status"
            >
              <Check className="h-4 w-4" /> {COPY.saved}
            </span>
          )}
        </div>
      )}

      {open && (
        <TeamStyleEditor
          token={token}
          demo={demo}
          devices={data.devices}
          solo={data.solo}
          initial={saved}
          onCancel={() => setOpen(false)}
          onSaved={(next) => {
            setSaved(next);
            setOpen(false);
            setJustSaved(true);
          }}
        />
      )}
    </div>
  );
}
