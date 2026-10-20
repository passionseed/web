import Link from "next/link";

import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { MentorMembersTable, MentorTeams, StartRoundButton } from "@/components/admin/shift-alumni/AlumniBoardMentor";
import { AlumniMembers, type AlumniMemberRow } from "@/components/admin/shift-alumni/AlumniMembers";
import { adminMetadata } from "@/lib/admin/metadata";
import { BOARD_PATH, formatBangkok, QUIET_DAYS } from "@/lib/shift/alumniBoard";
import { currentRound } from "@/lib/supabase/shift-alumni-board/core";
import { mentorOverview, type MentorOverview, type MentorStats } from "@/lib/supabase/shift-alumni-board/mentor";
import { listAlumniMembers } from "@/lib/supabase/shift-alumni-members";

export const metadata = adminMetadata("/admin/shift/alumni/board");
export const dynamic = "force-dynamic";

async function loadAccounts(): Promise<AlumniMemberRow[] | null> {
  try {
    return await listAlumniMembers();
  } catch (error) {
    console.error("Failed to load alumni accounts:", error);
    return null;
  }
}

async function loadOverview(): Promise<MentorOverview | null> {
  try {
    return await mentorOverview(await currentRound());
  } catch (error) {
    console.error("Failed to load the alumni board:", error);
    return null;
  }
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function RoundStats({ stats }: { stats: MentorStats }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat value={`${stats.goalsSet}/${stats.students}`} label="Set a week goal" />
      <Stat value={stats.done} label="✅ Week goal done" />
      <Stat value={`${stats.held}/${stats.planned}`} label="Team meetings held / planned" />
      <Stat value={`${stats.stuck} / ${stats.solved}`} label="🔴 Stuck / ✅ solved" />
      <Stat value={stats.quiet} label={`⚪ Quiet ${QUIET_DAYS}+ days`} />
      <Stat value={stats.started} label="⏱️ Started a 10-minute timer" />
      <Stat value={`${stats.posts} / ${stats.posters}`} label="📣 Posts / students who posted" />
      <Stat value={`${stats.testsThisRound} / ${stats.testers}`} label="🧪 Real-user tests this round / testers" />
    </div>
  );
}

export default async function AdminAlumniBoardPage() {
  const [overview, accounts] = await Promise.all([loadOverview(), loadAccounts()]);

  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">SHIFT Alumni board</h2>
        <p className="text-sm text-muted-foreground">
          Goal cards, team standups and help on stuck for every alumni account that is not declined (pending included). Admins are the mentors: you see every team.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href={BOARD_PATH} className="underline underline-offset-4">
            Student board
          </Link>
          <Link href={`${BOARD_PATH}/team`} className="underline underline-offset-4">
            Teams and standups
          </Link>
          <Link href={`${BOARD_PATH}/feed`} className="underline underline-offset-4">
            Progress feed
          </Link>
        </div>
      </div>

      {overview === null ? (
        <p role="alert" className="text-sm text-muted-foreground">
          Failed to load the alumni board. If this is new, apply the shift_alumni_board migration first.
        </p>
      ) : (
        <>
          <section className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">
                This round{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  started {formatBangkok(overview.round.started_at)}
                </span>
              </h3>
              <StartRoundButton />
            </div>
            <RoundStats stats={overview.stats} />
          </section>
          <MentorMembersTable rows={overview.rows} teams={overview.teams} />
          <MentorTeams teams={overview.teams} />
          {accounts && <AlumniMembers members={accounts} />}
        </>
      )}
    </div>
  );
}
