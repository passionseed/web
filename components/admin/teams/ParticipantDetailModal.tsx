"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Phone, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import type { Participant } from "@/types/admin-hackathon";

export function ParticipantDetailModal({
  participant,
  isOwner,
  onClose,
}: {
  participant: Participant;
  isOwner: boolean;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSetPassword() {
    if (!newPassword.trim()) return;
    setSettingPassword(true);
    setPasswordMsg(null);
    try {
      const res = await fetch("/api/admin/hackathon/participants/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id, password: newPassword }),
      });
      if (res.ok) {
        setPasswordMsg({ ok: true, text: `Password set to "${newPassword}"` });
        setNewPassword("");
      } else {
        const d = await res.json();
        setPasswordMsg({ ok: false, text: d.error ?? "Failed" });
      }
    } catch {
      setPasswordMsg({ ok: false, text: "Network error" });
    } finally {
      setSettingPassword(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-slate-900 border border-slate-700/50 text-slate-100 max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-300">
            {participant.name}
            {isOwner && (
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                Owner
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5 text-sm">
            <div className="flex gap-2 text-slate-400">
              <span className="w-24 shrink-0 text-slate-500 text-xs uppercase tracking-wider pt-0.5">Email</span>
              <span className="font-mono text-slate-300 break-all">{participant.email}</span>
            </div>
            {participant.password_hash && (
              <div className="flex gap-2 items-start">
                <span className="w-24 shrink-0 text-slate-500 text-xs uppercase tracking-wider pt-0.5">Orig. hash</span>
                <div className="flex-1 flex flex-col gap-1">
                  <span
                    className="font-mono text-slate-500 break-all text-[10px] leading-relaxed cursor-pointer hover:text-slate-300 transition-colors select-all"
                    title="Click to copy"
                    onClick={() => navigator.clipboard.writeText(participant.password_hash!)}
                  >
                    {participant.password_hash}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-6 px-2 border-slate-700 text-slate-400 hover:text-slate-200 w-fit"
                    onClick={async () => {
                      setSettingPassword(true);
                      setPasswordMsg(null);
                      try {
                        const res = await fetch("/api/admin/hackathon/participants/set-password", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ participantId: participant.id, rawHash: participant.password_hash }),
                        });
                        setPasswordMsg(res.ok
                          ? { ok: true, text: "Original password restored" }
                          : { ok: false, text: "Failed to restore" }
                        );
                      } catch {
                        setPasswordMsg({ ok: false, text: "Network error" });
                      } finally {
                        setSettingPassword(false);
                      }
                    }}
                    disabled={settingPassword}
                  >
                    {settingPassword ? <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" /> : null}
                    Restore original
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-2 items-start">
              <span className="w-24 shrink-0 text-slate-500 text-xs uppercase tracking-wider pt-2">Password</span>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSetPassword(); }}
                    placeholder="Set new password…"
                    className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60"
                  />
                  <Button
                    size="sm"
                    className="text-xs h-7 px-2 bg-blue-600/80 hover:bg-blue-600 text-white shrink-0"
                    onClick={handleSetPassword}
                    disabled={settingPassword || !newPassword.trim()}
                  >
                    {settingPassword ? <Loader2 className="h-3 w-3 animate-spin" /> : "Set"}
                  </Button>
                </div>
                {passwordMsg && (
                  <span className={`text-[11px] font-mono ${passwordMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                    {passwordMsg.text}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 text-slate-400">
              <span className="w-24 shrink-0 text-slate-500 text-xs uppercase tracking-wider pt-0.5">University</span>
              <span className="text-slate-300">{participant.university || "—"}</span>
            </div>
            {participant.grade_level && (
              <div className="flex gap-2 text-slate-400">
                <span className="w-24 shrink-0 text-slate-500 text-xs uppercase tracking-wider pt-0.5">Grade</span>
                <span className="text-slate-300">{participant.grade_level}</span>
              </div>
            )}
            {participant.track && (
              <div className="flex gap-2 text-slate-400">
                <span className="w-24 shrink-0 text-slate-500 text-xs uppercase tracking-wider pt-0.5">Track</span>
                <span className="text-slate-300">{participant.track}</span>
              </div>
            )}
          </div>

          {(participant.phone || participant.line_id || participant.discord_username || participant.instagram_handle) && (
            <div className="border-t border-slate-700/50 pt-3 space-y-2">
              {participant.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  <a href={`tel:${participant.phone}`} className="text-green-300 hover:underline font-mono">
                    {participant.phone}
                  </a>
                </div>
              )}
              {participant.line_id && (
                <div className="flex items-center gap-2 text-sm">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 font-mono">LINE: {participant.line_id}</span>
                </div>
              )}
              {participant.discord_username && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-indigo-400 font-bold text-xs w-3.5 text-center shrink-0">#</span>
                  <span className="text-indigo-300 font-mono">{participant.discord_username}</span>
                </div>
              )}
              {participant.instagram_handle && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-pink-400 font-bold text-xs w-3.5 text-center shrink-0">@</span>
                  <span className="text-pink-300 font-mono">{participant.instagram_handle}</span>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-slate-700/50 pt-2 text-[10px] text-slate-600 font-mono">
            Registered {format(new Date(participant.created_at), "MMM d, yyyy HH:mm")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
