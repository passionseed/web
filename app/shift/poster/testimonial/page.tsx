import type { Metadata } from "next";

import { ShiftTestimonialReel } from "@/components/shift/poster/testimonial/ShiftTestimonialReel";
import { getTestimonialReel } from "@/components/shift/poster/testimonial/testimonialReel";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

/**
 * SHIFT[1] testimonial Reels (1080x1920). `?kid=lens|kaspt70` picks the
 * student. Plays live; click to replay. Export: `?render=1` pauses it for scripts/render-shift-testimonial.mjs.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT.name} Testimonial Reel`,
  robots: { index: false, follow: false },
};

export default async function ShiftTestimonialPage({
  searchParams,
}: {
  searchParams: Promise<{ render?: string; kid?: string }>;
}) {
  const { render, kid } = await searchParams;
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
      <style>{"nextjs-portal{display:none!important}"}</style>
      <ShiftTestimonialReel reel={getTestimonialReel(kid)} render={render === "1"} />
    </div>
  );
}
