import Link from "next/link";

import type { Lesson } from "@/lib/elemental/web/lessons";
import type { LessonViewer } from "@/lib/elemental/web/learn-actions";

import { LEARN_COPY } from "./copy";
import styles from "./learn.module.css";
import { lessonStatus, type LessonListStatus } from "./model";
import { ViewerBanner } from "./ViewerBanner";

export interface LessonListProps {
  lessons: readonly Lesson[];
  viewer: LessonViewer;
  /** Each lesson's player link, by lesson id (the edition kept). */
  lessonHref: (lessonId: string) => string;
  islandHref: string;
}

function statusText(status: LessonListStatus): string {
  if (status.kind === "finished") return LEARN_COPY.statusFinished;
  if (status.kind === "progress") return LEARN_COPY.statusProgress(status.done, status.total);
  return LEARN_COPY.statusNew;
}

/** The lesson list: one card per lesson with the viewer's own progress. Pulled, never pushed. */
export function LessonList({ lessons, viewer, lessonHref, islandHref }: LessonListProps) {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <nav className={styles.topNav}>
          <Link href={islandHref} className={styles.textLink}>
            {LEARN_COPY.toIsland}
          </Link>
        </nav>
        <header className={styles.header}>
          <h1>{LEARN_COPY.listTitle}</h1>
          <p>{LEARN_COPY.listLede}</p>
        </header>
        <ViewerBanner mode={viewer.mode} reason={viewer.reason} />
        {lessons.length === 0 ? (
          <p className={styles.dim}>{LEARN_COPY.listEmpty}</p>
        ) : (
          <ol className={styles.lessonList} data-testid="lesson-list">
            {lessons.map((lesson, i) => {
              const status = lessonStatus(lesson, viewer);
              return (
                <li key={lesson.id}>
                  <Link href={lessonHref(lesson.id)} className={styles.lessonCard} data-status={status.kind}>
                    <span className={styles.lessonNo} aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.lessonBody}>
                      <span className={styles.lessonTitle}>{lesson.title}</span>
                      <span className={styles.lessonMeta}>
                        {LEARN_COPY.partsCount(lesson.parts.length)} · {statusText(status)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
