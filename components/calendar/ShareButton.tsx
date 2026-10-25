"use client";

import { Instagram } from "lucide-react";
import { toast } from "sonner";

import type { CalendarBlock } from "@/lib/calendar/core";
import { blockLink, fillTemplate, type ShareSettings } from "@/lib/calendar/notify";

/** Where a block's link goes: its own page, or the alumni page for the weekly session. */
function linkFor(block: CalendarBlock): string {
  const origin = window.location.origin;
  return block.source === "alumni" ? `${origin}/shift/alumni` : blockLink(origin, block.id);
}

/**
 * Instagram has no API for group chats, so this fills in the message and hands
 * it over: the phone's share sheet (pick Instagram, then the group), or on a
 * computer it copies the text and opens the group chat to paste into.
 */
export function ShareButton({ block, share, prominent }: { block: CalendarBlock; share: ShareSettings; prominent?: boolean }) {
  const onShare = async () => {
    const text = fillTemplate(share.template, block, linkFor(block));
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(share.igGroupUrl ? "คัดลอกข้อความแล้ว วางในกลุ่ม IG ได้เลย" : "คัดลอกข้อความแล้ว ไปวางในกลุ่มได้เลย");
    } catch {
      toast.error("คัดลอกไม่ได้ ลองกดค้างที่ข้อความแทน");
    }
    if (share.igGroupUrl) window.open(share.igGroupUrl, "_blank", "noopener");
  };

  return (
    <button
      type="button"
      onClick={() => void onShare()}
      className={
        prominent
          ? "inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 px-3 py-1.5 text-xs font-semibold text-white"
          : "cal-line inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs"
      }
    >
      <Instagram className="h-3.5 w-3.5" /> แชร์ลงกลุ่ม IG
    </button>
  );
}
