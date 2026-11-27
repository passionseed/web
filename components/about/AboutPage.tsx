import "@/components/shift/round/shiftRound.css";
import "@/components/home/home.css";
import "./about.css";

import { HomeFinalCta } from "@/components/home/HomeFinalCta";
import { iannnnnCow } from "@/components/home/notesFont";
import { INK, RisoPageTexture } from "@/components/shift/ShiftRiso";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { leadCta, type HomeLead } from "@/lib/content/home-lead";
import { AboutBeliefs, AboutDoors, AboutEnglish, AboutHero, AboutMachine, AboutTrailSection } from "./AboutSections";

/**
 * /about in the home page's riso look, built to be played with: the
 * portfolio machine, three belief toys, a "where are you now" picker and
 * our own trail with its turn.
 */
export function AboutPage({ lead }: { lead: HomeLead }) {
  return (
    <div
      className={`${iannnnnCow.variable} about-page site-shell home-handwritten-notes relative min-h-screen font-bai-jamjuree antialiased`}
      style={{ backgroundColor: INK.black, color: INK.paper }}
    >
      <RisoPageTexture />
      <SiteNav cta={leadCta(lead, "about")} />
      <AboutHero />
      <main className="relative mx-auto max-w-5xl px-5 pb-10 sm:px-8">
        <AboutMachine />
        <AboutBeliefs />
        <AboutDoors />
        <AboutTrailSection />
        <AboutEnglish />
      </main>
      <HomeFinalCta lead={lead} src="about" />
      <SiteFooter />
    </div>
  );
}
