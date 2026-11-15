"use client";

import { useEffect, useState, type ReactNode } from "react";

import { loadPeerChecks } from "@/app/shift/island/peer-actions";
import { peerChecklist, tickedLabels, type PeerItem } from "@/lib/shift-island/peer";
import type { PeerCheckRow, PeerList } from "@/lib/supabase/shift-quests/peerTypes";

import { PEER } from "../copy";
import island from "../island.module.css";
import { HintIcon } from "../QuestSections";
import styles from "./peer.module.css";

/** One peer's check: who (or "a peer on the island"), what they ticked, their line. */
export function PeerCheckCard({ check, items, extra }: { check: PeerCheckRow; items: PeerItem[]; extra?: ReactNode }) {
  const labels = tickedLabels(items, check.ticked);
  return (
    <li className={styles.check} data-hidden={check.hidden ? "true" : undefined}>
      <p className={styles.checkWho}>
        <span>{check.peer ?? PEER.someone}</span>
        {labels.length > 0 || check.ticked.length > 0 ? (
          <span className={island.hint}>{PEER.ticked(labels.length || check.ticked.length)}</span>
        ) : null}
        {check.hidden ? <span className={styles.hiddenTag}>{PEER.hiddenTag}</span> : null}
      </p>
      {labels.length > 0 ? (
        <ul className={styles.checkTicks}>
          {labels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      ) : null}
      <p className={styles.checkLine}>{check.line}</p>
      {extra}
    </li>
  );
}

/**
 * เพื่อนเช็กแล้ว on a quest page (schema 15): the peer checks of the quest's
 * latest submission, for its submitter and teammates. Feedback only; the
 * mentor's decision is the one that counts. Shows nothing when the
 * submission is not open to peers and no one has checked it.
 */
export function PeerChecks({
  instanceId,
  quest,
}: {
  instanceId: string;
  quest: { kind: "main" | "side" | "proposed"; slug: string | null; criteria: string };
}) {
  const [list, setList] = useState<PeerList | null | "loading">("loading");

  useEffect(() => {
    let live = true;
    loadPeerChecks({ instanceId })
      .then((result) => {
        if (live) setList(result.ok ? result.data : null);
      })
      .catch(() => {
        if (live) setList(null);
      });
    return () => {
      live = false;
    };
  }, [instanceId]);

  if (list === "loading" || !list) return null;
  if (!list.peerOpen && list.checks.length === 0) return null;
  const items = peerChecklist(quest);
  return (
    <section className={styles.stack} aria-label={PEER.heading}>
      <h3 className={island.sectionLabel}>
        <HintIcon name="peers" size={20} />
        <span>{PEER.heading}</span>
      </h3>
      {list.checks.length === 0 ? (
        <p className={island.hint}>{PEER.noneYet}</p>
      ) : (
        <ul className={styles.checks}>
          {list.checks.map((check) => (
            <PeerCheckCard key={check.id} check={check} items={items} />
          ))}
        </ul>
      )}
    </section>
  );
}
