import Link from "next/link";

import { BOARD_PATH, formatBangkok, statusLabel } from "@/lib/shift/alumniBoard";
import type { Team, TeamMember } from "@/lib/supabase/shift-alumni-board/team";
import type { TeamTests } from "@/lib/supabase/shift-alumni-board/tests";

import board from "./board.module.css";

export function TeamMembersCard({ team, members, tests }: { team: Team; members: TeamMember[]; tests: TeamTests }) {
  return (
    <section className={board.card}>
      <h1 className={board.title}>ทีม {team.name}</h1>
      <ul className={board.list}>
        {members.map((m) => (
          <li key={m.user_id}>
            <b>{m.nickname}</b> · {statusLabel(m.goal?.status)} · 🧪 {tests.counts[m.user_id] ?? 0}
            {m.goal?.week_goal && <p>👣 {m.goal.week_goal}</p>}
            {m.goal?.first_step && <p className={board.muted}>⚡ {m.goal.first_step}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Teammates learn from each other's real-user tests. */
export function TeamTestsCard({ tests }: { tests: TeamTests }) {
  return (
    <section className={board.card}>
      <h2 className={board.subtitle}>
        🧪 คนใช้จริงของทีม <span className={board.muted}>{tests.total} คน</span>
      </h2>
      {tests.list.length ? (
        <ul className={board.list}>
          {tests.list.map((t) => (
            <li key={t.id}>
              <b>{t.who}</b> · <span className={board.muted}>{t.name}</span>
              {t.learned && <p className={board.pre}>💡 {t.learned}</p>}
              <p className={board.muted}>{formatBangkok(t.created_at)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`${board.muted} mt-1`}>ยังไม่มีใครในทีมลองกับคนจริง ใครจะเป็นคนแรก?</p>
      )}
    </section>
  );
}

/** Mentors without a team of their own pick one. */
export function TeamList({ teams }: { teams: Team[] }) {
  return (
    <section className={board.card}>
      <h1 className={board.title}>ทีมทั้งหมด</h1>
      {teams.length ? (
        <ul className={board.list}>
          {teams.map((t) => (
            <li key={t.id}>
              <Link href={`${BOARD_PATH}/team?id=${t.id}`} className={board.link}>
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`${board.muted} mt-1`}>
          ยังไม่มีทีม เพิ่มทีมได้ที่{" "}
          <Link href="/admin/shift/alumni/board" className={board.link}>
            หน้า Mentor
          </Link>
        </p>
      )}
    </section>
  );
}

export function NoTeam() {
  return (
    <section className={board.card}>
      <h1 className={board.title}>ยังไม่มีทีม</h1>
      <p className={`${board.muted} mt-1`}>mentor จะจัดทีมให้ ระหว่างนี้ตั้งเป้าในการ์ดของเราได้เลย</p>
    </section>
  );
}
