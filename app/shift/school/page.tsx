import type { Metadata } from "next";

import { MetaPixel } from "@/components/shift/MetaPixel";
import { ShiftGalleryMotion } from "@/components/shift/ShiftGalleryMotion";
import { SchoolArc } from "@/components/shift/school/SchoolArc";
import {
  SCHOOL_CONTACT_ID,
  SchoolContact,
} from "@/components/shift/school/SchoolContact";
import { SchoolDmFab } from "@/components/shift/school/SchoolDmFab";
import { SchoolFaq } from "@/components/shift/school/SchoolFaq";
import { SchoolHero } from "@/components/shift/school/SchoolHero";
import { SchoolLearning } from "@/components/shift/school/SchoolLearning";
import { SchoolPartnership } from "@/components/shift/school/SchoolPartnership";
import { SchoolPosters } from "@/components/shift/school/SchoolPosters";
import { SchoolPromise } from "@/components/shift/school/SchoolPromise";
import { SchoolData } from "@/components/shift/school/SchoolData";
import { SchoolTexture } from "@/components/shift/school/SchoolTexture";
import { SchoolVoices } from "@/components/shift/school/SchoolVoices";
import { SchoolWho } from "@/components/shift/school/SchoolWho";
import gallery from "@/components/shift/shiftGallery.module.css";
import styles from "@/components/shift/school/shiftSchool.module.css";
import { SCHOOL_META } from "@/lib/content/shift-school";

export const metadata: Metadata = {
  title: SCHOOL_META.title,
  description: SCHOOL_META.description,
  alternates: { canonical: "/shift/school" },
  openGraph: {
    title: SCHOOL_META.ogTitle,
    description: SCHOOL_META.ogDescription,
    url: "https://passionseed.org/shift/school",
    type: "website",
  },
};

/**
 * /shift/school: the proposal a teacher reads to open a SHIFT cohort
 * for their students, and the link they forward to parents. Same riso print run as the
 * /shift gallery. The pixel poster set (/shift/poster/school) comes first
 * for readers who skim; then the full brief follows the reader's questions: what students do,
 * how they learn, what we promise, how we use the data and what the family consents to,
 * what the school does, proof, who we are, FAQ, then the one door (an Instagram DM).
 * Copy lives in lib/content/shift-school.ts.
 */
export default function ShiftSchoolPage() {
  return (
    <div
      id="top"
      className={`${gallery.page} font-bai-jamjuree antialiased`}
      lang="th"
    >
      <MetaPixel pagePath="/shift/school" />
      <SchoolTexture />
      <ShiftGalleryMotion />

      {/* The ink layer: lifts every word above the grain and sets the
          page's contrast scale (see .ink in shiftSchool.module.css). */}
      <div className={styles.ink}>
        <SchoolHero />

        <main className={`${gallery.container} ${styles.main}`}>
          <SchoolPosters />
          <SchoolArc />
          <SchoolLearning />
          <SchoolPromise />
          <SchoolData />
          <SchoolPartnership />
          <SchoolVoices />
          <SchoolWho />
          <SchoolFaq />
          <SchoolContact />
        </main>

        <SchoolDmFab contactId={SCHOOL_CONTACT_ID} />
      </div>
    </div>
  );
}
