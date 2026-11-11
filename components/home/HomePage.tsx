import "@/components/shift/round/shiftRound.css";
import "./home.css";

import space from "@/components/shift/next/shiftNext.module.css";
import { SPACE_PALETTE, paletteVars } from "@/components/shift/theme/tokens";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { HOME_DEMOS } from "@/lib/content/home";
import { DitherCanvas } from "./DitherCanvas";
import { HomeContrast } from "./HomeContrast";
import { HomeFaq } from "./HomeFaq";
import { HomeFinalCta } from "./HomeFinalCta";
import { HomeGlance } from "./HomeGlance";
import { HomeHero } from "./HomeHero";
import { HomeHigh } from "./HomeHigh";
import { HomeLadder } from "./HomeLadder";
import { HomeParents } from "./HomeParents";
import { HomeProof } from "./HomeProof";
import { HomeShowcase } from "./HomeShowcase";
import { HomeWeek } from "./HomeWeek";

/** Public home page, in the space style of /shift. SHIFT leads; everything else hangs off it. */
export function HomePage({
  studentCount,
  sessionLine,
}: {
  studentCount: number | null;
  /** The weekly SHIFT High slot, from the alumni calendar. */
  sessionLine: string;
}) {
  return (
    <div className={`${space.page} home-space font-bai-jamjuree antialiased`} style={paletteVars(SPACE_PALETTE)} lang="th">
      <DitherCanvas scene="sky" />
      <SiteNav />
      <HomeHero />
      <main className={`${space.container} !pb-10`}>
        {/* The hero plays the demo clips; without any, show the SHIFT[0] phones. */}
        {HOME_DEMOS.length === 0 && <HomeShowcase />}
        <HomeGlance />
        <HomeWeek />
        <HomeProof studentCount={studentCount} />
        <HomeContrast />
        <HomeHigh sessionLine={sessionLine} />
        <HomeParents />
        <HomeFaq />
        <HomeLadder />
      </main>
      <HomeFinalCta />
      <SiteFooter />
    </div>
  );
}
