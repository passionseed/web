import type { Metadata } from "next";

import { ShiftCrewCover } from "@/components/shift/poster/ShiftCrewCover";
import { ShiftNewDate } from "@/components/shift/poster/ShiftNewDate";
import { ChromeBevelFilter } from "@/components/shift/poster/riso";
import { SHIFT_COHORT_2 } from "@/lib/content/shift-cohort";

/**
 * SHIFT[2] new start date: feed poster, Story, and the crew cover re-set
 * with the new dates. Export: node scripts/render-marketing.mjs --poster.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT_2.name} New Date`,
  robots: { index: false, follow: false },
};

export default function Shift2MovedPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 py-10">
      <style>{"nextjs-portal{display:none!important}"}</style>
      <ChromeBevelFilter />
      <div className="flex flex-wrap items-start justify-center gap-10">
        <ShiftNewDate format="feed" />
        <ShiftCrewCover />
        <ShiftNewDate format="story" />
      </div>
    </div>
  );
}
