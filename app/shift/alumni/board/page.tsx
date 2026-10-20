import type { Metadata } from "next";

import { BoardGate } from "@/components/shift/alumni-board/BoardGate";
import { BoardShell } from "@/components/shift/alumni-board/BoardShell";
import { boardAccessFor } from "@/components/shift/alumni-board/boardPage";
import { GoalForm } from "@/components/shift/alumni-board/GoalForm";
import {
  FeedPeek,
  HelpNotice,
  HistoryCard,
  LastWeekCheck,
  TeamLink,
  WeekGoal,
} from "@/components/shift/alumni-board/HomeCards";
import board from "@/components/shift/alumni-board/board.module.css";
import { StartTimer } from "@/components/shift/alumni-board/StartTimer";
import { UserTestsCard } from "@/components/shift/alumni-board/UserTests";
import { BOARD_PATH } from "@/lib/shift/alumniBoard";
import { currentRound } from "@/lib/supabase/shift-alumni-board/core";
import { recentPosts } from "@/lib/supabase/shift-alumni-board/feed";
import { homeGoals, pastRounds } from "@/lib/supabase/shift-alumni-board/goals";
import { homeStarts } from "@/lib/supabase/shift-alumni-board/starts";
import { getTeam, helpReplyCount } from "@/lib/supabase/shift-alumni-board/team";
import { homeTests } from "@/lib/supabase/shift-alumni-board/tests";

/**
 * /shift/alumni/board: a SHIFT alumnus's own goal card. The first step and
 * its 10-minute timer come first, then this week's check-in, real-user tests,
 * the card itself, history and a peek at the community feed.
 */

export const metadata: Metadata = {
  title: "การ์ดของฉัน | SHIFT Alumni",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AlumniBoardHomePage() {
  const access = await boardAccessFor(BOARD_PATH);
  if (access.kind !== "ok") {
    return (
      <BoardShell>
        <BoardGate access={access} />
      </BoardShell>
    );
  }
  const { viewer } = access;
  const round = await currentRound();
  const [{ goal, lastGoal }, starts, tests, history, helpReplies, feed, team] = await Promise.all([
    homeGoals(viewer.userId, round),
    homeStarts(viewer.userId, round),
    homeTests(viewer.userId, round),
    pastRounds(round, [viewer.userId]),
    helpReplyCount(viewer.userId, round),
    recentPosts(3),
    viewer.teamId ? getTeam(viewer.teamId) : null,
  ]);

  // A new round starts from last round's long-term and 1-month goals.
  const initial = goal ?? { long_term: lastGoal?.long_term ?? "", month_goal: lastGoal?.month_goal ?? "" };

  return (
    <BoardShell mentor={viewer.role === "mentor"}>
      <HelpNotice count={helpReplies} />

      <section className={`${board.card} ${board.step}`}>
        {goal?.first_step ? (
          <>
            <p className={board.muted}>⚡ ก้าวแรก · ไม่เกิน 10 นาที · ทำเลย</p>
            <p className={board.stepText}>{goal.first_step}</p>
          </>
        ) : (
          <p className={board.muted}>ยังไม่มีก้าวแรก เขียนในการ์ดด้านล่าง หรือเริ่ม 10 นาทีเลยก็ได้</p>
        )}
        <StartTimer open={starts.open} cheer={starts.cheer} count={starts.count} />
      </section>

      <LastWeekCheck goal={lastGoal} />
      <WeekGoal goal={goal} />
      <UserTestsCard total={tests.total} thisRound={tests.thisRound} recent={tests.recent} goal={goal} />
      <GoalForm key={goal?.updated_at ?? "new"} name={viewer.name} initial={initial} />
      <HistoryCard history={history(viewer.userId)} />
      <FeedPeek posts={feed} />
      <TeamLink team={team} />
    </BoardShell>
  );
}
