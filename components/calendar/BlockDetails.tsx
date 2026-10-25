"use client";

import { ClipboardList, ExternalLink, MapPin, Pencil, StickyNote, Trash2, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

import { KIND_STYLE, bangkokParts, shortThaiDay, timeRange, type CalendarBlock } from "@/lib/calendar/core";
import type { Attendance } from "@/lib/calendar/attendance";
import type { ShareSettings } from "@/lib/calendar/notify";

import { ShareButton } from "./ShareButton";

/** Everything about one block, with join / edit / delete and optional extra actions. */
export function BlockDetails({
  block,
  share,
  fresh,
  onJoin,
  onEdit,
  onDelete,
  onPlace,
}: {
  block: CalendarBlock;
  share: ShareSettings;
  /** Just added: nudge the creator to tell the group. */
  fresh?: boolean;
  onJoin: (joined: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Whiteboard only: drop the block onto the canvas as a sticky. */
  onPlace?: () => void;
}) {
  const style = KIND_STYLE[block.kind];
  const editable = block.source === "block";
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: style.color }} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{block.title}</p>
          <p className="text-xs opacity-70">
            {shortThaiDay(bangkokParts(block.startsAt).date)} · {timeRange(block)} · {style.label}
          </p>
        </div>
      </div>
      {fresh && (
        <div className="rounded-lg bg-pink-500/10 p-2.5 text-xs">
          <p className="mb-1.5 font-medium">เพิ่มแล้ว! บอกเพื่อนในกลุ่มเลยไหม</p>
          <ShareButton block={block} share={share} prominent />
        </div>
      )}
      {(block.room || (block.boardUrl && block.source === "block")) && <RoomLinks block={block} />}
      {block.place && (
        <p className="flex items-center gap-1.5 text-xs opacity-80">
          <MapPin className="h-3.5 w-3.5" /> {block.place}
        </p>
      )}
      {block.note && <p className="whitespace-pre-wrap text-xs opacity-80">{block.note}</p>}
      {block.createdBy && <p className="text-xs opacity-60">สร้างโดย {block.createdBy.name}</p>}
      {editable && (
        <p className="text-xs">
          <span className="opacity-60">มา {block.people.length} คน</span>
          {block.people.length > 0 && <span className="opacity-80">: {block.people.map((p) => p.name).join(", ")}</span>}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {editable && (
          <button
            type="button"
            onClick={() => onJoin(!block.joined)}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${block.joined ? "border cal-line" : "bg-orange-500 text-white"}`}
          >
            {block.joined ? "✓ ไปด้วย (กดเพื่อยกเลิก)" : "ไปด้วย"}
          </button>
        )}
        {block.boardUrl && block.source === "team" && (
          <a href={block.boardUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border cal-line px-2.5 py-1 text-xs">
            <ExternalLink className="h-3.5 w-3.5" /> บอร์ดทีม
          </a>
        )}
        {block.source !== "team" && !fresh && <ShareButton block={block} share={share} />}
        {onPlace && (
          <button type="button" onClick={onPlace} className="inline-flex items-center gap-1 rounded-lg border cal-line px-2.5 py-1 text-xs">
            <StickyNote className="h-3.5 w-3.5" /> วางบนบอร์ด
          </button>
        )}
        {block.canEdit && (
          <>
            <button type="button" title="Edit" onClick={onEdit} className="ml-auto rounded-md p-1 opacity-60 hover:opacity-100">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => window.confirm("ลบนัดนี้? ทุกคนจะไม่เห็นอีก") && onDelete()}
              className="rounded-md p-1 opacity-60 hover:text-red-500 hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Opens 15 minutes before the start, until the end. */
const ROOM_OPENS_MS = 15 * 60_000;

/**
 * The room: the Discord voice channel and the room board, side by side, and
 * once it has started, how many who booked have arrived (counts only).
 */
function RoomLinks({ block }: { block: CalendarBlock }) {
  const now = Date.now();
  const live = now >= Date.parse(block.startsAt) - ROOM_OPENS_MS && now <= Date.parse(block.endsAt);
  const started = now >= Date.parse(block.startsAt);
  const [attendance, setAttendance] = useState<Attendance | null>(null);

  useEffect(() => {
    if (!started || !block.boardUrl || block.source !== "block") return;
    let cancelled = false;
    fetch(`/api/calendar/${block.id}/attendance`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { attendance: Attendance | null } | null) => !cancelled && setAttendance(data?.attendance ?? null))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [block.id, block.boardUrl, block.source, started]);

  const link = (live: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${live ? "bg-indigo-500 text-white" : "border cal-line"}`;

  return (
    <div className="space-y-1.5 rounded-lg border cal-line p-2">
      <p className="text-xs font-medium">{live ? "ห้องเปิดแล้ว เข้ามาเลย" : "ห้องของนัดนี้"}</p>
      <div className="flex flex-wrap gap-1.5">
        {block.room && (
          <a href={block.room.url} target="_blank" rel="noreferrer" className={link(live)}>
            <Volume2 className="h-3.5 w-3.5" /> เข้าห้อง {block.room.name}
          </a>
        )}
        {block.boardUrl && (
          <a href={block.boardUrl} target="_blank" rel="noreferrer" className={link(live && !block.room)}>
            <ClipboardList className="h-3.5 w-3.5" /> บอร์ดห้อง
          </a>
        )}
      </div>
      <p className="text-[11px] opacity-60">มาถึงแปะการ์ด 👋 · ติดตรงไหนแปะ 🙏 · ช่วยได้แปะ 🙋 · ก่อนออกแปะ ✅ สิ่งที่จะทำต่อ</p>
      {attendance && (
        <p className="text-xs">
          มาแล้ว {attendance.bookedArrived}/{attendance.booked} คนที่จอง
          {attendance.walkIns > 0 ? ` · มาเพิ่ม ${attendance.walkIns}` : ""} · ขอความเห็น {attendance.askedHelp} · ช่วยเพื่อน{" "}
          {attendance.gaveHelp} · ปิดท้าย {attendance.closed}
        </p>
      )}
    </div>
  );
}
