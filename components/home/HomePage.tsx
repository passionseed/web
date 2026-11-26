import "@/components/shift/round/shiftRound.css";
import "./home.css";

import { INK, RisoPageTexture } from "@/components/shift/ShiftRiso";
import { leadCta, type HomeLead } from "@/lib/content/home-lead";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { HomeContrast } from "./HomeContrast";
import { HomeFinalCta } from "./HomeFinalCta";
import { HomeHero } from "./HomeHero";
import { HomeLadder } from "./HomeLadder";
import { HomeParents } from "./HomeParents";
import { HomeProof } from "./HomeProof";
import { HomeShowcase } from "./HomeShowcase";
import { HomeWeek } from "./HomeWeek";
import { iannnnnCow } from "./notesFont";

/**
 * Public home page. The hero, nav button and last call follow the lead
 * (lib/content/home-lead.ts); the sections between tell the SHIFT story.
 */
export function HomePage({ studentCount, lead }: { studentCount: number | null; lead: HomeLead }) {
  return (
    <div
      className={`${iannnnnCow.variable} site-shell home-handwritten-notes relative min-h-screen font-bai-jamjuree antialiased`}
      style={{ backgroundColor: INK.black, color: INK.paper }}
    >
      <RisoPageTexture />
      <SiteNav cta={leadCta(lead, "home")} />
      <HomeHero lead={lead} />
      <main className="relative mx-auto max-w-5xl px-5 pb-10 sm:px-8">
        <HomeContrast />
        <HomeShowcase />
        <HomeWeek />
        <HomeProof studentCount={studentCount} />
        <HomeParents />
        <HomeLadder />
      </main>
      <HomeFinalCta lead={lead} />
      <SiteFooter />
    </div>
  );
}
