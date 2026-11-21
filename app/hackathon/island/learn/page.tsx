import type { Metadata } from "next";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { LEARN_COPY } from "@/components/hackathon/elemental/lessons/copy";
import { LessonList } from "@/components/hackathon/elemental/lessons/LessonList";
import { ISLAND_PATH, lessonPath, withEdition } from "@/components/hackathon/elemental/lessons/model";
import { getLessonViewer } from "@/lib/elemental/web/learn-actions";
import { LESSONS } from "@/lib/elemental/web/lessons";
import { ELEMENTAL_EVENT_EDITION, resolvePublicEdition } from "@/lib/supabase/elemental";

/**
 * /hackathon/island/learn: the Elemental lessons. Anyone can watch; answers
 * are saved only for a Discord-signed-in member on a live team
 * (getLessonViewer). ?edition=elemental-dryrun is the rehearsal guild's.
 * Read at request time, so the build never reaches the database. Not indexed.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: LEARN_COPY.listTitle,
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ElementalLearnPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const edition = resolvePublicEdition(first(params.edition));
  const viewer = await getLessonViewer({ edition });
  return (
    <div className={trirong.variable}>
      <LessonList
        lessons={LESSONS}
        viewer={viewer}
        lessonHref={(id) => withEdition(lessonPath(id), edition, ELEMENTAL_EVENT_EDITION)}
        islandHref={withEdition(ISLAND_PATH, edition, ELEMENTAL_EVENT_EDITION)}
      />
    </div>
  );
}
