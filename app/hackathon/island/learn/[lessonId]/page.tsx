import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { LEARN_COPY } from "@/components/hackathon/elemental/lessons/copy";
import { LessonPlayer } from "@/components/hackathon/elemental/lessons/LessonPlayer";
import { ISLAND_PATH, LEARN_PATH, withEdition } from "@/components/hackathon/elemental/lessons/model";
import { getLessonViewer } from "@/lib/elemental/web/learn-actions";
import { getLesson } from "@/lib/elemental/web/lessons";
import { ELEMENTAL_EVENT_EDITION, resolvePublicEdition } from "@/lib/supabase/elemental";

/**
 * /hackathon/island/learn/[lessonId]: one lesson, one clip at a time. The
 * viewer and their own saved parts are read at request time; the player
 * saves through saveLessonAnswer. Unknown lesson ids are a 404. Not indexed.
 */
export const dynamic = "force-dynamic";

type Params = Promise<{ lessonId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  return {
    title: lesson ? `${lesson.title} · ${LEARN_COPY.listTitle}` : LEARN_COPY.listTitle,
    robots: { index: false, follow: false },
  };
}

export default async function ElementalLessonPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ lessonId }, query] = await Promise.all([params, searchParams]);
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();
  const edition = resolvePublicEdition(first(query.edition));
  const viewer = await getLessonViewer({ edition });
  return (
    <div className={trirong.variable}>
      <LessonPlayer
        key={lesson.id}
        lesson={lesson}
        viewer={viewer}
        edition={edition}
        listHref={withEdition(LEARN_PATH, edition, ELEMENTAL_EVENT_EDITION)}
        islandHref={withEdition(ISLAND_PATH, edition, ELEMENTAL_EVENT_EDITION)}
      />
    </div>
  );
}
