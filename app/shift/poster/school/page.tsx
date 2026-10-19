import type { Metadata } from "next";

import { SchoolPosterArc } from "@/components/shift/school/poster/SchoolPosterArc";
import { SchoolPosterCover } from "@/components/shift/school/poster/SchoolPosterCover";
import { SchoolPosterLearn } from "@/components/shift/school/poster/SchoolPosterLearn";
import { SchoolPosterParents } from "@/components/shift/school/poster/SchoolPosterParents";
import { SchoolPosterSchools } from "@/components/shift/school/poster/SchoolPosterSchools";

/**
 * SHIFT for schools, pixel flood posters: IG carousel, 1080x1350 each.
 * Export: node scripts/render-shift-school-posters.mjs, which screenshots
 * #school-poster-1 to #school-poster-5 into public/shift/school/ for the
 * "save & share" strip on /shift/school.
 */

export const metadata: Metadata = {
  title: "SHIFT for Schools Pixel Posters",
  robots: { index: false, follow: false },
};

export default function ShiftSchoolPosterPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 py-10">
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <div className="flex flex-col items-center gap-10">
        <SchoolPosterCover />
        <SchoolPosterArc />
        <SchoolPosterLearn />
        <SchoolPosterParents />
        <SchoolPosterSchools />
      </div>
    </div>
  );
}
