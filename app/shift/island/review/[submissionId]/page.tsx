import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IslandShell } from "@/components/shift/island/IslandShell";
import { REVIEW_PAGE } from "@/components/shift/island/copy";
import { ReviewSubmission } from "@/components/shift/island/review/ReviewSubmission";
import styles from "@/components/shift/island/review/review.module.css";
import { loadReview } from "@/lib/supabase/shift-quests/review";
import { resolveIslandViewer } from "@/lib/supabase/shift-quests/viewer";

/**
 * /shift/island/review/<submission>: one quest submission for a mentor, with
 * the photos the Discord review card cannot show (schema 14). Reviewers and
 * admins only: the quest database refuses everyone else, so a student who
 * opens the link sees a short note and nothing of anyone's work. Decisions
 * stay in Discord. Reads the session, so it renders per request; nothing here
 * runs at build time.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${REVIEW_PAGE.title} | SHIFT High Island`,
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Note({ text }: { text: string }) {
  return (
    <IslandShell>
      <div className={styles.wrap}>
        <div className={styles.card}>
          <p className={styles.text}>{text}</p>
        </div>
      </div>
    </IslandShell>
  );
}

export default async function ReviewPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  if (!UUID.test(submissionId)) notFound();

  const viewer = await resolveIslandViewer();
  if (viewer.state === "signed_out" || viewer.state === "no_discord") return <Note text={REVIEW_PAGE.signIn} />;
  if (viewer.state === "unavailable") return <Note text={REVIEW_PAGE.unavailable} />;
  // Staff who never ran /start still review; everyone else is refused by the database below anyway.
  if (viewer.state === "not_eligible" || !viewer.me.staff) return <Note text={REVIEW_PAGE.staffOnly} />;

  const read = await loadReview(viewer.actor, submissionId);
  if (read.state === "not_found") notFound();
  if (read.state === "not_authorized") return <Note text={REVIEW_PAGE.staffOnly} />;
  if (read.state === "unavailable") return <Note text={REVIEW_PAGE.unavailable} />;

  return (
    <IslandShell>
      <div className={styles.wrap}>
        <ReviewSubmission view={read.view} />
      </div>
    </IslandShell>
  );
}
