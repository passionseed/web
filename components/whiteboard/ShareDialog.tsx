"use client";

import { Check, Copy, RefreshCw, UserMinus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { WhiteboardMember } from "@/lib/supabase/whiteboards";
import { shareUrl, type LinkAccess, type MemberRole, type WhiteboardRole } from "@/lib/whiteboard/core";

import { focusCanvas } from "./chrome/useActiveTool";
import { WB_FONT_VARS } from "./fonts";

const ACCESS_LABEL: Record<LinkAccess, string> = {
  edit: "แก้ไขได้ · Can edit",
  view: "ดูอย่างเดียว · Can view",
  none: "ปิดลิงก์ · Link off",
};

/**
 * What the owner picks for each person. Staff and students both draw; staff
 * also run quests (make them, see everyone's work). Stored as the member's
 * role plus quest_reviewer.
 */
type Seat = "staff" | "student" | "viewer";
const SEAT_LABEL: Record<Seat, string> = { staff: "ทีมงาน · Staff", student: "นักเรียน · Student", viewer: "ดูอย่างเดียว · Viewer" };
const seatOf = (m: Pick<WhiteboardMember, "role" | "questReviewer">): Seat =>
  m.role === "viewer" ? "viewer" : m.questReviewer ? "staff" : "student";
const shownRole = (m: WhiteboardMember) => (m.role === "owner" ? "Owner" : SEAT_LABEL[seatOf(m)].split(" · ")[1]);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  role: WhiteboardRole;
  linkAccess: LinkAccess;
  onLinkAccessChange: (access: LinkAccess) => void;
  shareToken: string | null;
  onShareTokenChange: (token: string) => void;
  members: WhiteboardMember[];
  onMembersChange: (members: WhiteboardMember[]) => void;
  onlineIds: Set<string>;
};

async function call(path: string, init: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json" } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? "Something went wrong");
  return body;
}

export function ShareDialog(props: Props) {
  const { boardId, role, linkAccess, shareToken, members, onlineIds } = props;
  const isOwner = role === "owner";
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const link = shareToken && typeof window !== "undefined" ? shareUrl(window.location.origin, shareToken) : null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const setAccess = (access: LinkAccess) =>
    run(async () => {
      await call(`/api/whiteboards/${boardId}`, { method: "PATCH", body: JSON.stringify({ linkAccess: access }) });
      props.onLinkAccessChange(access);
    });

  const resetLink = () =>
    run(async () => {
      const { shareToken: token } = await call(`/api/whiteboards/${boardId}/share`, { method: "POST" });
      props.onShareTokenChange(token);
      toast.success("ลิงก์เก่าใช้ไม่ได้แล้ว · Old link turned off");
    });

  const setSeat = (userId: string, seat: Seat) =>
    run(async () => {
      const role: MemberRole = seat === "viewer" ? "viewer" : "editor";
      const questReviewer = seat === "staff";
      await call(`/api/whiteboards/${boardId}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role, questReviewer }) });
      props.onMembersChange(members.map((m) => (m.userId === userId ? { ...m, role, questReviewer } : m)));
      if (seat === "staff") toast.success("เป็นทีมงานแล้ว: สร้าง Quest และดูงานทุกคนได้ (ให้เขาเปิดบอร์ดใหม่)");
    });

  const remove = (userId: string) =>
    run(async () => {
      await call(`/api/whiteboards/${boardId}/members/${userId}`, { method: "DELETE" });
      props.onMembersChange(members.filter((m) => m.userId !== userId));
    });

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        // Portalled out of the board: `wb-theme` gives it the board's tokens, light or dark.
        // One column that may shrink: a grid track otherwise grows to its widest row and spills out of the card.
        className={`wb-theme wb-dialog max-w-md grid-cols-[minmax(0,1fr)] ${WB_FONT_VARS}`}
        // Back to the canvas, not the Share button (outside Excalidraw), so shortcuts and paste work again.
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          focusCanvas();
        }}
      >
        <DialogHeader>
          <DialogTitle>แชร์บอร์ด · Share board</DialogTitle>
          <DialogDescription className="wb-soft">
            {isOwner
              ? "ส่งลิงก์ให้เพื่อน ใครเปิดลิงก์แล้วล็อกอินจะเข้ามาวาดด้วยกันได้"
              : "ทุกคนในบอร์ดนี้ เห็นรายชื่อกันหมด"}
          </DialogDescription>
        </DialogHeader>

        {isOwner && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                readOnly
                value={linkAccess === "none" ? "ลิงก์ปิดอยู่ · Link is off" : (link ?? "")}
                onFocus={(e) => e.currentTarget.select()}
                className="wb-input min-w-0 flex-1 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={copy}
                disabled={linkAccess === "none" || !link}
                // Fixed width, so it does not jump when the label changes; the bloom's corner sits right of the label.
                className="wb-btn wb-btn--primary wb-btn--sm inline-flex min-w-[8.5rem] shrink-0 items-center gap-1.5 self-center pl-3 pr-8 text-sm disabled:opacity-40"
              >
                {copied ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
                {copied ? "คัดลอกแล้ว" : "คัดลอก · Copy"}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <select
                value={linkAccess}
                disabled={busy}
                onChange={(e) => void setAccess(e.target.value as LinkAccess)}
                className="wb-input px-3 py-2 text-sm"
              >
                {(Object.keys(ACCESS_LABEL) as LinkAccess[]).map((a) => (
                  <option key={a} value={a}>
                    {ACCESS_LABEL[a]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={resetLink}
                disabled={busy}
                className="wb-link inline-flex items-center gap-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" /> เปลี่ยนลิงก์ใหม่ · New link
              </button>
            </div>
          </div>
        )}

        <div className="wb-dialog__rule mt-2 space-y-1 pt-3">
          <p className="wb-label">
            คนในบอร์ด · People <span className="wb-num">({members.length})</span>
          </p>
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {members.map((m) => (
              <li key={m.userId} className="wb-hover-row flex items-center gap-3 rounded-lg px-2 py-1.5">
                <Avatar name={m.name} url={m.avatarUrl} online={onlineIds.has(m.userId)} />
                <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                {isOwner && m.role !== "owner" ? (
                  <>
                    <select
                      value={seatOf(m)}
                      disabled={busy}
                      aria-label={`บทบาทของ ${m.name} · Role`}
                      onChange={(e) => void setSeat(m.userId, e.target.value as Seat)}
                      className="wb-input shrink-0 px-2 py-1 text-xs"
                    >
                      {(Object.keys(SEAT_LABEL) as Seat[]).map((seat) => (
                        <option key={seat} value={seat}>
                          {SEAT_LABEL[seat]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={`นำ ${m.name} ออก · Remove`}
                      title={`นำ ${m.name} ออก · Remove`}
                      onClick={() => void remove(m.userId)}
                      disabled={busy}
                      className="wb-soft wb-danger -my-1.5 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <span className="wb-soft shrink-0 text-xs">{shownRole(m)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Avatar({ name, url, online, size = 28 }: { name: string; url: string | null; online?: boolean; size?: number }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="wb-avatar" />
      ) : (
        <span className="wb-avatar">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      {online && (
        <span className="wb-online absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" />
      )}
    </span>
  );
}
