import Link from "next/link";

import {
  BOARD_PATH,
  formatBangkok,
  HISTORY_MARK,
  snippet,
  statusLabel,
  type Goal,
  type History,
} from "@/lib/shift/alumniBoard";

import board from "./board.module.css";
import { GoalStatusButtons } from "./GoalForm";

/** 💬 Someone answered what we're stuck on. */
export function HelpNotice({ count }: { count: number }) {
  if (!count) return null;
  return (
    <section className={board.card}>
      <Link href={`${BOARD_PATH}/team`} className={board.link}>
        💬 มีคนตอบเรื่องที่ติด ({count})
      </Link>
    </section>
  );
}

/** Last round's week goal, still open: did it get done? */
export function LastWeekCheck({ goal }: { goal: Goal | null }) {
  if (!goal || goal.status !== "open" || !goal.week_goal) return null;
  return (
    <section className={board.card}>
      <h2 className={board.subtitle}>สัปดาห์ที่แล้ว เสร็จไหม?</h2>
      <p className="mt-1">{goal.week_goal}</p>
      <GoalStatusButtons goalId={goal.id} status={goal.status} />
    </section>
  );
}

export function WeekGoal({ goal }: { goal: Goal | null }) {
  if (!goal?.week_goal) return null;
  return (
    <section className={board.card}>
      <h2 className={board.subtitle}>👣 เป้าสัปดาห์นี้: {statusLabel(goal.status)}</h2>
      <p className="mt-1">{goal.week_goal}</p>
      {goal.done_when && <p className={board.muted}>เสร็จ = {goal.done_when}</p>}
      <GoalStatusButtons goalId={goal.id} status={goal.status} />
    </section>
  );
}

/** Past rounds as ✅/❌/⚪, oldest first, and the streak. */
export function HistoryCard({ history }: { history: History }) {
  if (history.rounds.length === 0) return null;
  return (
    <section className={board.card}>
      <h2 className={board.subtitle}>📈 ที่ผ่านมา</h2>
      <div className={board.history}>
        {[...history.rounds].reverse().map((r) => (
          <span
            key={r.roundId}
            title={`${formatBangkok(r.startedAt)} · ${r.weekGoal || "ไม่ได้ตั้งเป้า"}`}
          >
            {r.status ? HISTORY_MARK[r.status] : "·"}
          </span>
        ))}
      </div>
      <p>
        {history.streak ? (
          <>
            🔥 ทำได้ติดกัน <b>{history.streak}</b> รอบ
          </>
        ) : (
          <span className={board.muted}>ยังไม่มีสตรีค ทำเป้ารอบนี้ให้เสร็จ แล้วเริ่มนับเลย</span>
        )}
      </p>
    </section>
  );
}

/** A peek at the community, so we see friends moving. */
export function FeedPeek({ posts }: { posts: { id: string; body: string; name: string }[] }) {
  return (
    <section className={board.card}>
      <h2 className={board.subtitle}>📣 ฟีด</h2>
      {posts.length ? (
        <ul className={board.list}>
          {posts.map((p) => (
            <li key={p.id}>
              <b>{p.name}</b> {snippet(p.body, 80)}
            </li>
          ))}
        </ul>
      ) : (
        <p className={`${board.muted} mt-1`}>ยังไม่มีโพสต์ เป็นคนแรกที่เล่าความคืบหน้า</p>
      )}
      <p className="mt-3">
        <Link href={`${BOARD_PATH}/feed`} className={board.link}>
          เล่าความคืบหน้าของเรา / ดูทั้งหมด
        </Link>
      </p>
    </section>
  );
}

export function TeamLink({ team }: { team: { name: string } | null }) {
  return (
    <section className={board.card}>
      {team ? (
        <Link href={`${BOARD_PATH}/team`} className={board.link}>
          ทีมของเรา: {team.name}
        </Link>
      ) : (
        <span className={board.muted}>ยังไม่มีทีม mentor จะจัดให้</span>
      )}
    </section>
  );
}
