import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { IslandShell } from "@/components/shift/island/IslandShell";
import { SHIFT_ISLAND } from "@/lib/content/shift-island";
import { shiftDiscordUrls } from "@/lib/shift/discordGuild";
import { GUIDE_FOOTER, GUIDE_META } from "@/lib/content/shift-island-guide";

import styles from "./guide.module.css";
import {
  CampfireSection,
  CoinsSection,
  Contents,
  GrowthSection,
  Hero,
  IslandSection,
  PrivacySection,
  RootsSection,
  StartSection,
} from "./parts";

/**
 * /shift/island/guide: how the SHIFT High Island works, for students.
 *
 * Static: no session, no database, so it prerenders with the placeholder env
 * CI builds with. Open to anyone, so a student can read it before signing in.
 * Unlisted like the island itself (the link lives in the island's menu).
 * Every string is in lib/content/shift-island-guide.ts.
 */
export const metadata: Metadata = {
  title: GUIDE_META.title,
  description: GUIDE_META.description,
  robots: { index: false, follow: false },
  openGraph: {
    title: GUIDE_META.title,
    description: GUIDE_META.description,
    type: "article",
    images: [
      {
        url: SHIFT_ISLAND.sample.src,
        width: SHIFT_ISLAND.sample.width,
        height: SHIFT_ISLAND.sample.height,
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#000006",
  colorScheme: "dark",
};

/** The SHIFT server when the build knows its id, else the public invite, else nothing. Env only, no network. */
function discordUrl(): string | null {
  const urls = shiftDiscordUrls();
  return urls.server ?? urls.invite;
}

export default function IslandGuidePage() {
  return (
    <IslandShell>
      <div className={styles.guide}>
        <Hero />
        <Contents />
        <IslandSection />
        <GrowthSection />
        <RootsSection />
        <CampfireSection />
        <CoinsSection />
        <StartSection discordUrl={discordUrl()} />
        <PrivacySection />
        <footer className={styles.footer}>
          <p>{GUIDE_FOOTER.question}</p>
          <Link href="/shift/island" className={styles.back}>
            {GUIDE_FOOTER.back}
          </Link>
        </footer>
      </div>
    </IslandShell>
  );
}
