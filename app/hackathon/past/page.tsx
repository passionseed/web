import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";

export const metadata: Metadata = {
  title: "Past hackathons | The Next Decade",
  description: "Every The Next Decade hackathon so far, with the problems teams took on and what they built.",
};

/** Newest first. Add a hackathon here when it ends. */
const PAST = [
  {
    href: "/hackathon/past/healthcare",
    galleryHref: "/hackathon/gallery",
    year: "2026",
    name: "Healthcare",
    th: "สุขภาพเชิงป้องกันและสุขภาพจิต",
    blurb: "Preventive & Predictive Healthcare and Mental Health",
  },
] as const;

export default function PastHackathonsPage() {
  return (
    <main
      className={`${trirong.variable} min-h-screen px-4 py-12 sm:px-8 sm:py-20`}
      style={{ backgroundColor: EL.cream, color: EL.ink }}
    >
      <div className="mx-auto max-w-3xl">
        <Link
          href="/hackathon"
          className="inline-flex items-center gap-2 text-sm"
          style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}
        >
          <ArrowLeft className="h-4 w-4" /> Hackathon ล่าสุด
        </Link>
        <h1
          className="mt-6 text-5xl sm:text-6xl"
          style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}
        >
          Hackathon <span style={{ fontStyle: "italic", fontWeight: 300 }}>ที่ผ่านมา</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg" style={{ color: EL.inkSoft }}>
          โจทย์จริงที่ทีมนักเรียนเคยลงมือแก้ และสิ่งที่พวกเขาสร้างออกมา
        </p>

        <ul className="mt-12 space-y-4">
          {PAST.map((h) => (
            <li key={h.href} className="rounded-2xl border p-6 sm:p-8" style={{ borderColor: "rgba(29,33,31,0.18)" }}>
              <p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
                [The Next Decade · {h.year}]
              </p>
              <h2 className="mt-2 text-3xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
                {h.name}
              </h2>
              <p className="mt-1">{h.th}</p>
              <p className="text-sm" style={{ color: EL.inkSoft }}>{h.blurb}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={h.href}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                  style={{ backgroundColor: EL.ink, color: EL.cream }}
                >
                  ดูหน้า Hackathon <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={h.galleryHref}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                  style={{ boxShadow: `inset 0 0 0 1px ${EL.ink}` }}
                >
                  ดูผลงานของทีม
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
