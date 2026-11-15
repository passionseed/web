"use client";

import { useEffect, useId, useState, useTransition, type FormEvent } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { loadPeerCheck, loadPeerQueue, sendPeerCheck } from "@/app/shift/island/peer-actions";
import { PEER_LINE_MAX, peerChecklist, tickedLabels } from "@/lib/shift-island/peer";
import type { PeerQueueItem, PeerView } from "@/lib/supabase/shift-quests/peerTypes";

import { COMMON, DETAIL, PEER, PHOTOS } from "../copy";
import { Field } from "../Field";
import { InSheetFooter } from "../InSheetFooter";
import island from "../island.module.css";
import { IslandSheet } from "../IslandSheet";
import { HintIcon } from "../QuestSections";
import photoStyles from "../photos/photos.module.css";
import styles from "./peer.module.css";

type Queue = { state: "loading" } | { state: "error" } | { state: "ready"; items: PeerQueueItem[] };
type Detail = { state: "loading" } | { state: "error" } | { state: "ready"; view: PeerView };

const chars = (value: string) => Array.from(value).length;

/**
 * ช่วยเพื่อนเช็ก: what the student can check now (oldest first, no names, no
 * teams), then one submission: the quest, the work and its photos, the
 * done-when items to tick, and one line of feedback. A mentor still decides;
 * the sheet says so next to the send button.
 */
export function PeerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [queue, setQueue] = useState<Queue>({ state: "loading" });
  const [picked, setPicked] = useState<string | null>(null);
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setQueue({ state: "loading" });
    setPicked(null);
    loadPeerQueue()
      .then((result) => {
        if (live) setQueue(result.ok ? { state: "ready", items: result.data } : { state: "error" });
      })
      .catch(() => {
        if (live) setQueue({ state: "error" });
      });
    return () => {
      live = false;
    };
  }, [open]);

  function sent(submissionId: string) {
    setQueue((current) =>
      current.state === "ready" ? { state: "ready", items: current.items.filter((i) => i.submissionId !== submissionId) } : current,
    );
    setPicked(null);
  }

  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={PEER.title}
      description={PEER.entrySub}
      footer={picked ? <div ref={setFooter} className={island.footerSlot} /> : undefined}
    >
      {picked ? (
        <PeerCheckView key={picked} submissionId={picked} footer={footer} onBack={() => setPicked(null)} onSent={sent} />
      ) : (
        <PeerQueueList queue={queue} onPick={setPicked} />
      )}
    </IslandSheet>
  );
}

function PeerQueueList({ queue, onPick }: { queue: Queue; onPick: (submissionId: string) => void }) {
  if (queue.state === "loading") {
    return (
      <p className={island.hint} aria-live="polite">
        {PEER.loading}
      </p>
    );
  }
  if (queue.state === "error") return <p className={island.hint}>{PEER.loadFailed}</p>;
  if (queue.items.length === 0) return <p className={island.hint}>{PEER.empty}</p>;
  return (
    <div className={styles.stack}>
      <p className={styles.anon}>
        <HintIcon name="peers" size={20} />
        <span>{PEER.queueCount(queue.items.length)}</span>
      </p>
      <ul className={styles.queue}>
        {queue.items.map((item) => (
          <li key={item.submissionId}>
            <button type="button" className={styles.item} onClick={() => onPick(item.submissionId)}>
              <span className={styles.itemIcon} aria-hidden="true">
                <HintIcon name={item.photos > 0 ? "camera" : "note"} size={24} />
              </span>
              <span className={styles.itemBody}>
                <span className={styles.itemTitle}>{item.title}</span>
                <span className={styles.itemMeta}>
                  {[PEER.revision(item.revision), item.photos > 0 ? PEER.photos(item.photos) : null, PEER.checks(item.checks)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Block({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div className={styles.block}>
      <p className={styles.label}>{label}</p>
      <p className={styles.text}>{text}</p>
    </div>
  );
}

function PeerCheckView({
  submissionId,
  footer,
  onBack,
  onSent,
}: {
  submissionId: string;
  footer: HTMLElement | null;
  onBack: () => void;
  onSent: (submissionId: string) => void;
}) {
  const formId = useId();
  const lineId = useId();
  const [detail, setDetail] = useState<Detail>({ state: "loading" });
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [line, setLine] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    loadPeerCheck({ submissionId })
      .then((result) => {
        if (!live) return;
        if (result.ok) setDetail({ state: "ready", view: result.data });
        else {
          setDetail({ state: "error" });
          toast.error(result.error || COMMON.failed);
        }
      })
      .catch(() => {
        if (live) setDetail({ state: "error" });
      });
    return () => {
      live = false;
    };
  }, [submissionId]);

  const back = (
    <button type="button" className={island.quietButton} onClick={onBack}>
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      <span>{PEER.back}</span>
    </button>
  );
  if (detail.state === "loading") {
    return (
      <div className={styles.stack}>
        {back}
        <p className={island.hint} aria-live="polite">
          {PEER.loading}
        </p>
      </div>
    );
  }
  if (detail.state === "error") {
    return (
      <div className={styles.stack}>
        {back}
        <p className={island.hint}>{PEER.loadFailed}</p>
      </div>
    );
  }

  const view = detail.view;
  const items = peerChecklist({ kind: view.kind, slug: view.slug, criteria: view.criteria });

  function toggle(id: string) {
    setTicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const text = line.trim();
    if (!text) return setError(PEER.lineRequired);
    if (chars(text) > PEER_LINE_MAX) return setError(DETAIL.errors.tooLong(PEER_LINE_MAX));
    startTransition(async () => {
      const result = await sendPeerCheck({ submissionId: view.submissionId, ticked: [...ticked], line: text });
      if (result.ok) {
        toast.success(PEER.sent);
        onSent(view.submissionId);
      } else {
        toast.error(result.error || COMMON.failed);
      }
    });
  }

  return (
    <div className={styles.stack}>
      {back}
      <p className={styles.anon}>
        <HintIcon name="peers" size={20} />
        <span>{PEER.anonymous}</span>
      </p>
      <h3 className={island.sectionLabel}>{view.title}</h3>
      <Block label={PEER.goal} text={view.goal} />
      <Block label={PEER.evidence} text={view.evidence} />
      <Block label={PEER.reflection} text={view.reflection} />
      {view.artifactUrl ? (
        <div className={styles.block}>
          <p className={styles.label}>{PEER.link}</p>
          <a className={styles.link} href={view.artifactUrl} target="_blank" rel="noopener noreferrer nofollow">
            {view.artifactUrl}
          </a>
        </div>
      ) : null}
      {view.photos.length > 0 ? (
        <ul className={photoStyles.grid}>
          {view.photos.map((photo, index) => (
            <li key={photo.id} className={photoStyles.thumb}>
              <a className={photoStyles.thumbLink} href={photo.url} target="_blank" rel="noopener noreferrer" aria-label={PHOTOS.open(index + 1)}>
                {/* Signed, short-lived links from a private bucket. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={PHOTOS.alt(index + 1)} width={photo.width} height={photo.height} loading="lazy" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {view.mine ? (
        <MyCheck items={items} ticked={view.mine.ticked} line={view.mine.line} hidden={view.mine.hidden} />
      ) : view.canCheck ? (
        <form id={formId} className={island.form} onSubmit={onSubmit} noValidate>
          {items.length > 0 ? (
            <fieldset className={styles.ticks}>
              <legend className={styles.label}>{PEER.tickHeading}</legend>
              {items.map((item) => (
                <label key={item.id} className={styles.tick}>
                  <input type="checkbox" checked={ticked.has(item.id)} onChange={() => toggle(item.id)} disabled={pending} />
                  <span>{item.label}</span>
                </label>
              ))}
            </fieldset>
          ) : null}
          <Field
            id={lineId}
            label={PEER.lineLabel}
            hint={PEER.lineHint}
            placeholder={PEER.linePlaceholder}
            value={line}
            max={PEER_LINE_MAX}
            error={error ?? undefined}
            rows={3}
            onChange={(value) => {
              setLine(value);
              if (error) setError(null);
            }}
          />
          <p className={styles.mentor}>
            <HintIcon name="shield" size={20} />
            <span>{PEER.mentorDecides}</span>
          </p>
          {/* The send button sits in the sheet's sticky footer, like the quest's own forms. */}
          <InSheetFooter slot={footer}>
            <button type="submit" form={formId} className={`ei-button-dawn ${island.primary} ${island.barButton}`} disabled={pending} aria-busy={pending}>
              {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <HintIcon name="send" size={16} />}
              <span>{pending ? PEER.sending : PEER.send}</span>
            </button>
          </InSheetFooter>
        </form>
      ) : null}
    </div>
  );
}

/** The peer's own check, read back (a second check is not allowed). */
function MyCheck({ items, ticked, line, hidden }: { items: ReturnType<typeof peerChecklist>; ticked: string[]; line: string; hidden: boolean }) {
  const labels = tickedLabels(items, ticked);
  return (
    <div className={styles.check} data-hidden={hidden ? "true" : undefined}>
      <p className={styles.checkWho}>
        <span>{PEER.yours}</span>
        {hidden ? <span className={styles.hiddenTag}>{PEER.yoursHidden}</span> : null}
      </p>
      {labels.length > 0 ? (
        <ul className={styles.checkTicks}>
          {labels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      ) : null}
      <p className={styles.checkLine}>{line}</p>
    </div>
  );
}
