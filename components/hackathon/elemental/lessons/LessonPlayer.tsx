"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Lock } from "lucide-react";

import { currentPart, isFinalPart, isPartOpen, type Lesson, type LessonPart, type LessonStop } from "@/lib/elemental/web/lessons";
import {
  saveLessonAnswer,
  type LessonCanvasStatus,
  type LessonSaveResult,
  type LessonViewer,
  type LessonWatchReason,
} from "@/lib/elemental/web/learn-actions";

import { CANVAS_COPY, LEARN_COPY } from "./copy";
import styles from "./learn.module.css";
import { clipUrl } from "./model";
import { StopForm } from "./StopForm";
import { ViewerBanner } from "./ViewerBanner";

export interface LessonPlayerProps {
  lesson: Lesson;
  viewer: LessonViewer;
  /** The edition answers are saved in (the page resolved it). */
  edition: string;
  listHref: string;
  islandHref: string;
}

type Finish = { badgeAwarded: boolean; canvas: LessonCanvasStatus };
type Failure = Exclude<LessonSaveResult, { ok: true } | { error: "watch_only" }>["error"];

const FAILURE_COPY: Record<Failure, string> = {
  pii: LEARN_COPY.errorPii,
  bad_answer: LEARN_COPY.errorBadAnswer,
  bad_part: LEARN_COPY.errorBadPart,
  bad_lesson: LEARN_COPY.errorBadPart,
  unavailable: LEARN_COPY.errorUnavailable,
};

function savedAnswers(viewer: LessonViewer, lessonId: string): Map<number, string | null> {
  return new Map((viewer.progress[lessonId]?.parts ?? []).map((p) => [p.part, p.answer]));
}

/** One clip, or a placeholder while it is still to be picked. Only the selected part's clip is on the page. */
function Clip({ part }: { part: LessonPart }) {
  const src = clipUrl(part.youtubeId);
  return (
    <div className={styles.clip} data-testid="lesson-clip">
      {src ? (
        <iframe
          src={src}
          title={LEARN_COPY.clipTitle(part.title)}
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <p className={styles.clipTodo}>{LEARN_COPY.clipTodo}</p>
      )}
    </div>
  );
}

/** A stop as a watcher sees it: the prompt, no form. */
function StopPreview({ stop }: { stop: LessonStop }) {
  return (
    <div className={styles.stop} data-kind={stop.kind}>
      <p className={styles.prompt}>{stop.prompt}</p>
      {stop.kind === "choice" ? (
        <ul className={styles.previewOptions}>
          {stop.options.map((o) => (
            <li key={o.id}>{o.label}</li>
          ))}
        </ul>
      ) : null}
      <p className={styles.hint}>{LEARN_COPY.watchStopNote}</p>
    </div>
  );
}

/**
 * The lesson player: one clip at a time, each part ending in its stop. While
 * saving, a part opens only once every stop before it is answered (the same
 * rule as the server, lessons.ts currentPart). A watcher sees every clip and
 * every prompt, and nothing is sent. Saving the last part shows the finish
 * screen. Nothing is pushed: no notifications, no reminders.
 */
export function LessonPlayer({ lesson, viewer, edition, listHref, islandHref }: LessonPlayerProps) {
  const [mode, setMode] = useState(viewer.mode);
  const [reason, setReason] = useState<LessonWatchReason | null>(viewer.reason);
  const [answers, setAnswers] = useState(() => savedAnswers(viewer, lesson.id));
  const [finishedBefore, setFinishedBefore] = useState(() => viewer.progress[lesson.id]?.finished === true);
  const [selected, setSelected] = useState(() =>
    viewer.mode === "save" ? currentPart(lesson, savedAnswers(viewer, lesson.id).keys()) : 0,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [finish, setFinish] = useState<Finish | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const saving = mode === "save";
  const answered = [...answers.keys()];
  const total = lesson.parts.length;
  const part = lesson.parts[selected];
  const last = isFinalPart(lesson, selected);
  const nextOpen = !last && (!saving || isPartOpen(lesson, selected + 1, answered));

  // Moving between parts puts focus on the part's heading, so a screen reader starts there.
  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
  }, [selected, finish]);

  function go(to: number) {
    if (to < 0 || to >= total) return;
    if (saving && !isPartOpen(lesson, to, answered)) return;
    moved.current = true;
    setError(null);
    if (to !== selected) setNotice(null);
    setSelected(to);
  }

  async function save(answer: string | null) {
    if (pending || !saving) return;
    const at = selected;
    setPending(true);
    setError(null);
    setNotice(null);
    let result: LessonSaveResult;
    try {
      result = await saveLessonAnswer({ lessonId: lesson.id, part: at, ...(answer === null ? {} : { answer }), edition });
    } catch {
      result = { ok: false, error: "unavailable" };
    }
    setPending(false);
    if (!result.ok) {
      if (result.error === "watch_only") {
        setMode("watch");
        setReason(result.reason);
        return;
      }
      setError(FAILURE_COPY[result.error]);
      return;
    }
    setAnswers((prev) => new Map(prev).set(at, answer));
    if (result.final && result.finished) {
      moved.current = true;
      setFinishedBefore(true);
      setFinish({ badgeAwarded: result.badgeAwarded, canvas: result.canvas });
      return;
    }
    const lines = [LEARN_COPY.saved(at + 1)];
    if (result.canvas !== "none") lines.push(CANVAS_COPY[result.canvas]);
    setNotice(lines.join(" "));
    if (!isFinalPart(lesson, at)) {
      moved.current = true;
      setSelected(at + 1);
    }
  }

  if (finish) {
    return (
      <main className={styles.page}>
        <div className={styles.inner}>
          <section className={styles.finish} data-testid="lesson-finish" aria-labelledby="lesson-finish-title">
            <h1 id="lesson-finish-title" ref={headingRef} tabIndex={-1}>
              {LEARN_COPY.finishedTitle}
            </h1>
            <p className={styles.finishLesson}>{lesson.title}</p>
            <p>{finish.badgeAwarded ? LEARN_COPY.badgeAwarded : LEARN_COPY.badgeKept}</p>
            {finish.canvas !== "none" ? <p className={styles.dim}>{CANVAS_COPY[finish.canvas]}</p> : null}
            <div className={styles.actions}>
              <Link href={listHref} className={styles.button}>
                {LEARN_COPY.backToList}
              </Link>
              <Link href={islandHref} className={styles.quietButton}>
                {LEARN_COPY.toIsland}
              </Link>
              <button
                type="button"
                className={styles.quietButton}
                onClick={() => {
                  setFinish(null);
                  setNotice(null);
                  setSelected(0);
                }}
              >
                {LEARN_COPY.watchAgain}
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <nav className={styles.topNav}>
          <Link href={listHref} className={styles.textLink}>
            {LEARN_COPY.backToList}
          </Link>
        </nav>
        <header className={styles.header}>
          <h1>{lesson.title}</h1>
        </header>
        <ViewerBanner mode={mode} reason={reason} />
        {saving && finishedBefore ? <p className={styles.dim}>{LEARN_COPY.finishedBefore}</p> : null}

        <section className={styles.player} aria-labelledby="lesson-part-title" data-testid="lesson-part" data-part={selected}>
          <p className={styles.partOf}>{LEARN_COPY.partOf(selected + 1, total)}</p>
          <h2 id="lesson-part-title" ref={headingRef} tabIndex={-1} className={styles.partTitle}>
            {part.title}
          </h2>
          <Clip key={`clip-${selected}`} part={part} />
          {notice ? (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          ) : null}
          {part.stop ? (
            saving ? (
              <StopForm
                key={`stop-${selected}`}
                stop={part.stop}
                saved={answers.get(selected) ?? null}
                pending={pending}
                error={error}
                onSubmit={(answer) => void save(answer)}
              />
            ) : (
              <StopPreview stop={part.stop} />
            )
          ) : saving ? (
            <div className={styles.stop}>
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
              <button type="button" className={styles.button} disabled={pending} aria-busy={pending} onClick={() => void save(null)}>
                {pending ? LEARN_COPY.saving : LEARN_COPY.finish}
              </button>
            </div>
          ) : null}

          <div className={styles.stepper}>
            <button type="button" className={styles.quietButton} onClick={() => go(selected - 1)} disabled={selected === 0}>
              {LEARN_COPY.prevPart}
            </button>
            {last ? null : (
              <button
                type="button"
                className={styles.quietButton}
                onClick={() => go(selected + 1)}
                disabled={!nextOpen}
                aria-describedby={nextOpen ? undefined : "lesson-next-locked"}
              >
                {nextOpen ? null : <Lock className={styles.icon} aria-hidden="true" />}
                <span>{LEARN_COPY.nextPart}</span>
              </button>
            )}
          </div>
          {nextOpen || last ? null : (
            <p id="lesson-next-locked" className={styles.hint}>
              {LEARN_COPY.nextLocked}
            </p>
          )}
        </section>

        <section aria-labelledby="lesson-parts-heading">
          <h2 id="lesson-parts-heading" className={styles.sectionTitle}>
            {LEARN_COPY.partsHeading}
          </h2>
          <ol className={styles.parts} data-testid="lesson-parts">
            {lesson.parts.map((p, i) => {
              const open = !saving || isPartOpen(lesson, i, answered);
              const done = saving && answers.has(i);
              const state = !open ? "locked" : done ? "done" : saving && i === currentPart(lesson, answered) ? "current" : "open";
              return (
                <li key={i}>
                  <button
                    type="button"
                    className={styles.partButton}
                    data-state={state}
                    aria-current={i === selected ? "step" : undefined}
                    disabled={!open}
                    onClick={() => go(i)}
                  >
                    <span className={styles.partNo} aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className={styles.partName}>{p.title}</span>
                    <span className={styles.partState}>
                      {state === "locked" ? (
                        <>
                          <Lock className={styles.icon} aria-hidden="true" />
                          {LEARN_COPY.partLocked}
                        </>
                      ) : state === "done" ? (
                        <>
                          <Check className={styles.icon} aria-hidden="true" />
                          {LEARN_COPY.partDone}
                        </>
                      ) : state === "current" ? (
                        LEARN_COPY.partCurrent
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </main>
  );
}
