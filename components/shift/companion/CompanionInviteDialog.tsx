"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CompanionInvite } from "@/lib/shift/companion-contract";

export function CompanionInviteDialog({ invite, cohortName, onClose }: {
  invite: CompanionInvite; cohortName: string; onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const instructions = `SHIFT Companion · ${cohortName}\nCode: ${invite.code}\nSign in to the SHIFT Companion app, open Connect, enter this code and your mobile, then tap Connect.\nExpires: ${new Date(invite.expires_at).toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok" })}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(invite.code);
      setMessage("Code copied.");
    } catch { setMessage("Select the code above and copy it."); }
  }
  async function share() {
    if (!navigator.share) {
      try { await navigator.clipboard.writeText(instructions); setMessage("Code and instructions copied."); }
      catch { setMessage("Select the code above and copy it."); }
      return;
    }
    try { await navigator.share({ title: "SHIFT Companion", text: instructions }); }
    catch (e) { if (!(e instanceof Error && e.name === "AbortError")) setMessage("Could not share. Copy the code instead."); }
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="dusk-theme dark max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-white/15 bg-[var(--dusk-space-900)] text-white">
        <DialogTitle>Hand this code to one person</DialogTitle>
        <DialogDescription className="text-slate-300">Shown once. Copy or share it before closing.</DialogDescription>
        <p className="break-words text-sm text-slate-300">{cohortName} · Invite {invite.roster_id.slice(-6).toUpperCase()}</p>
        <p className="select-all py-4 text-center font-mono text-5xl font-semibold tracking-[0.15em]" aria-label={`Invite code ${invite.code}`}>{invite.code}</p>
        <div className="grid grid-cols-2 gap-3">
          <Button className="min-h-11" onClick={() => void copy()}><Copy className="mr-2 h-4 w-4" />Copy code</Button>
          <Button className="min-h-11" onClick={() => void share()}><Share2 className="mr-2 h-4 w-4" />Share</Button>
        </div>
        <p className="text-sm text-slate-300">In the mobile app: sign in, open Connect, enter the code and mobile, then tap Connect.</p>
        <p className="text-sm text-slate-300">Expires in 30 days, on {new Date(invite.expires_at).toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok" })}. If it is lost before being claimed, issue a replacement from the roster.</p>
        <p role="status" className="min-h-5 text-sm text-slate-300">{message}</p>
        <Button variant="secondary" className="min-h-11" onClick={onClose}>Done, hide code</Button>
      </DialogContent>
    </Dialog>
  );
}
