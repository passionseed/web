import { INK, RisoPageTexture } from "@/components/shift/ShiftRiso";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { HomeContrast } from "./HomeContrast";
import { HomeFinalCta } from "./HomeFinalCta";
import { HomeHero } from "./HomeHero";
import { HomeLadder } from "./HomeLadder";
import { HomeParents } from "./HomeParents";
import { HomeProof } from "./HomeProof";
import { HomeWeek } from "./HomeWeek";

/** Public home page. SHIFT leads; everything else hangs off it. */
export function HomePage({ studentCount }: { studentCount: number | null }) {
  return (
    <div
      className="relative min-h-screen font-bai-jamjuree antialiased"
      style={{ backgroundColor: INK.black, color: INK.paper }}
    >
      <RisoPageTexture />
      <SiteNav />
      <HomeHero />
      <main className="relative mx-auto max-w-5xl px-5 pb-10 sm:px-8">
        <HomeContrast />
        <HomeWeek />
        <HomeProof studentCount={studentCount} />
        <HomeParents />
        <HomeLadder />
      </main>
      <HomeFinalCta />
      <SiteFooter />
    </div>
  );
}
