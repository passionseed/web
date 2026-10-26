import Link from "next/link";

import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { MentorMembersTable, MentorTeams, StartRoundButton } from "@/components/admin/shift-alumni/AlumniBoardMentor";
import { AlumniMembers, type AlumniMemberRow } from "@/components/admin/shift-alumni/AlumniMembers";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminErrorState } from "@/components/admin/shared/AdminStates";
import { adminMetadata } from "@/lib/admin/metadata";
import { requireAdmin } from "@/lib/admin/requireAdmin";
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

const BOARD_LINKS = [
  { href: BOARD_PATH, label: "Student board" },
  { href: `${BOARD_PATH}/team`, label: "Teams and standups" },
  { href: `${BOARD_PATH}/feed`, label: "Progress feed" },
];

function BoardLinks() {
  return (
    <nav aria-label="Alumni board views" className="flex flex-wrap gap-x-4 text-sm">
      {BOARD_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex min-h-11 items-center underline decoration-muted-foreground underline-offset-4 hover:decoration-foreground active:decoration-foreground"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default async function AdminAlumniBoardPage() {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const [overview, accounts] = await Promise.all([loadOverview(), loadAccounts()]);

  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="Alumni board"
        description="Goal cards, team standups and help on stuck for every alumni account that is not declined (pending included). Admins are the mentors: you see every team."
      />
      <BoardLinks />

      {overview === null ? (
        <AdminErrorState
          title="Could not load the alumni board"
          message="The board did not load. Reload the page to try again; if it keeps failing, tell the tech team."
        />
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
