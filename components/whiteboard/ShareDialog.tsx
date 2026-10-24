"use client";

import { Check, Copy, RefreshCw, UserMinus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { WhiteboardMember } from "@/lib/supabase/whiteboards";
import { shareUrl, type LinkAccess, type MemberRole, type WhiteboardRole } from "@/lib/whiteboard/core";

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

  const remove = (userId: string) =>
    run(async () => {
      await call(`/api/whiteboards/${boardId}/members/${userId}`, { method: "DELETE" });
      props.onMembersChange(members.filter((m) => m.userId !== userId));
    });

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-[#141120] text-white">
        <DialogHeader>
          <DialogTitle>แชร์บอร์ด · Share board</DialogTitle>
          <DialogDescription className="text-white/60">
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
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80"
              />
              <button
                type="button"
                onClick={copy}
                disabled={linkAccess === "none" || !link}
                className="ei-button-dusk inline-flex items-center gap-1.5 px-3 py-2 text-sm disabled:opacity-40"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <select
                value={linkAccess}
                disabled={busy}
                onChange={(e) => void setAccess(e.target.value as LinkAccess)}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
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
                className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/90"
              >
                <RefreshCw className="h-3.5 w-3.5" /> เปลี่ยนลิงก์ใหม่ · New link
              </button>
            </div>
          </div>
        )}

        <div className="mt-2 space-y-1">
          <p className="text-xs uppercase tracking-wide text-white/40">คนในบอร์ด · People ({members.length})</p>
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5">
                <Avatar name={m.name} url={m.avatarUrl} online={onlineIds.has(m.userId)} />
                <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                {isOwner && m.role !== "owner" ? (
                  <>
                    <select
                      value={m.role}
                      disabled={busy}
                      onChange={(e) => void setRole(m.userId, e.target.value as MemberRole)}
                      className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      type="button"
                      aria-label={`Remove ${m.name}`}
                      onClick={() => void remove(m.userId)}
                      disabled={busy}
                      className="text-white/40 hover:text-red-400"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-white/40">{ROLE_LABEL[m.role]}</span>
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
        <img src={url} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-orange-500/30 text-xs font-semibold text-orange-100">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#141120] bg-emerald-400" />
      )}
    </span>
  );
}
