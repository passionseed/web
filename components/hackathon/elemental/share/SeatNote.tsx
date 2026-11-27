"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { canNameSeat, type SeatProgressView, type SeatSlotView } from "@/lib/hackathon/elemental/share-rules";

import { CodeEntry } from "./CodeEntry";
import { lineHelp } from "./copy-shared";
import { btn, CodeText, filled, hairline, TextButton } from "./ui";

/**
 * The seats a link has earned (up to SEAT_RULE.maxSeatsPerLink), one line
 * each: whose it is, what staff are doing, and a code box where a name is
 * still needed. People show by code only.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  heading: "ที่นั่งฟรีของลิงก์นี้",
  seat: (i: number) => `ที่นั่งฟรีที่ ${i}`,
  mineChecking: "ที่นั่งของคุณ ทีมงานกำลังเช็ก ผ่านแล้วไม่ต้องโอน",
  mineGiven: "ที่นั่งของคุณเป็นที่นั่งฟรีแล้ว ไม่ต้องโอน",
  otherChecking: "ยกให้",
  otherCheckingTail: "ทีมงานกำลังเช็ก ผ่านแล้วคนนี้ไม่ต้องโอน",
  otherGiven: "ที่นั่งฟรีเป็นของ",
  rejected: `ทีมงานเช็กแล้วไม่ผ่าน ถ้าคิดว่าผิดพลาด ${lineHelp}`,
  needs: {
    student: "ใส่รหัสเพื่อนที่สมัครแล้วแต่ยังไม่จ่าย 1 คน ทีมงานเช็กแล้วเพื่อนไม่ต้องโอน",
    teacher: "ใส่รหัสนักเรียนที่สมัครแล้วแต่ยังไม่จ่าย 1 คน ทีมงานเช็กแล้วนักเรียนคนนั้นไม่ต้องโอน",
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
  backHref,
  onName,
}: {
  kind: Kind;
  seat: SeatSlotView;
  phase: SeatProgressView["phase"];
  backHref?: string;
  onName: (index: number, code: string) => Promise<string | null>;
}) {
  const [renaming, setRenaming] = useState(false);
  const naming = canNameSeat(seat, phase) && (seat.status === "needs_recipient" || renaming);
  let text: ReactNode;
  if (seat.status === "rejected") text = COPY.rejected;
  else if (seat.status === "needs_recipient") text = COPY.needs[kind];
  else if (seat.mine) text = seat.status === "confirmed" ? COPY.mineGiven : COPY.mineChecking;
  else
    text = (
      <>
        {seat.status === "confirmed" ? COPY.otherGiven : COPY.otherChecking}{" "}
        <CodeText code={seat.recipientCode ?? ""} className="whitespace-nowrap" />
        {seat.status === "confirmed" ? " แล้ว" : ` · ${COPY.otherCheckingTail}`}
      </>
    );

  return (
    <li className="space-y-2 py-4 first:pt-0 last:pb-0" style={seat.index > 1 ? { borderTop: `1px solid ${hairline}` } : undefined}>
      <p className="text-xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
        {COPY.seat(seat.index)}
      </p>
      <p className="text-base" style={{ color: seat.status === "rejected" ? EL.inkSoft : EL.ink }}>
        {text}
      </p>
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
      {!naming && seat.status === "qualified" && !seat.mine && canNameSeat(seat, phase) && <TextButton onClick={() => setRenaming(true)}>{COPY.rename}</TextButton>}
      {seat.mine && seat.status === "confirmed" && backHref && (
        <Link href={backHref} className={`${btn} mt-2 w-full`} style={filled}>
          {COPY.mySeat}
        </Link>
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
  const action = view.seats.some((x) => x.status === "needs_recipient" || x.status === "qualified");
  return (
    <section
      className="rounded-2xl border p-5"
      style={action ? { borderColor: EL.flame, backgroundColor: "rgba(236,100,36,0.06)" } : { borderColor: hairline }}
      aria-live="polite"
    >
      <h2 className="sr-only">{COPY.heading}</h2>
      <ul>
        {view.seats.map((seat) => (
          <SeatLine key={seat.index} kind={kind} seat={seat} phase={view.phase} backHref={backHref} onName={onName} />
        ))}
      </ul>
    </section>
  );
}

/** A plain bordered note (the teacher's Demo Day invite). */
export function SeatNote({ tone, children }: { tone: "flame" | "plain"; children: ReactNode }) {
  return (
    <section
      className="rounded-2xl border p-5"
      style={tone === "flame" ? { borderColor: EL.flame, backgroundColor: "rgba(236,100,36,0.06)" } : { borderColor: hairline }}
      aria-live="polite"
    >
      {children}
    </section>
  );
}
