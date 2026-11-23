"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import type { PublicTeam } from "@/lib/supabase/hackathon-event-registrations";

/**
 * The team on a person's own page: who has joined and paid, and the invite
 * link to send friends (copy, the phone's share sheet, or LINE).
 */
export function TeamInvite({ team }: { team: PublicTeam }) {
  const [origin, setOrigin] = useState("https://passionseed.org");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === "function");
  }, []);

  const url = `${origin}/hackathon/join?team=${team.inviteCode}`;
  const message = `มาลง ${ELEMENTAL.edition} Hackathon ทีม ${team.name} กัน คนละ ฿${ELEMENTAL.groupPriceBaht} สมัครที่ลิงก์นี้: ${url}`;
  const full = team.spotsLeft === 0;

  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-4 rounded-2xl border p-5 sm:p-6" style={{ borderColor: "rgba(29,33,31,0.18)" }}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-2xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>ทีม {team.name}</p>
        <p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
          {team.roster.length}/{ELEMENTAL.maxGroupSize}
        </p>
      </div>

      <ul className="space-y-1.5 text-sm">
        {team.roster.map((m, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <span>{m.name}</span>
            <span style={{ color: m.paid ? EL.ink : EL.inkSoft }}>{m.paid ? "จ่ายแล้ว" : "ยังไม่จ่าย"}</span>
          </li>
        ))}
      </ul>

      {full ? (
        <p className="text-sm" style={{ color: EL.inkSoft }}>ทีมครบแล้ว</p>
      ) : (
        <div className="space-y-3 border-t pt-4" style={{ borderColor: "rgba(29,33,31,0.12)" }}>
          <p className="text-sm">
            ส่งลิงก์ให้เพื่อนอีก {team.spotsLeft} คน แต่ละคนสมัครและจ่ายเอง คนละ ฿{ELEMENTAL.groupPriceBaht}
          </p>
          <p className="break-all rounded-lg bg-white px-3 py-2 text-sm" style={{ fontFamily: EL_FONT.mono }}>{url}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
              style={{ backgroundColor: EL.flame, color: EL.flameWhite }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
            </button>
            {canShare ? (
              <button
                type="button"
                onClick={() => navigator.share({ text: message }).catch(() => undefined)}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                style={{ boxShadow: `inset 0 0 0 1px ${EL.ink}` }}
              >
                <Share2 className="h-4 w-4" /> แชร์
              </button>
            ) : (
              <a
                href={`https://line.me/R/share?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                style={{ boxShadow: `inset 0 0 0 1px ${EL.ink}` }}
              >
                <Share2 className="h-4 w-4" /> ส่งใน LINE
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
