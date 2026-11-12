"use client";

import { UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { CanvasAccess } from "@/lib/whiteboard/canvas-access";

export type Person = { userId: string; name: string; role: string };

type Props = {
  access: CanvasAccess;
  at: { x: number; y: number };
  canManage: boolean;
  /** Everyone on the board. Only its editors can join a team. */
  people: Person[];
  nameOf: (id: string) => string;
  onChange: (editors: string[]) => void;
  onTransfer: (owner: string) => void;
  onClose: () => void;
  /** Opens the board's share dialog. Only the board's owner has the invite link, so others get no button. */
  onInvite?: () => void;
};

/**
 * Who is on a SHIFT canvas's team. Its owner (and moderators) pick teammates
 * from the people on the board who can edit it, and can hand the canvas to one
 * of them; everyone else sees the team and whom to ask.
 */
export function TeamPanel({ access, at, canManage, people, nameOf, onChange, onTransfer, onClose, onInvite }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  // Handing a canvas over takes two clicks: the first asks, the second does it.
  const [handingTo, setHandingTo] = useState<string | null>(null);

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("input:not(:disabled), button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panel.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onClose]);

  // Teammates come from the board's editors; its owner can already change every canvas.
  const others = people.filter((p) => p.userId !== access.owner && p.role !== "owner");
  const candidates = others.filter((p) => p.role === "editor");
  const watchers = others.filter((p) => p.role === "viewer");
  const viewport = typeof window !== "undefined" ? window.innerWidth : 1200;
  const width = Math.min(300, viewport - 24);
  const left = Math.min(Math.max(at.x - width, 12), viewport - width - 12);
  const top = Math.max(at.y + 8, 12);

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label="ทีมของแคนวาสนี้"
      className="wb-window wb-version-panel pointer-events-auto absolute flex flex-col"
      style={{ left, top, width, maxHeight: `calc(100vh - ${top + 12}px)` }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="wb-rule flex items-center justify-between border-b px-3 py-2">
        <p className="text-sm font-semibold">ทีมของแคนวาสนี้</p>
        <button type="button" onClick={onClose} aria-label="ปิด · Close" className="wb-soft rounded-md p-1.5 hover:bg-black/5">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 text-sm">
        <p className="flex items-center justify-between">
          <span className="font-medium">{nameOf(access.owner)}</span>
          <span className="wb-soft text-xs">เจ้าของ</span>
        </p>
        {canManage ? (
          <>
            {candidates.map((p) => (
              <div key={p.userId} className="flex items-center justify-between gap-2 py-0.5">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <input
                    type="checkbox"
                    checked={access.editors.includes(p.userId)}
                    onChange={(e) =>
                      onChange(
                        e.target.checked ? [...access.editors, p.userId] : access.editors.filter((id) => id !== p.userId),
                      )
                    }
                    className="h-4 w-4 accent-[#3d4bd8]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => (handingTo === p.userId ? onTransfer(p.userId) : setHandingTo(p.userId))}
                  onBlur={() => setHandingTo((id) => (id === p.userId ? null : id))}
                  className="wb-soft shrink-0 rounded-md px-1.5 py-0.5 text-xs hover:bg-black/5"
                >
                  {handingTo === p.userId ? "กดอีกครั้งเพื่อยืนยัน" : "ให้เป็นเจ้าของ"}
                </button>
              </div>
            ))}
            {watchers.map((p) => (
              <label key={p.userId} className="wb-soft flex items-center justify-between gap-2 py-0.5">
                <span className="min-w-0 truncate">
                  {p.name} <span className="text-xs">· ดูบอร์ดได้อย่างเดียว</span>
                </span>
                <input type="checkbox" checked={false} disabled readOnly className="h-4 w-4" />
              </label>
            ))}
            {candidates.length === 0 && (
              <p className="wb-soft pt-1 text-xs">
                {watchers.length > 0
                  ? "คนที่ดูบอร์ดได้อย่างเดียวเข้าทีมไม่ได้ ให้เจ้าของบอร์ดเปลี่ยนเป็น Editor ก่อน"
                  : "ยังไม่มีใครบนบอร์ดนี้ให้เลือกเข้าทีม"}
                {!onInvite && " ขอให้เจ้าของบอร์ดส่งลิงก์ชวนเพื่อนเข้าบอร์ด"}
              </p>
            )}
            {onInvite && (
              <button
                type="button"
                onClick={onInvite}
                className="wb-tile mt-2 flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold"
              >
                <UserPlus className="h-3.5 w-3.5" />
                ชวนเพื่อนเข้าบอร์ด
              </button>
            )}
          </>
        ) : (
          <>
            {access.editors.map((id) => (
              <p key={id}>{nameOf(id)}</p>
            ))}
            <p className="wb-soft pt-1 text-xs">อยากช่วยแก้ ขอให้ {nameOf(access.owner)} เพิ่มคุณในทีม</p>
          </>
        )}
      </div>
      <p className="wb-rule wb-soft border-t px-3 py-2 text-xs">
        คนในทีมแก้แคนวาสนี้ได้ คนอื่นบนบอร์ดดูได้อย่างเดียว เจ้าของส่งต่อแคนวาสให้เพื่อนในบอร์ดได้
      </p>
    </div>
  );
}
