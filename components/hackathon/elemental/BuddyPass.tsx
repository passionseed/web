"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { PixelEdge } from "@/components/hackathon/poster/elemental/pixel-art";
import {
  BUDDY_OWE,
  BUDDY_OWE_KEYS,
  DEFAULT_BUDDY_OWE,
  buddyOweLabel,
  buddyPassMessage,
  buddyPassUrl,
  type BuddyOwe,
} from "@/lib/hackathon/elemental/buddy-pass";
import type { PublicBuddyPass } from "@/lib/supabase/hackathon-event-registrations";

/**
 * The buddy pass on a solo person's own page. Built like TeamInvite (same
 * card, same buttons) with two Elemental touches: a row of hazard pixels on
 * its edge, and a torn-ticket dashed line between the offer and the link.
 * - locked: not paid yet, so no link (only a note that one is coming)
 * - available: pick what the friend owes, then copy or share the link
 * - claimed / paid: who used it (first name only) and what they owe
 */

const SAVED = ELEMENTAL.groupPriceBaht - ELEMENTAL.buddyPriceBaht;

/** The row of pixels "corrupting" the card's edge now lives with the other pixel art (the dark slabs use it too). */
export { PixelEdge };

const tag = { fontFamily: EL_FONT.mono, color: EL.inkSoft } as const;
const display = { fontFamily: EL_FONT.display, fontWeight: 300 } as const;
const tear = { borderColor: "rgba(29,33,31,0.25)" } as const;

export function BuddyPass({ pass }: { pass: PublicBuddyPass }) {
  if (pass.state === "locked") {
    return (
      <section className="overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(29,33,31,0.18)" }}>
        <PixelEdge />
        <div className="space-y-2 p-5 sm:p-6">
          <p className="text-xs" style={tag}>[บัตรเพื่อน ฿{ELEMENTAL.buddyPriceBaht} · ล็อกอยู่]</p>
          <p className="text-sm" style={{ color: EL.inkSoft }}>
            สลิปผ่านเมื่อไหร่ บัตรเพื่อน 1 ใบจะปลดล็อกตรงนี้ ส่งให้เพื่อน 1 คน จ่ายแค่ ฿{ELEMENTAL.buddyPriceBaht}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(29,33,31,0.18)" }}>
      <PixelEdge />
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-2xl" style={display}>บัตรเพื่อน ฿{ELEMENTAL.buddyPriceBaht}</p>
          <p className="text-xs" style={tag}>{pass.state === "available" ? "[เหลือ 1/1]" : "[ใช้แล้ว 1/1]"}</p>
        </div>
        {pass.state === "available" ? <Available code={pass.code} /> : <Claimed friendName={pass.friendName} owe={pass.owe} paid={pass.state === "paid"} />}
      </div>
    </section>
  );
}

function Claimed({ friendName, owe, paid }: { friendName: string; owe: BuddyOwe; paid: boolean }) {
  return (
    <>
      <p className="text-sm">
        {paid ? `${friendName} จ่ายแล้ว เจอกันในงาน` : `${friendName} ใช้บัตรแล้ว รอจ่าย ที่นั่งยืนยันเมื่อสลิปผ่าน`}
      </p>
      <IouSlip debt={`${friendName} ติดคุณ`} owe={owe} />
    </>
  );
}

function Available({ code }: { code: string }) {
  const [origin, setOrigin] = useState("https://passionseed.org");
  const [owe, setOwe] = useState<BuddyOwe>(DEFAULT_BUDDY_OWE);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === "function");
  }, []);

  const url = buddyPassUrl(origin, code, owe);
  const message = buddyPassMessage(url, owe);

  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <p className="text-sm">
        จ่ายคนเดียวครบแล้ว เลยได้บัตรนี้ 1 ใบ ส่งให้เพื่อน 1 คน เพื่อนจ่ายแค่ ฿{ELEMENTAL.buddyPriceBaht} แทน ฿{ELEMENTAL.groupPriceBaht}
      </p>
      <p className="text-xs" style={tag}>
        [฿{ELEMENTAL.priceBaht} + ฿{ELEMENTAL.buddyPriceBaht} = ฿{ELEMENTAL.groupPriceBaht} × 2]
      </p>

      <div className="space-y-3 border-t border-dashed pt-4" style={tear}>
        <p className="text-sm">ส่วนที่เพื่อนประหยัดไป ฿{SAVED} ให้ใช้คืนเป็น</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="เพื่อนติดอะไรคุณ">
          {BUDDY_OWE_KEYS.map((k) => {
            const on = owe === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setOwe(k)}
                className="rounded-full border px-4 py-2 text-sm"
                style={{ borderColor: on ? EL.flame : "rgba(29,33,31,0.18)", boxShadow: on ? `inset 0 0 0 1px ${EL.flame}` : undefined }}
              >
                {BUDDY_OWE[k].th}
              </button>
            );
          })}
        </div>
        <p className="text-xs" style={{ color: EL.inkSoft }}>ไม่มีใครทวงในระบบ เคลียร์กันเองตอนเจอ</p>

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
        <p className="text-xs" style={{ color: EL.inkSoft }}>ใช้ได้คนเดียว ใครสมัครก่อนได้ไป</p>
      </div>
    </>
  );
}

/** The joke receipt: who owes whom what. Dashed like a torn-off ticket stub. */
export function IouSlip({ debt, owe }: { debt: string; owe: BuddyOwe }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-3" style={tear}>
      <p className="text-xs" style={tag}>[ใบติดหนี้]</p>
      <p className="mt-1 text-lg" style={display}>
        {debt} {buddyOweLabel(owe)}
      </p>
    </div>
  );
}
