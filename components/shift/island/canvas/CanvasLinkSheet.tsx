"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { linkCanvas, listMyCanvases, unlinkCanvas } from "@/app/shift/island/actions";
import type { CanvasChoice, CanvasLinkState } from "@/lib/shift-island/quest-canvas";

import { IslandSheet } from "../IslandSheet";
import { LINK_SHEET, shortDate } from "./copy";
import styles from "./canvas.module.css";

export interface CanvasLinkSheetProps {
  open: boolean;
  link: CanvasLinkState;
  onClose: () => void;
  /** The link changed (linked to a canvas). The page refreshes itself; close and reload what depends on it. */
  onLinked: () => void;
}

type ListState = { state: "loading" } | { state: "error" } | { state: "ready"; choices: CanvasChoice[] };

/**
 * Picks the one SHIFT canvas the quest project reads its notes from: only the
 * student's own canvases (owner or teammate), listed by the server when the
 * sheet opens (boards can be large, so never before).
 */
export function CanvasLinkSheet({ open, link, onClose, onLinked }: CanvasLinkSheetProps) {
  const [list, setList] = useState<ListState>({ state: "loading" });
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ticket = useRef(0);

  useEffect(() => {
    if (!open) return;
    const mine = ++ticket.current;
    setList({ state: "loading" });
    listMyCanvases().then(
      (result) => {
        if (mine !== ticket.current) return;
        setList(result.ok ? { state: "ready", choices: result.data } : { state: "error" });
      },
      () => {
        if (mine === ticket.current) setList({ state: "error" });
      }
    );
    return () => {
      if (mine === ticket.current) ticket.current += 1;
    };
  }, [open, nonce]);

  function choose(choice: CanvasChoice) {
    if (pending) return;
    setBusy(`link:${choice.boardId}:${choice.frameId}`);
    startTransition(async () => {
      const result = await linkCanvas({ boardId: choice.boardId, frameId: choice.frameId });
      setBusy(null);
      if (result.ok) {
        toast.success(LINK_SHEET.linkedToast);
        onLinked();
      } else {
        toast.error(result.error || LINK_SHEET.failedAction);
        setNonce((n) => n + 1);
      }
    });
  }

  function unlink() {
    if (pending) return;
    setBusy("unlink");
    startTransition(async () => {
      const result = await unlinkCanvas();
      setBusy(null);
      if (result.ok) toast.success(LINK_SHEET.unlinkedToast);
      else toast.error(result.error || LINK_SHEET.failedAction);
      setNonce((n) => n + 1);
    });
  }

  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title={LINK_SHEET.title}
      description={LINK_SHEET.description}
    >
      <div className={styles.picker} aria-busy={list.state === "loading"}>
        {list.state === "loading" ? (
          <div className={styles.skeleton} role="status" aria-label={LINK_SHEET.loading}>
            <span />
            <span />
            <span />
          </div>
        ) : null}

        {list.state === "error" ? (
          <p className={styles.quiet} role="alert">
            {LINK_SHEET.failed}{" "}
            <button type="button" className={styles.textButton} onClick={() => setNonce((n) => n + 1)}>
              {LINK_SHEET.retry}
            </button>
          </p>
        ) : null}

        {list.state === "ready" && list.choices.length === 0 ? (
          <div className={styles.empty}>
            <p>{LINK_SHEET.empty}</p>
            <Link href="/whiteboard" className={`ei-button-dawn ${styles.primary}`}>
              <span>{LINK_SHEET.openWhiteboard}</span>
            </Link>
          </div>
        ) : null}

        {list.state === "ready" && list.choices.length > 0 ? (
          <ul className={styles.choices}>
            {list.choices.map((choice) => {
              const id = `${choice.boardId}:${choice.frameId}`;
              const linking = busy === `link:${id}`;
              return (
                <li key={id} className={styles.choice} data-linked={choice.linked ? "true" : undefined}>
                  <div className={styles.choiceHead}>
                    <p className={styles.choiceTitle}>{choice.title}</p>
                    <span className={styles.chip}>{choice.role === "owner" ? LINK_SHEET.owner : LINK_SHEET.team}</span>
                    {choice.linked ? <span className={`${styles.chip} ${styles.chipOn}`}>{LINK_SHEET.linked}</span> : null}
                  </div>
                  <p className={styles.choiceMeta}>{LINK_SHEET.meta(choice.boardTitle, shortDate(choice.lastEdited), choice.notes)}</p>
                  {choice.linked ? (
                    <button
                      type="button"
                      className={styles.quietButton}
                      onClick={unlink}
                      disabled={pending}
                      aria-busy={busy === "unlink"}
                    >
                      {busy === "unlink" ? LINK_SHEET.unlinking : LINK_SHEET.unlink}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`ei-button-dawn ${styles.primary}`}
                      onClick={() => choose(choice)}
                      disabled={pending}
                      aria-busy={linking}
                    >
                      {linking ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
                      <span>{linking ? LINK_SHEET.linking : LINK_SHEET.link}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}

        {list.state === "ready" && link.linked && !list.choices.some((c) => c.linked) ? (
          <button type="button" className={styles.quietButton} onClick={unlink} disabled={pending}>
            {busy === "unlink" ? LINK_SHEET.unlinking : LINK_SHEET.unlink}
          </button>
        ) : null}

        <p className={styles.fine}>{LINK_SHEET.fine}</p>
      </div>
    </IslandSheet>
  );
}
