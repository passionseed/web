"use client";

import {
  Component,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { chooseSideQuest, resumeQuest, startMainQuest } from "@/app/shift/island/actions";
import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import { CANVAS_ROUTE, canvasHref } from "@/lib/shift-island/canvas-link";
import {
  questGuide,
  type CanvasLinkState,
  type ChecklistHint,
  type ContextRow,
  type QuestCanvasContext,
  type QuestGuide,
} from "@/lib/shift-island/quest-canvas";
import {
  OWNERSHIP_LABEL,
  OWNERSHIP_STATE_LABEL,
  TAKE_THE_KEYS,
  ownershipAllLit,
  ownershipLit,
  ownershipSnapshot,
} from "@/lib/shift-island/ownership";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";
import { TEXT_LIMITS, type QuestBoard } from "@/lib/supabase/shift-quests/types";
import { SHIFT_CARDS } from "@/lib/whiteboard/shift-cards";

import { QuestCardComposer, useQuestCanvas } from "./canvas";
import { BOARD, CANVAS, COMMON, DETAIL, QUEST, tileChip } from "./copy";
import styles from "./island.module.css";
import { IslandSheet } from "./IslandSheet";
import { canStart, detailAction, mentorFeedback, questView, refKey, sameRef, type DetailAction, type QuestView } from "./model";
import { PALETTE, iconGrid, iconScale, type IconKey } from "./sprites";
import { SubmitForm } from "./SubmitForm";
import { useOwnership, type OwnershipState } from "./useOwnership";

interface QuestDetailSheetProps {
  board: QuestBoard;
  /** The quest to show; null closes the sheet. */
  target: BoardRef | null;
  keynote: BoardRef | null;
  /** Whether the quest project has a SHIFT canvas linked (page.canvasLink). */
  canvasLink: CanvasLinkState;
  onClose: () => void;
  /** Open the stuck sheet for this quest (the caller's own instance, or none). */
  onStuck: (quest: { instanceId: string | null; title: string }) => void;
  /** Open the canvas picker for this quest (link a canvas, or pick again after it is gone). */
  onLinkCanvas: (ref: BoardRef) => void;
}

/** "card" builds a quest card from canvas notes; "text" is the written form (SubmitForm). */
type ComposeForm = "card" | "text";

type CanvasState = ReturnType<typeof useQuestCanvas>;

const NO_GUIDE: QuestGuide = { zones: [], checklist: [], examples: [] };

/**
 * One quest without a wall of text: what it is, one line of why, the
 * student's own canvas notes for it, what "done" looks like, and a sticky
 * bar to send or ask for help. Sending swaps the body for the quest card
 * composer (notes from the canvas) or the written form.
 */
export function QuestDetailSheet({ board, target, keynote, canvasLink, onClose, onStuck, onLinkCanvas }: QuestDetailSheetProps) {
  // The last quest shown stays in the sheet while it slides closed, so it never closes empty.
  const [last, setLast] = useState<BoardRef | null>(target);
  if (target && target !== last) setLast(target);
  const live = target ? questView(board, target) : null;
  const quest = live ?? (last ? questView(board, last) : null);
  const open = !!live;

  // Compose mode belongs to one quest state; reopening the sheet starts on the quest again.
  const [compose, setCompose] = useState<{ key: string; form: ComposeForm } | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && compose) setCompose(null);
  }

  const ref = quest?.ref ?? null;
  const kind = quest?.kind ?? null;
  const slug = quest?.slug ?? null;
  const action = quest ? detailAction(quest) : null;
  const guide = useMemo(() => (kind ? questGuide({ kind, slug }) : NO_GUIDE), [kind, slug]);
  // A locked quest cannot be done yet, so it does not read the canvas.
  const hasZones = guide.zones.length > 0 && action?.kind !== "locked";
  const canvasTarget = useMemo(() => (open && hasZones && ref ? { ref, slug } : null), [open, hasZones, ref, slug]);
  const canvas = useQuestCanvas(canvasTarget, canvasLink);
  // Quest 5 reads the ownership checklist (ticked in Discord) instead of the canvas.
  const keys = kind === "main" && slug === TAKE_THE_KEYS && action?.kind !== "locked";
  const ownership = useOwnership(open && keys);

  // A new quest state (after a submit, or another quest) ends compose mode for good.
  const bodyKey = quest ? `${refKey(quest.ref)}:${quest.instanceId ?? ""}:${quest.status}` : "";
  if (compose && compose.key !== bodyKey) setCompose(null);
  const composing = compose && compose.key === bodyKey ? compose.form : null;

  // Back from compose: focus returns to the send button it came from.
  const sendRef = useRef<HTMLButtonElement>(null);
  const wasComposing = useRef(composing);
  useEffect(() => {
    if (wasComposing.current && !composing && open) sendRef.current?.focus();
    wasComposing.current = composing;
  }, [composing, open]);

  const footer =
    quest && action && !composing && hasBar(action) ? (
      <QuestActionBar
        quest={quest}
        action={action}
        sendRef={sendRef}
        onSend={() => setCompose({ key: bodyKey, form: hasZones ? "card" : "text" })}
        onStuck={onStuck}
      />
    ) : null;

  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={quest?.title ?? ""}
      description={quest ? badgeText(quest, board.main.length) : undefined}
      descriptionHidden
      footer={footer}
    >
      {quest && action ? (
        composing ? (
          <QuestCompose
            key={bodyKey}
            quest={quest}
            action={action}
            form={composing}
            hasZones={hasZones}
            canvas={canvas}
            ownership={ownership}
            onForm={(form) => setCompose({ key: bodyKey, form })}
            onBack={() => setCompose(null)}
            onClose={onClose}
          />
        ) : (
          <QuestDetailBody
            key={bodyKey}
            quest={quest}
            action={action}
            total={board.main.length}
            keynote={sameRef(keynote, quest.ref)}
            guide={guide}
            hasZones={hasZones}
            canvas={canvas}
            ownership={ownership}
            openHref={canvasLink.linked ? CANVAS_ROUTE : null}
            onLinkCanvas={() => onLinkCanvas(quest.ref)}
          />
        )
      ) : null}
    </IslandSheet>
  );
}

/** "เควสต์หลัก 3/7", "เควสต์เสริม" or "เควสต์ที่คุณเสนอ". */
export function badgeText(quest: QuestView, total: number): string {
  switch (quest.ref.kind) {
    case "main":
      return QUEST.badge.main(quest.ref.milestone, total);
    case "side":
      return QUEST.badge.side;
    case "proposed":
      return QUEST.badge.proposed;
  }
}

/**
 * The sticky bar while there is something to send or to be stuck on: none on
 * a locked quest (no form yet), a finished one or a closed one. A quest held
 * by a teammate or in appeal keeps a lone ติด: help may still be needed there.
 */
function hasBar(action: DetailAction): boolean {
  return action.kind !== "locked" && action.kind !== "done" && action.kind !== "closed";
}

function Icon({ name, size = 16 }: { name: IconKey; size?: number }) {
  const grid = iconGrid(name);
  return <PixelIcon grid={grid} palette={PALETTE} scale={iconScale(grid, size)} className={styles.pixelIcon} />;
}

// ---------------------------------------------------------------- view

function QuestDetailBody({
  quest,
  action,
  total,
  keynote,
  guide,
  hasZones,
  canvas,
  ownership,
  openHref,
  onLinkCanvas,
}: {
  quest: QuestView;
  action: DetailAction;
  total: number;
  keynote: boolean;
  guide: QuestGuide;
  /** The quest reads the canvas (it has zones and is not locked). */
  hasZones: boolean;
  canvas: CanvasState;
  /** Quest 5's ownership checklist; null on every other quest. */
  ownership: OwnershipState | null;
  /**
   * Opens the linked canvas on the whiteboard (CANVAS_ROUTE, which resolves
   * the link on the server); null when none is linked.
   */
  openHref: string | null;
  onLinkCanvas: () => void;
}) {
  const feedback = mentorFeedback(quest);
  const chip = tileChip(quest.status, quest.owner);
  const ready = canvas.context?.state === "ready" ? canvas.context : null;
  const why = quest.purpose.trim();
  const ownRows = ownership?.state === "ready" ? ownership.rows : null;
  const hints = ownership
    ? ownRows
      ? [{ id: "m5-checked", hinted: ownershipAllLit(ownRows), detail: null }]
      : []
    : (ready?.hints ?? []);

  return (
    <div className={styles.detail}>
      <div className={styles.detailChips}>
        <span className={styles.questBadge} data-kind={quest.kind}>
          <Icon name={quest.icon} />
          <span>{badgeText(quest, total)}</span>
        </span>
        <span className={styles.chip} data-status={quest.status} data-keynote={keynote ? "true" : undefined}>
          {chip}
        </span>
        {quest.help ? <span className={styles.helpText}>{BOARD.help}</span> : null}
      </div>

      {/* A proposed quest's goal is the student's own words: never cut. */}
      {why ? (
        <p className={styles.detailWhy} data-full={quest.kind === "proposed" ? "true" : undefined}>
          {why}
        </p>
      ) : null}

      {feedback ? (
        <blockquote className={styles.feedback}>
          <p>{DETAIL.feedback(feedback)}</p>
        </blockquote>
      ) : null}

      {hasZones ? (
        <CanvasBoundary fallback={<p className={styles.hint}>{QUEST.context.error}</p>}>
          <CanvasContextBox context={canvas.context} loading={canvas.loading} onLink={onLinkCanvas} />
        </CanvasBoundary>
      ) : null}

      {ownership ? <OwnershipBox ownership={ownership} /> : null}

      <DoneWhen guide={guide} hints={hints} evidence={quest.evidence} hinting={hasZones || !!ownRows} />

      {/* On every quest: the linked canvas, else (where the notes box does not already ask) linking one. */}
      {openHref ? (
        // A new tab: the quest, its drafts and the island stay as they are.
        <a className={`${styles.quietButton} ${styles.contextAction}`} href={openHref} target="_blank" rel="noopener">
          <Icon name="note" />
          <span>{CANVAS.open}</span>
        </a>
      ) : !hasZones ? (
        <button type="button" className={`${styles.quietButton} ${styles.contextAction}`} onClick={onLinkCanvas}>
          <Icon name="link" />
          <span>{CANVAS.link}</span>
        </button>
      ) : null}

      <MoreDetails quest={quest} guide={guide} />

      <DetailNotice quest={quest} action={action} />
    </div>
  );
}

/** "สำหรับโปรเจกต์คุณ": the student's own notes for this quest, or what to do to see them. */
function CanvasContextBox({
  context,
  loading,
  onLink,
}: {
  context: QuestCanvasContext | null;
  loading: boolean;
  onLink: () => void;
}) {
  const headingId = useId();
  if (!context || (loading && context.state !== "ready")) {
    return (
      <section className={styles.context} aria-labelledby={headingId}>
        <h3 id={headingId} className={styles.detailHeading}>
          {QUEST.context.heading}
        </h3>
        <ContextSkeleton />
      </section>
    );
  }
  switch (context.state) {
    case "no_zones":
      return null;
    case "error":
      return <p className={styles.hint}>{QUEST.context.error}</p>;
    case "unlinked":
      return (
        <section className={styles.contextPrompt} aria-labelledby={headingId}>
          <h3 id={headingId} className={styles.detailHeading}>
            {QUEST.context.unlinked.heading}
          </h3>
          <p className={styles.contextPromptBody}>{QUEST.context.unlinked.body}</p>
          <button type="button" className={`${styles.quietButton} ${styles.contextAction}`} onClick={onLink}>
            <Icon name="link" />
            <span>{QUEST.context.unlinked.action}</span>
          </button>
        </section>
      );
    case "not_yours":
      return (
        <section className={styles.context} aria-labelledby={headingId}>
          <h3 id={headingId} className={styles.detailHeading}>
            {QUEST.context.heading}
          </h3>
          <p className={styles.notice}>{QUEST.context.notYours}</p>
        </section>
      );
    case "gone":
      return (
        <section className={styles.context} aria-labelledby={headingId}>
          <h3 id={headingId} className={styles.detailHeading}>
            {QUEST.context.heading}
          </h3>
          <p className={styles.notice}>{QUEST.context.gone}</p>
          <button type="button" className={`${styles.quietButton} ${styles.contextAction}`} onClick={onLink}>
            <Icon name="link" />
            <span>{QUEST.context.pickAgain}</span>
          </button>
        </section>
      );
    case "ready":
      return (
        <section className={styles.context} aria-labelledby={headingId}>
          <h3 id={headingId} className={styles.detailHeading}>
            {QUEST.context.heading}
          </h3>
          <div className={styles.contextStrip}>
            <ul className={styles.contextRows}>
              {context.context.length > 0 ? (
                context.context.map((row, i) => <ContextRowItem key={`${row.kind}:${i}`} row={row} />)
              ) : (
                <li className={styles.contextRow} data-empty="true">
                  <span className={styles.contextText}>{QUEST.context.empty}</span>
                </li>
              )}
            </ul>
            <p className={styles.contextFoot}>
              <span className={styles.contextFrom}>{QUEST.context.from(context.canvas.title)}</span>
              <button type="button" className={styles.contextChange} onClick={onLink}>
                {QUEST.context.change}
              </button>
            </p>
          </div>
        </section>
      );
  }
}

/** One zone's row: "{emoji} {label}: {note}" with its version or a count. Emoji only from SHIFT_CARDS. */
function ContextRowItem({ row }: { row: ContextRow }) {
  const card = SHIFT_CARDS[row.kind];
  const text = row.text?.trim() ? row.text.trim() : null;
  const count = row.count != null && row.count > 0 ? row.count : null;
  const empty = !text && !count;
  const zone = { "--zone": card?.color ?? "#e9ecef" } as CSSProperties;
  // "ดูบนแคนวาส" repeats on every row: the row's own words (the description) tell the links apart.
  const textId = useId();
  return (
    <li className={styles.contextRow} style={zone} data-empty={empty ? "true" : undefined}>
      <span id={textId} className={styles.contextText}>
        {card ? <span aria-hidden="true">{card.emoji} </span> : null}
        <span className={styles.contextLabel}>
          {row.label}
          {text || empty ? ": " : ""}
        </span>
        {text ?? (empty ? QUEST.context.empty : null)}
      </span>
      {row.version != null || count ? (
        <span className={styles.contextTags}>
          {row.version != null ? <span className={styles.contextTag}>{QUEST.context.version(row.version)}</span> : null}
          {count ? <span className={styles.contextTag}>{QUEST.context.count(count)}</span> : null}
        </span>
      ) : null}
      {row.noteId ? (
        <a
          className={styles.contextNote}
          href={canvasHref(row.noteId)}
          target="_blank"
          rel="noopener"
          aria-describedby={textId}
        >
          {CANVAS.note}
        </a>
      ) : null}
    </li>
  );
}

/** Three pixel rows while the notes (or the checklist) load. */
function ContextSkeleton({ label = QUEST.context.loading }: { label?: string }) {
  return (
    <div className={styles.contextStrip} role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <ul className={styles.contextRows} aria-hidden="true">
        {[72, 54, 38].map((width) => (
          <li key={width} className={styles.contextRow} data-skeleton="true">
            <span className={styles.skeletonBar} style={{ width: `${width}%` }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Quest 5's "สำหรับโปรเจกต์คุณ": the ownership checklist as ticked in Discord,
 * read-only, and where to change it.
 */
function OwnershipBox({ ownership }: { ownership: OwnershipState }) {
  const headingId = useId();
  const rows = ownership.state === "ready" ? ownership.rows : null;
  return (
    <section className={styles.context} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.detailHeading}>
        {QUEST.context.heading}
      </h3>
      {ownership.state === "loading" ? (
        <ContextSkeleton label={QUEST.ownership.loading} />
      ) : rows && rows.length > 0 ? (
        <div className={styles.contextStrip}>
          <ul className={styles.contextRows}>
            {rows.map((row) => (
              <li key={row.item} className={styles.contextRow} data-empty={ownershipLit(row) ? undefined : "true"}>
                <span className={styles.contextText}>
                  <span className={styles.contextLabel}>{`${OWNERSHIP_LABEL[row.item]}: `}</span>
                  {OWNERSHIP_STATE_LABEL[row.state]}
                </span>
                {row.mentorHeld ? (
                  <span className={styles.contextTags}>
                    <span className={styles.contextTag}>{QUEST.ownership.mentorHeld}</span>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className={styles.contextFoot}>
            <span className={styles.contextFrom}>{QUEST.ownership.where}</span>
          </p>
        </div>
      ) : (
        <p className={styles.hint}>{QUEST.ownership.fallback}</p>
      )}
    </section>
  );
}

/** "เสร็จเมื่อ": at most three items; a lit check is a hint from the canvas, never a gate. */
function DoneWhen({
  guide,
  hints,
  evidence,
  hinting,
}: {
  guide: QuestGuide;
  hints: ChecklistHint[];
  evidence: string;
  hinting: boolean;
}) {
  const headingId = useId();
  const guided = guide.checklist.length > 0;
  const items = guided ? guide.checklist.slice(0, 3) : evidence.trim() ? [{ id: "evidence", label: evidence.trim() }] : [];
  if (items.length === 0) return null;
  const byId = new Map(hints.map((hint) => [hint.id, hint]));
  return (
    <section className={styles.doneWhen} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.detailHeading}>
        {QUEST.doneWhen.heading}
      </h3>
      <ul className={styles.doneList}>
        {items.map((item) => {
          const hint = guided ? byId.get(item.id) : undefined;
          const lit = !!hint?.hinted;
          return (
            <li key={item.id} className={styles.doneItem} data-hinted={lit ? "true" : undefined}>
              <PixelCheck lit={lit} />
              <span className={styles.doneText}>
                {lit ? <span className="sr-only">{`${QUEST.doneWhen.hinted}: `}</span> : null}
                {item.label}
                {hint?.detail ? <span className={styles.doneDetail}>{hint.detail}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      {hinting && guided ? <p className={styles.hint}>{QUEST.doneWhen.hint}</p> : null}
    </section>
  );
}

function PixelCheck({ lit }: { lit: boolean }) {
  return (
    <span className={styles.doneCheck} data-lit={lit ? "true" : undefined} aria-hidden="true">
      {lit ? (
        <>
          <span className={styles.doneGlow} data-island-glow="" />
          <Icon name="check" />
        </>
      ) : null}
    </span>
  );
}

/** A template quest's purpose longer than this is cut to two lines above, and shown whole under the details. */
const LONG_PURPOSE = 120;

/**
 * Collapsed rows: passing examples, and the details not already on the page
 * (the criteria when เสร็จเมื่อ has its own checklist, a long purpose in full,
 * the question).
 */
function MoreDetails({ quest, guide }: { quest: QuestView; guide: QuestGuide }) {
  const examples =
    quest.kind === "main"
      ? guide.examples.filter((line) => line.trim())
      : quest.kind === "side" && quest.examples
        ? quest.examples.split("\n").map((line) => line.trim()).filter(Boolean)
        : [];
  // Without a guide checklist, เสร็จเมื่อ already shows the criteria as its one item.
  const evidence = guide.checklist.length > 0 ? quest.evidence.trim() : "";
  const purpose = quest.purpose.trim();
  const goal = quest.kind !== "proposed" && purpose.length > LONG_PURPOSE ? purpose : "";
  const prompt = quest.reflectionPrompt.trim();
  if (examples.length === 0 && !evidence && !goal && !prompt) return null;
  return (
    <div className={styles.moreRows}>
      {examples.length > 0 ? (
        <details className={styles.more}>
          <summary className={styles.moreSummary}>
            <span>{QUEST.examples}</span>
            <ChevronDown className={styles.moreCaret} aria-hidden="true" />
          </summary>
          <ul className={styles.moreList}>
            {examples.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {evidence || goal || prompt ? (
        <details className={styles.more}>
          <summary className={styles.moreSummary}>
            <span>{QUEST.details}</span>
            <ChevronDown className={styles.moreCaret} aria-hidden="true" />
          </summary>
          <div className={styles.moreBody}>
            {goal ? (
              <div className={styles.detailBlock}>
                <h4 className={styles.detailSubheading}>{QUEST.why}</h4>
                <p>{goal}</p>
              </div>
            ) : null}
            {evidence ? (
              <div className={styles.detailBlock}>
                <h4 className={styles.detailSubheading}>{DETAIL.evidence}</h4>
                <p>{evidence}</p>
              </div>
            ) : null}
            {prompt ? (
              <div className={styles.detailBlock}>
                <h4 className={styles.detailSubheading}>{DETAIL.reflection}</h4>
                <p>{prompt}</p>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

/** The quest's state in words (locked, held, waiting...), plus start or resume where they apply. */
function DetailNotice({ quest, action }: { quest: QuestView; action: DetailAction }) {
  switch (action.kind) {
    case "locked":
      return (
        <p className={styles.notice} data-tone="locked">
          {DETAIL.locked(quest.lockedBy)}
        </p>
      );
    case "held":
      return <p className={styles.notice}>{DETAIL.held(quest.owner)}</p>;
    case "appealed":
      return <p className={styles.notice}>{DETAIL.appealed}</p>;
    case "done":
      return (
        <p className={styles.notice} data-tone="done">
          {DETAIL.done}
        </p>
      );
    case "closed":
      return <p className={styles.notice}>{DETAIL.declinedProposed}</p>;
    case "paused":
      return (
        <>
          <p className={styles.notice}>{DETAIL.paused}</p>
          {quest.instanceId ? <ResumeQuest instanceId={quest.instanceId} /> : null}
        </>
      );
    case "form":
      if (action.note === "submittedWaiting") {
        return (
          <p className={styles.notice} role="status">
            {DETAIL.submittedWaiting}
          </p>
        );
      }
      return (
        <>
          {action.note === "doneRepeat" ? (
            <p className={styles.notice} data-tone="done">
              {DETAIL.doneRepeat}
            </p>
          ) : null}
          {canStart(quest) ? <StartQuest quest={quest} /> : null}
        </>
      );
  }
}

/** The sticky bar: ส่งเควสต์ (or ส่งฉบับใหม่ while a mentor has it) and ติด. */
function QuestActionBar({
  quest,
  action,
  sendRef,
  onSend,
  onStuck,
}: {
  quest: QuestView;
  action: DetailAction;
  sendRef: RefObject<HTMLButtonElement | null>;
  onSend: () => void;
  onStuck: QuestDetailSheetProps["onStuck"];
}) {
  const send = action.kind === "form";
  // With the work already at a mentor, a new version stays a quiet choice.
  const waiting = action.kind === "form" && action.note === "submittedWaiting";
  const stuck = action.kind !== "locked";
  return (
    <div className={styles.actionBar} data-single={send && stuck ? undefined : "true"}>
      {send ? (
        <button
          ref={sendRef}
          type="button"
          className={waiting ? `${styles.quietButton} ${styles.barButton}` : `ei-button-dawn ${styles.primary} ${styles.barButton}`}
          onClick={onSend}
        >
          <Icon name="send" />
          <span>{waiting ? QUEST.resend : QUEST.send}</span>
        </button>
      ) : null}
      {stuck ? (
        <button
          type="button"
          className={`${styles.quietButton} ${styles.barButton} ${styles.barStuck}`}
          onClick={() => onStuck({ instanceId: quest.instanceId, title: quest.title })}
        >
          <Icon name="sos" />
          <span>{QUEST.stuck}</span>
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- compose

/**
 * Sending: the quest card composer when the canvas is ready (it brings its
 * own action row), otherwise the written form, with "เขียนเองแทน" between them.
 */
function QuestCompose({
  quest,
  action,
  form,
  hasZones,
  canvas,
  ownership,
  onForm,
  onBack,
  onClose,
}: {
  quest: QuestView;
  action: DetailAction;
  form: ComposeForm;
  hasZones: boolean;
  canvas: CanvasState;
  ownership: OwnershipState | null;
  onForm: (form: ComposeForm) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  // Focus (and scroll) to the top on entering, and again on switching forms: the switch button itself goes away.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.focus();
  }, [form]);

  const ready = canvas.context?.state === "ready" ? canvas.context : null;
  const resubmit = action.kind === "form" ? action.resubmit : false;
  const card = form === "card" && hasZones && ready ? ready : null;
  const cardLoading = form === "card" && hasZones && !ready && (canvas.loading || !canvas.context);
  // Quest 5: the server adds the checklist under the proof, so the proof leaves room for it.
  const ownRows = ownership?.state === "ready" ? (ownership.rows ?? []) : [];
  const attach = ownership
    ? {
        note: QUEST.ownership.attached,
        proofMax: ownRows.length > 0 ? TEXT_LIMITS.proof - ownershipSnapshot(ownRows).length - 2 : TEXT_LIMITS.proof,
      }
    : null;
  const textForm = (
    <SubmitForm
      quest={quest}
      resubmit={resubmit}
      onSubmitted={onClose}
      note={attach?.note}
      proofMax={attach?.proofMax}
    />
  );

  return (
    <div ref={box} tabIndex={-1} className={styles.compose}>
      <div className={styles.composeTop}>
        {card ? null : (
          <button type="button" className={styles.composeBack} onClick={onBack}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span>{QUEST.back}</span>
          </button>
        )}
        {card || cardLoading ? (
          <button type="button" className={styles.composeSwitch} onClick={() => onForm("text")}>
            {QUEST.writeInstead}
          </button>
        ) : form === "text" && hasZones && ready ? (
          <button type="button" className={styles.composeSwitch} onClick={() => onForm("card")}>
            {QUEST.useCanvas}
          </button>
        ) : null}
      </div>
      {card ? (
        <CanvasBoundary fallback={textForm}>
          <QuestCardComposer
            target={{
              ref: quest.ref,
              slug: quest.slug,
              title: quest.title,
              reflectionPrompt: quest.reflectionPrompt.trim() || DETAIL.reflectionFallback,
              version: quest.version,
              resubmit,
            }}
            context={card}
            loading={canvas.loading}
            onReload={canvas.reload}
            onSubmitted={onClose}
            onCancel={onBack}
          />
        </CanvasBoundary>
      ) : cardLoading ? (
        <ContextSkeleton />
      ) : (
        textForm
      )}
    </div>
  );
}

// ---------------------------------------------------------------- shared

/**
 * Anything from the canvas that throws while rendering shows its fallback
 * instead: a canvas problem never takes the quest sheet down with it.
 */
class CanvasBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error("[shift-island] canvas panel failed:", error instanceof Error ? error.name : "unknown");
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Mark a main or side quest as started without sending anything yet, so it
 * shows as the student's active quest (the keynote) and as held to teammates.
 */
function StartQuest({ quest }: { quest: QuestView }) {
  const [pending, startTransition] = useTransition();
  const ref = quest.ref;
  if (ref.kind === "proposed") return null;
  return (
    <button
      type="button"
      className={styles.quietButton}
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        startTransition(async () => {
          const result =
            ref.kind === "main"
              ? await startMainQuest({ milestone: ref.milestone })
              : await chooseSideQuest({ templateId: ref.templateId });
          if (result.ok) toast.success(DETAIL.started);
          else toast.error(result.error || COMMON.failed);
        })
      }
    >
      {DETAIL.start}
    </button>
  );
}

/** Wake one paused quest (rest pauses them all; this resumes just this one). */
function ResumeQuest({ instanceId }: { instanceId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={`ei-button-dawn ${styles.primary}`}
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await resumeQuest({ instanceId });
          if (result.ok) toast.success(DETAIL.resumed);
          else toast.error(result.error || COMMON.failed);
        })
      }
    >
      <span>{DETAIL.resume}</span>
    </button>
  );
}
