import Link from "next/link";

import type { BoardAccess } from "@/lib/supabase/shift-alumni-board/core";
import { findLinkedApplication } from "@/lib/supabase/shift-alumni-members";

import board from "./board.module.css";
import { JoinBoard } from "./JoinBoard";

/**
 * Shown instead of the board to accounts that can't use it yet: a one-step
 * join for accounts with no alumni record, a note for declined ones.
 */
export async function BoardGate({ access }: { access: Extract<BoardAccess, { kind: "notMember" | "declined" }> }) {
  if (access.kind === "notMember") {
    const application = await findLinkedApplication(access.userId).catch(() => null);
    return (
      <JoinBoard suggested={application ? { nickname: application.nickname, cohort: application.cohort } : null} />
    );
  }
  return (
    <section className={board.card}>
      <h1 className={board.title}>บัญชีนี้ยังยืนยันไม่ได้ว่าเคยลง SHIFT</h1>
      <p className={`${board.muted} mt-2`}>ทักทีมในกลุ่ม LINE ของรุ่นได้เลย</p>
      <p className="mt-4">
        <Link href="/shift/alumni" className={board.link}>
          ไปหน้า SHIFT Alumni
        </Link>
      </p>
    </section>
  );
}
