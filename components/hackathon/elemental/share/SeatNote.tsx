"use client";

import { useState, type ReactNode } from "react";

import { canNameSeat, type SeatProgressView, type SeatSlotView } from "@/lib/hackathon/elemental/share-rules";

import { CodeEntry } from "./CodeEntry";
import { lineHelp } from "./copy-shared";
import { Body, CodeText, EditorialLink, Tag, v } from "./ui";

/**
 * The seats a link has earned (up to SEAT_RULE.maxSeatsPerLink), as a clean
 * list on the dark ground: the seat, whose it is, what staff are doing, and a
 * code field where a name is still needed. People show by code only.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  heading: "ที่นั่งฟรีของลิงก์นี้",
  seat: { student: (i: number) => `ที่นั่งฟรีที่ ${i}`, teacher: (i: number) => `ที่นั่งที่ ${i}` },
  mineChecking: "ที่นั่งของคุณ ทีมงานกำลังเช็ก ผ่านแล้วไม่ต้องโอน",
  mineGiven: "ที่นั่งของคุณเป็นที่นั่งฟรีแล้ว ไม่ต้องโอน",
  otherChecking: "ยกให้",
  otherCheckingTail: "ทีมงานกำลังเช็ก",
  otherGiven: "เป็นของ",
  rejected: `ทีมงานเช็กแล้วไม่ผ่าน ถ้าคิดว่าผิดพลาด ${lineHelp}`,
  gifted: "คุณได้ที่นั่งจากเพื่อนแล้ว ยกที่นั่งนี้ให้เพื่อนอีกคน",
  recipientPaid: { student: "เพื่อนคนนี้จ่ายแล้ว ใส่รหัสคนอื่น", teacher: "นักเรียนคนนี้จ่ายแล้ว ใส่รหัสคนอื่น" },
  needs: {
    student: "ยกให้เพื่อนที่สมัครแล้วแต่ยังไม่จ่าย 1 คน",
    teacher: "ให้นักเรียนที่สมัครแล้วแต่ยังไม่จ่าย 1 คน",
  },
  codeLabel: { student: "รหัสของเพื่อน", teacher: "รหัสนักเรียน" },
  codeHint: {
    student: "ขอรหัส 8 ตัวจากหน้าที่นั่งของเพื่อน",
    teacher: "นักเรียนดูรหัส 8 ตัวได้ที่หน้าที่นั่งของตัวเอง",
  },
  submit: { student: "ยกที่นั่งให้เพื่อน", teacher: "ให้ที่นั่งฟรี" },
  rename: "ใส่รหัสผิด เปลี่ยนรหัส",
  mySeat: "ดูที่นั่งของฉัน",
};

type Kind = "student" | "teacher";

function SeatLine({
  kind,
  seat,
  phase,
  gifted,
  backHref,
  onName,
}: {
  kind: Kind;
  seat: SeatSlotView;
  phase: SeatProgressView["phase"];
  /** The owner already has a seat from a friend: this one, their own first, goes to another friend. */
  gifted: boolean;
  backHref?: string;
  onName: (index: number, code: string) => Promise<string | null>;
}) {
  const [renaming, setRenaming] = useState(false);
  // A named friend who has paid since can't take it: the code field opens again.
  const naming = canNameSeat(seat, phase) && (seat.status === "needs_recipient" || !!seat.recipientPaid || renaming);
  let text: ReactNode;
  if (seat.status === "rejected") text = COPY.rejected;
  else if (seat.status === "needs_recipient") text = gifted ? COPY.gifted : COPY.needs[kind];
  else if (seat.recipientPaid)
    text = (
      <>
        {COPY.otherChecking} <CodeText code={seat.recipientCode ?? ""} className="whitespace-nowrap" /> · {COPY.recipientPaid[kind]}
      </>
    );
  else if (seat.mine) text = seat.status === "confirmed" ? COPY.mineGiven : COPY.mineChecking;
  else
    text = (
      <>
        {seat.status === "confirmed" ? COPY.otherGiven : COPY.otherChecking} <CodeText code={seat.recipientCode ?? ""} className="whitespace-nowrap" />
        {seat.status === "confirmed" ? "" : ` · ${COPY.otherCheckingTail}`}
      </>
    );

  return (
    <li className="space-y-2 border-t py-5" style={{ borderColor: v.rule }}>
      <Tag tone={seat.status === "needs_recipient" || seat.recipientPaid ? "action" : "secondary"}>{COPY.seat[kind](seat.index)}</Tag>
      <Body as="div" className={seat.status === "rejected" ? "opacity-70" : undefined}>
        {text}
      </Body>
      {naming && (
        <div className="pt-2">
          <CodeEntry
            label={COPY.codeLabel[kind]}
            hint={COPY.codeHint[kind]}
            submitLabel={COPY.submit[kind]}
            onSubmit={async (code) => {
              const problem = await onName(seat.index, code);
              if (!problem) setRenaming(false);
              return problem;
            }}
          />
        </div>
      )}
      {!naming && seat.status === "qualified" && !seat.mine && !seat.recipientPaid && canNameSeat(seat, phase) && (
        <EditorialLink size="sm" arrow={false} onClick={() => setRenaming(true)}>
          {COPY.rename}
        </EditorialLink>
      )}
      {seat.mine && seat.status === "confirmed" && backHref && (
        <EditorialLink size="sm" href={backHref}>
          {COPY.mySeat}
        </EditorialLink>
      )}
    </li>
  );
}

/** Every earned seat of a link. Nothing when none is earned yet. */
export function SeatList({
  kind,
  view,
  backHref,
  onName,
}: {
  kind: Kind;
  view: SeatProgressView;
  /** Students: their own pay page, for "ดูที่นั่งของฉัน". */
  backHref?: string;
  onName: (index: number, code: string) => Promise<string | null>;
}) {
  if (view.seats.length === 0) return null;
  return (
    <section aria-label={COPY.heading} className="border-b" style={{ borderColor: v.rule }}>
      <ul>
        {view.seats.map((seat) => (
          <SeatLine key={seat.index} kind={kind} seat={seat} phase={view.phase} gifted={kind === "student" && !!view.giftedToYou && seat.index === 1} backHref={backHref} onName={onName} />
        ))}
      </ul>
    </section>
  );
}

/** Whether any seat still needs its owner to type a code (that's the page's one action then): no one named yet, or the named friend paid. */
export const needsName = (view: SeatProgressView) =>
  view.seats.some((s) => (s.status === "needs_recipient" || s.recipientPaid) && canNameSeat(s, view.phase));
