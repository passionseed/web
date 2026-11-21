import type { Metadata } from "next";

import { ISLAND_COPY } from "@/components/hackathon/elemental/island/copy";
import { ElementalIslandView } from "@/components/hackathon/elemental/island/ElementalIslandView";
import { trirong } from "@/components/hackathon/elemental/fonts";
import { getElementalPublicIsland, resolvePublicEdition } from "@/lib/supabase/elemental";

/**
 * /hackathon/island: the Elemental island, read-only and signed out. Every
 * live team's plot, five element level bars and the legend (plot number,
 * project, element). ?screen=1 is the shared-screen layout, refreshed every
 * 60 s; ?edition=elemental-dryrun shows the rehearsal guild's island.
 *
 * Read at request time with the service role (lib/supabase/elemental.ts), so
 * the build never reaches the database. Not indexed: project names of
 * students' teams are shown, not promoted.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: ISLAND_COPY.title,
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ElementalIslandPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const edition = resolvePublicEdition(first(params.edition));
  const screen = first(params.screen) === "1";
  const island = await getElementalPublicIsland(edition);
  return (
    <div className={trirong.variable}>
      <ElementalIslandView island={island} screen={screen} />
    </div>
  );
}
