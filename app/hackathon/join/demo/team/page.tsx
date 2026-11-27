import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { Body, DarkSlab, H1, H2, ItemTitle, Page, Tag, v } from "@/components/hackathon/elemental/share/ui";
import { DEMO_STYLE_LEVELS, demoStyleCard, isDemoStyleLevel } from "@/components/hackathon/elemental/team-style/demo";
import { teamStyleFonts } from "@/components/hackathon/elemental/team-style/fonts";
import { TeamEditor, TeamEditorUnavailable } from "@/components/hackathon/elemental/team-style/TeamEditor";
import { TeamLine } from "@/components/hackathon/elemental/team-style/TeamLine";
import { demoPagesOn } from "@/lib/hackathon/elemental/share";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Team editor demo", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development and PR previews only: the team editor with made-up data. Saving
 * is pretended (nothing is sent). 404 in production.
 * /hackathon/join/demo/team?style=unnamed|locked|colors|fonts|all|final|closed
 * &mode=solo (a sign-up without a team) &fail=1 (the save fails) &soon=1 (the board hasn't launched).
 * ?view=line: the team line at every level on the dark ground; &s=paper: in a
 * dark slab on the cream pay page, and once straight on cream.
 */
export default async function TeamEditorDemoPage({ searchParams }: { searchParams: SearchParams }) {
  if (!demoPagesOn()) notFound();
  const params = await searchParams;
  const style = first(params.style);
  const level = isDemoStyleLevel(style) ? style : "fonts";
  const solo = first(params.mode) === "solo";
  const payHref = `/hackathon/join/demo?state=paid&share=1&style=${level}${solo ? "&mode=solo" : ""}`;
  const data = demoStyleCard(level, { solo });

  if (first(params.view) === "line") return <LineGallery paper={first(params.s) === "paper"} />;

  return (
    <div className={`${trirong.variable} ${teamStyleFonts}`}>
      {first(params.soon) === "1" ? (
        <TeamEditorUnavailable payHref={payHref} />
      ) : (
        <TeamEditor token="demo" demo demoFail={first(params.fail) === "1"} data={data} payHref={payHref} boardHref={`/hackathon/elemental/leaderboard/demo#${data.key}`} />
      )}
    </div>
  );
}

/** Every level of the team line, on the surface it will sit on. */
function LineGallery({ paper }: { paper: boolean }) {
  const lines = DEMO_STYLE_LEVELS.map((level) => (
    <div key={level}>
      <Tag>{level}</Tag>
      <div className="mt-2">
        <TeamLine token="demo" demo data={demoStyleCard(level, { solo: level === "colors" })} />
      </div>
    </div>
  ));
  return (
    <div className={`${trirong.variable} ${teamStyleFonts}`}>
      <Page surface={paper ? "paper" : "ground"} wordmark={false}>
        <H1>Team line</H1>
        <Body secondary className="mt-2">
          {paper ? "In the pay page's dark slab, then straight on cream." : "On the dark ground (share page)."}
        </Body>
        {paper ? (
          <div className="mt-8 space-y-8">
            <DarkSlab>
              <ItemTitle as="h2">ทีมของฉัน</ItemTitle>
              <div className="mt-4 space-y-8">{lines.slice(0, 4)}</div>
            </DarkSlab>
            <section className="border-t pt-6" style={{ borderColor: v.rule }}>
              <H2>Straight on cream</H2>
              <div className="mt-4 space-y-8">{lines.slice(3, 5)}</div>
            </section>
          </div>
        ) : (
          <div className="mt-8 space-y-8 border-t pt-6" style={{ borderColor: v.rule }}>
            {lines}
          </div>
        )}
      </Page>
    </div>
  );
}
