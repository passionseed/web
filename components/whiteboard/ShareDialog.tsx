"use client";

import { Check, Copy, Flag, RefreshCw, UserMinus } from "lucide-react";
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

const ROLE_LABEL: Record<WhiteboardRole, string> = { owner: "Owner", editor: "Editor", viewer: "Viewer" };

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

  const setRole = (userId: string, next: MemberRole) =>
    run(async () => {
      await call(`/api/whiteboards/${boardId}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role: next }) });
      props.onMembersChange(members.map((m) => (m.userId === userId ? { ...m, role: next } : m)));
    });

  const setReviewer = (userId: string, on: boolean) =>
    run(async () => {
      await call(`/api/whiteboards/${boardId}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ questReviewer: on }) });
      props.onMembersChange(members.map((m) => (m.userId === userId ? { ...m, questReviewer: on } : m)));
      toast.success(on ? "ดูงาน Quest ของทุกคนได้แล้ว (เปิดบอร์ดใหม่)" : "ปิดการดูงาน Quest แล้ว");
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
        className={`wb-theme wb-dialog max-w-md ${WB_FONT_VARS}`}
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
                    <button
                      type="button"
                      aria-pressed={Boolean(m.questReviewer)}
                      disabled={busy}
                      onClick={() => void setReviewer(m.userId, !m.questReviewer)}
                      title={m.questReviewer ? "ดูงาน Quest ของทุกคนได้ · กดเพื่อปิด" : "ให้ดูงาน Quest ของทุกคน"}
                      className={`wb-version-chip inline-flex items-center gap-1 rounded-md px-2 text-xs ${
                        m.questReviewer ? "wb-version-chip--on font-semibold" : "wb-soft"
                      }`}
                    >
                      <Flag className="h-3 w-3" />
                      Quest
                    </button>
                    <select
                      value={m.role}
                      disabled={busy}
                      onChange={(e) => void setRole(m.userId, e.target.value as MemberRole)}
                      className="wb-input px-2 py-1 text-xs"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
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
                  <span className="wb-soft text-xs">{ROLE_LABEL[m.role]}</span>
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
