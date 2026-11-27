import type { ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { SHARE } from "@/lib/hackathon/elemental/share";
import type { SeatView } from "@/lib/hackathon/elemental/share-rules";

import { lineHelp } from "./copy-shared";
import { CodeText, hairline } from "./ui";

/**
 * News about the school's free seat, on the student and teacher pages.
 * People show by code only. A title only where it adds to the page's own
 * title (a code, or a second piece of news).
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  student: {
    checkingSelf: [null, "ทีมงานกำลังเช็กว่าคนที่เปิดลิงก์เป็นคนจริง ผ่านแล้วที่นั่งของคุณเป็นที่นั่งฟรี ไม่ต้องโอน"],
    checkingNone: [null, "คุณจ่ายแล้ว ที่นั่งฟรีของโรงเรียนจึงไปที่เพื่อนที่ยังไม่จ่าย 1 คน ทีมงานเช็กแล้วเพื่อนไม่ต้องโอน"],
    checkingOther: ["ยกให้", "ทีมงานกำลังเช็ก ผ่านแล้วเพื่อนคนนี้ไม่ต้องโอน"],
    givenSelf: [null, "ที่นั่งของคุณเป็นที่นั่งฟรีแล้ว ไม่ต้องโอน ขอบคุณที่ชวนเพื่อนมา"],
    givenOther: ["ที่นั่งฟรีเป็นของ", "ขอบคุณที่ชวนเพื่อนมา"],
    taken: [null, "มีอีกลิงก์ในโรงเรียนนี้ครบก่อน แชร์ต่อได้ คนที่สมัครผ่านลิงก์ของคุณยังนับให้ทีมของคุณในกระดานอันดับ"],
    rejected: [null, `ทีมงานเช็กแล้วไม่ผ่าน ถ้าคิดว่าผิดพลาด ${lineHelp}`],
  },
  teacher: {
    checkingSelf: [null, "ทีมงานกำลังเช็ก"],
    checkingNone: ["ได้ที่นั่งฟรีของโรงเรียนแล้ว", "เลือกนักเรียนที่สมัครแล้วแต่ยังไม่จ่าย 1 คน ทีมงานเช็กแล้วนักเรียนคนนั้นไม่ต้องโอน"],
    checkingOther: ["ให้", "ทีมงานกำลังเช็ก ผ่านแล้วนักเรียนคนนี้ไม่ต้องโอน"],
    givenSelf: [null, "ขอบคุณคุณครูที่ช่วยแชร์"],
    givenOther: ["ที่นั่งฟรีเป็นของ", "ขอบคุณคุณครูที่ช่วยแชร์"],
    taken: [null, `อีกลิงก์ในโรงเรียนนี้ได้ที่นั่งฟรีไปก่อน คำเชิญ Demo Day ยังนับจาก ${SHARE.devicesGoal} เครื่องของคุณครูเหมือนเดิม`],
    rejected: [null, `ทีมงานเช็กแล้วไม่ผ่าน ถ้าคิดว่าผิดพลาด ${lineHelp}`],
  },
};

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

export function SeatMessage({ kind, seat }: { kind: "student" | "teacher"; seat: SeatView }) {
  const c = COPY[kind];
  let pair: readonly (string | null)[];
  let code: string | null = null;
  switch (seat.state) {
    case "open":
      return null;
    case "taken":
      pair = c.taken;
      break;
    case "rejected":
      pair = c.rejected;
      break;
    case "checking":
    case "given": {
      const r = seat.recipient;
      const given = seat.state === "given";
      if (r.who === "other") code = r.code;
      pair =
        r.who === "self"
          ? given
            ? c.givenSelf
            : c.checkingSelf
          : r.who === "other"
            ? given
              ? c.givenOther
              : c.checkingOther
            : c.checkingNone;
    }
  }
  return (
    <div>
      {pair[0] && (
        <p className="mb-2 text-2xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.25 }}>
          {pair[0]}
          {code && (
            <>
              {" "}
              <CodeText code={code} className="whitespace-nowrap text-xl" />
            </>
          )}
        </p>
      )}
      {pair[1] && (
        <p className={pair[0] ? "text-base" : "text-lg"} style={{ color: pair[0] ? EL.inkSoft : EL.ink }}>
          {pair[1]}
        </p>
      )}
    </div>
  );
}
