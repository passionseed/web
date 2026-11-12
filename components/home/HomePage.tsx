import "@/components/shift/round/shiftRound.css";
import "./home.css";

import localFont from "next/font/local";

import { INK, RisoPageTexture } from "@/components/shift/ShiftRiso";
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

const iannnnnCow = localFont({
  src: "./fonts/Iannnnn-COW-Regular.otf",
  weight: "400",
  variable: "--font-iannnnn-cow",
  display: "swap",
  preload: false,
});

/** Public home page. SHIFT leads; everything else hangs off it. */
export function HomePage({ studentCount }: { studentCount: number | null }) {
  return (
    <div
      className={`${iannnnnCow.variable} home-handwritten-notes relative min-h-screen font-bai-jamjuree antialiased`}
      style={{ backgroundColor: INK.black, color: INK.paper }}
    >
      <RisoPageTexture />
      <SiteNav />
      <HomeHero />
      <main className="relative mx-auto max-w-5xl px-5 pb-10 sm:px-8">
        <HomeContrast />
        <HomeShowcase />
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
