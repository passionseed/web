"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { teamLabel } from "@/lib/hackathon/elemental/team-name";

import { changeTeam } from "./TeamJoin";

/** The team a friend's invite link points at, as the pay page found it (null: no team has that code). */
export type TeamOfferTarget = { id: string; name: string; size: number; spotsLeft: number } | null;

const solid = { backgroundColor: EL.ink, color: EL.cream };
const button = "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-70";

/**
 * At the top of a person's own page when they came from a friend's team link
 * (?join=<code>): join that team in one tap, or move to it from the team
 * they're in. Before this, someone who had already signed up (alone at ฿199
 * or in a team at ฿149) and then opened a friend's invite link could only
 * sign up again (Big, 2026-11-28).
 */
export function TeamOffer({
  token,
  code,
  target,
  current,
  memberCount,
  notes,
  open,
  closedNote,
  demo,
}: {
  token: string;
  /** The team code from the link, sent back to the API as it came. */
  code: string;
  target: TeamOfferTarget;
  /** The team this sign-up is in now. */
  current: { id: string; name: string } | null;
  memberCount: number;
  /** What the change does to this sign-up's price, slip and pass. One line each. */
  notes: string[];
  open: boolean;
  closedNote: string;
  demo?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  /** Drop ?join from the address and show the page as usual. */
  const dismiss = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("join");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
    router.refresh();
  };

  const go = async () => {
    setBusy(true);
    setError(null);
    const failed = await changeTeam(token, current ? { action: "switch", code } : { action: "join", code }, demo);
    setBusy(false);
    if (failed) return setError(failed);
    if (demo) return setDone(current ? "ย้ายทีมแล้ว (เดโม ไม่ได้บันทึก)" : "เข้าทีมแล้ว (เดโม ไม่ได้บันทึก)");
    dismiss();
  };

  const label = target ? teamLabel(target.name) : "";
  const sameTeam = !!target && current?.id === target.id;
  const full = !!target && !sameTeam && target.spotsLeft < memberCount;
  const blocked = !open
    ? closedNote
    : !target
      ? "ไม่พบทีมจากลิงก์นี้ ขอลิงก์ใหม่จากเพื่อน หรือขอรหัสทีม 8 ตัว"
      : sameTeam
        ? `อยู่${label}แล้ว`
        : full
          ? `${label} ครบ ${ELEMENTAL.maxGroupSize} คนแล้ว`
          : null;

  return (
    <section id="team-offer" className="mt-6 space-y-4 rounded-2xl p-5 sm:p-6" style={{ boxShadow: `inset 0 0 0 2px ${EL.ink}` }}>
      {blocked ? (
        <p className="text-lg">{blocked}</p>
      ) : (
        <>
          <div className="space-y-1">
            <p className="text-2xl" style={{ lineHeight: 1.25 }}>
              {current ? `ย้ายไป${label}` : `เข้า${label}`}
            </p>
            <p className="text-sm" style={{ color: EL.inkSoft }}>
              {current
                ? `ตอนนี้อยู่${teamLabel(current.name)} กดย้ายแล้วจะออกจากทีมเดิมและเข้าทีมนี้ทันที`
                : `เพื่อนชวนเข้าทีมนี้ ในทีมตอนนี้ ${target!.size} คน ว่างอีก ${target!.spotsLeft} ที่`}
            </p>
          </div>
          <button type="button" onClick={go} disabled={busy || !!done} className={`${button} w-full`} style={solid}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {current ? `ย้ายไป${label}` : `เข้า${label}`}
          </button>
          {error && (
            <p role="alert" className="text-sm" style={{ color: EL.ember }}>
              {error}
            </p>
          )}
          {done && (
            <p role="status" className="text-sm">
              {done}
            </p>
          )}
          <div className="space-y-1 text-sm" style={{ color: EL.inkSoft }}>
            {notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </>
      )}
      <button type="button" onClick={dismiss} className="text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
        {blocked ? "ปิด" : "ไม่ใช่ตอนนี้"}
      </button>
    </section>
  );
}
