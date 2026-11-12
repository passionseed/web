import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";

import { JsonLd, PortEyebrow, PortShell, PortShiftCta } from "@/components/port/PortParts";
import { PORT_GUIDES, getPortGuide, portGuidePath } from "@/lib/content/port-guides";
import { formatThaiDate } from "@/lib/content/shift-cohort";

const SITE_URL = "https://passionseed.org";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return PORT_GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const guide = getPortGuide((await params).slug);
  if (!guide) return { title: "PassionSeed" };

  const url = `${SITE_URL}${portGuidePath(guide)}`;
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: portGuidePath(guide) },
    openGraph: {
      type: "article",
      url,
      siteName: "PassionSeed",
      title: guide.title,
      description: guide.description,
      modifiedTime: guide.updated,
    },
    twitter: { card: "summary_large_image", title: guide.title, description: guide.description },
  };
}

export default async function PortGuidePage({ params }: PageProps) {
  const guide = getPortGuide((await params).slug);
  if (!guide) notFound();

  const url = `${SITE_URL}${portGuidePath(guide)}`;
  const step = PORT_GUIDES.indexOf(guide) + 1;
  const next = guide.next ? getPortGuide(guide.next) : undefined;
  const year = Number(guide.updated.slice(0, 4)) + 543;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: guide.title,
        description: guide.description,
        inLanguage: "th",
        dateModified: guide.updated,
        mainEntityOfPage: url,
        author: { "@type": "Organization", name: "PassionSeed", url: SITE_URL },
        publisher: { "@type": "Organization", name: "PassionSeed", url: SITE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "คู่มือทำพอร์ต", item: `${SITE_URL}/port` },
          { "@type": "ListItem", position: 2, name: guide.title, item: url },
        ],
      },
    ],
  };

  return (
    <PortShell back={{ href: "/port", label: "คู่มือทำพอร์ต" }}>
      <JsonLd data={jsonLd} />
      <article>
        <PortEyebrow>
          ขั้นที่ {step} จาก {PORT_GUIDES.length} · {guide.stage}
        </PortEyebrow>
        <h1 className="mt-3 font-kodchasan text-3xl font-bold leading-tight sm:text-4xl">{guide.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-[#f2ead9]/80">{guide.description}</p>
        <p className="mt-3 text-sm text-[#f2ead9]/50">
          อัปเดต {formatThaiDate(guide.updated, false)} {year}
        </p>

        {guide.sections.map((section) => (
          <section key={section.heading} className="mt-10">
            <h2 className="font-kodchasan text-xl font-bold leading-snug sm:text-2xl">{section.heading}</h2>
            {section.list && (
              <ul className="mt-4 space-y-2.5">
                {section.list.map((item) => (
                  <li key={item} className="flex gap-3 leading-relaxed text-[#f2ead9]/90">
                    <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#fed95c]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {section.paragraphs?.map((p) => (
              <p key={p} className="mt-4 leading-relaxed text-[#f2ead9]/90">
                {p}
              </p>
            ))}
          </section>
        ))}

        <div className="mt-10 rounded-2xl border border-[#fed95c]/30 bg-[#fed95c]/[0.06] p-5">
          <p className="text-sm font-semibold text-[#fed95c]">เป้าหมายของขั้นนี้</p>
          <p className="mt-2 leading-relaxed">{guide.goal}</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {next && (
            <Link
              href={portGuidePath(next)}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/10"
            >
              ขั้นต่อไป: {next.stage}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
          <Link
            href={`/tips/${guide.tipsSlug}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/10"
          >
            <FileText size={16} aria-hidden="true" />
            ดูฉบับรูปภาพ (PDF)
          </Link>
        </div>
      </article>

      <PortShiftCta />
    </PortShell>
  );
}
