"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { hidePeerCheck } from "@/app/shift/island/peer-actions";
import type { PeerCheckRow } from "@/lib/supabase/shift-quests/peerTypes";

import { COMMON, PEER } from "../copy";
import island from "../island.module.css";
import { PeerCheckCard } from "../peer/PeerChecks";
import peerStyles from "../peer/peer.module.css";
import styles from "./review.module.css";

function HideButton({ check }: { check: PeerCheckRow }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={island.quietButton}
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await hidePeerCheck({ checkId: check.id, hide: !check.hidden });
          if (!result.ok) toast.error(result.error || COMMON.failed);
        })
      }
    >
      {check.hidden ? PEER.show : PEER.hide}
    </button>
  );
}

/**
 * เพื่อนเช็ก on the web review page (schema 15): every peer check of the
 * submission, hidden ones marked, each with ซ่อน / แสดงอีกครั้ง. A hidden check
 * disappears for the student's team; the mentor still sees it here.
 */
export function ReviewPeerChecks({ open, checks }: { open: boolean; checks: PeerCheckRow[] }) {
  return (
    <div className={styles.block}>
      <p className={styles.label}>{PEER.reviewHeading}</p>
      {checks.length === 0 ? (
        <p className={styles.note}>{open ? PEER.reviewNone : PEER.reviewClosed}</p>
      ) : (
        <ul className={peerStyles.checks}>
          {checks.map((check) => (
            <PeerCheckCard key={check.id} check={check} items={[]} extra={<HideButton check={check} />} />
          ))}
        </ul>
      )}
    </div>
  );
}
