import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { JsonLd, PortEyebrow, PortShell, PortShiftCta } from "@/components/port/PortParts";
import { PORT_GUIDES, portGuidePath } from "@/lib/content/port-guides";

/**
 * /port: every portfolio guide, in the order a student moves through them.
 * The written versions of the Instagram Tips PDFs, so search engines and AI
 * answer engines can read and quote them.
 */

const SITE_URL = "https://passionseed.org";
const TITLE = "ทำพอร์ต TCAS รอบ 1 เริ่มยังไง: คู่มือทีละขั้น";
const DESCRIPTION =
  "คู่มือทำพอร์ต TCAS รอบ 1 จาก PassionSeed ตั้งแต่ยังไม่รู้จะเข้าคณะไหน ลองทำโปรเจกต์ 7 วันเพื่อเช็กว่าชอบจริงไหม จนถึงวางแผนพอร์ตและโปรเจกต์ที่ใช้งานจริง";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/port" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/port`,
    siteName: "PassionSeed",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${SITE_URL}/port`,
  name: TITLE,
  description: DESCRIPTION,
  inLanguage: "th",
  publisher: { "@type": "Organization", name: "PassionSeed", url: SITE_URL },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: PORT_GUIDES.map((guide, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}${portGuidePath(guide)}`,
      name: guide.title,
    })),
  },
};

export default function PortIndexPage() {
  return (
    <PortShell>
      <JsonLd data={jsonLd} />
      <PortEyebrow>Portfolio guide</PortEyebrow>
      <h1 className="mt-3 font-kodchasan text-3xl font-bold leading-tight sm:text-4xl">{TITLE}</h1>
      <p className="mt-4 text-lg leading-relaxed text-[#f2ead9]/80">
        พอร์ตที่ดีคือหลักฐานว่าเราทำเรื่องนั้นได้จริง เริ่มจากขั้นที่ตรงกับเราตอนนี้ แล้วค่อยไปขั้นถัดไป
      </p>

      <ol className="mt-10 space-y-3">
        {PORT_GUIDES.map((guide, i) => (
          <li key={guide.slug}>
            <Link
              href={portGuidePath(guide)}
              className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-[#fed95c]/50 hover:bg-white/[0.06]"
            >
              <span className="mt-0.5 font-kodchasan text-2xl font-bold text-[#fed95c]">{i + 1}</span>
              <span className="flex-1">
                <span className="block text-sm text-[#f2ead9]/60">{guide.stage}</span>
                <span className="mt-1 block text-lg font-semibold leading-snug">{guide.title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-[#f2ead9]/70">{guide.description}</span>
              </span>
              <ArrowRight
                size={18}
                aria-hidden="true"
                className="mt-1 shrink-0 text-[#f2ead9]/40 transition-transform group-hover:translate-x-0.5 group-hover:text-[#fed95c]"
              />
            </Link>
          </li>
        ))}
      </ol>

      <PortShiftCta />
    </PortShell>
  );
}
