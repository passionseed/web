import type { Metadata } from "next";
import Link from "next/link";

import { DawnScene } from "@/components/projectseed/dawn-scene";
import { InViewAnimator } from "@/components/ui/in-view-animator";
import { ParentsClose } from "@/components/pathlab/parents/ParentsClose";
import { ParentsFaq } from "@/components/pathlab/parents/ParentsFaq";
import { ParentsFields } from "@/components/pathlab/parents/ParentsFields";
import { ParentsHero } from "@/components/pathlab/parents/ParentsHero";
import { ParentsNav } from "@/components/pathlab/parents/ParentsNav";
import { ParentsPricing } from "@/components/pathlab/parents/ParentsPricing";
import { ParentsSafety } from "@/components/pathlab/parents/ParentsSafety";
import { ParentsSample } from "@/components/pathlab/parents/ParentsSample";
import { ParentsStandards } from "@/components/pathlab/parents/ParentsStandards";
import { ParentsStickyCta } from "@/components/pathlab/parents/ParentsStickyCta";
import { ParentsTakeHome } from "@/components/pathlab/parents/ParentsTakeHome";
import { ParentsTrust } from "@/components/pathlab/parents/ParentsTrust";
import { ParentsVoices } from "@/components/pathlab/parents/ParentsVoices";
import { ParentsWhat } from "@/components/pathlab/parents/ParentsWhat";
import { ParentsWhyNow } from "@/components/pathlab/parents/ParentsWhyNow";
import {
  PARENTS_EMAIL,
  PARENTS_FAQ,
  PARENTS_META,
  SAFEGUARDING_HREF,
} from "@/lib/content/pathlab-parents";

export const metadata: Metadata = {
  title: PARENTS_META.title,
  description: PARENTS_META.description,
  openGraph: {
    type: "website",
    title: PARENTS_META.title,
    description: PARENTS_META.description,
    siteName: "Passion Seed",
  },
};

/**
 * FAQPage structured data, generated from the same list the section renders,
 * so a parent searching "PathLab ปลอดภัยไหม" can see the answer in the result
 * and the markup can never drift from the visible copy.
 */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PARENTS_FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

/**
 * The page a student forwards to a parent.
 *
 * Order is the parent's decision order, not the product's feature order: who
 * these people are and whether the child is safe with them comes before
 * anything about the programme; then evidence that "โปรเจกต์จริง" is real work
 * (the summary, a real round day by day, what comes home); then the timing
 * case, the fields, how rounds are run, and who has been through one; then the
 * objections that stop a purchase, the price, and a low-pressure door.
 *
 * Everything is generic by construction: no student name, handle, or story,
 * since the same URL gets forwarded to every family.
 */
export default function PathlabForParentsPage() {
  return (
    <div
      lang="th"
      className="dawn-theme relative min-h-screen overflow-hidden text-white"
    >
      <DawnScene />
      <InViewAnimator selector=".ei-card, .ei-button-dusk" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <ParentsNav />

      <main className="relative z-10">
        <ParentsHero />
        <ParentsTrust />
        <ParentsSafety />
        <ParentsWhat />
        <ParentsSample />
        <ParentsTakeHome />
        <ParentsWhyNow />
        <ParentsFields />
        <ParentsStandards />
        <ParentsVoices />
        <ParentsFaq />
        <ParentsPricing />
        <ParentsClose />
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-6xl border-t border-white/10 px-5 py-8 font-bai-jamjuree text-xs leading-6 text-slate-400 sm:px-8">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>PathLab by Passion Seed</span>
          <Link
            href={SAFEGUARDING_HREF}
            className="transition-colors hover:text-white"
          >
            นโยบายคุ้มครองเด็ก
          </Link>
          <Link href="/pathlab" className="transition-colors hover:text-white">
            รายละเอียด PathLab ทั้งหมด
          </Link>
        </p>
        <p className="mt-2">
          มีคำถามหรือข้อกังวลเรื่องความปลอดภัยของนักเรียน ติดต่อได้ที่{" "}
          <a
            href={`mailto:${PARENTS_EMAIL}`}
            className="text-slate-300 underline underline-offset-4 hover:text-white"
          >
            {PARENTS_EMAIL}
          </a>
        </p>
      </footer>

      <ParentsStickyCta />
    </div>
  );
}
