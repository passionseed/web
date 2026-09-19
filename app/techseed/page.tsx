import type { Metadata } from "next";
import { Suspense } from "react";

import { TechseedSignup } from "@/components/techseed/techseed-signup";
import { ShiftApplyButton } from "@/components/shift/ShiftApplyButton";
import gallery from "@/lib/content/techseed-gallery.json";

export const metadata: Metadata = {
  title: "TechSeed | คลังผลงานจริงจากนักเรียน ม.ปลาย (Proof of Work)",
  description:
    "รวม Final Projects จากนักเรียน TechSeed ปั้นเองจริงใน 5 วัน ตั้งแต่ AI, Web Apps, 3D Games ไปจนถึง Hardware Prototype พร้อมหลักฐานการทดสอบจริง ยกระดับพอร์ต TCAS 1",
  keywords: [
    "TechSeed",
    "ผลงาน Tech ม.ปลาย",
    "พอร์ต TCAS 1",
    "โครงงานคอมพิวเตอร์ ม.ปลาย",
    "ผลงาน AI นักเรียน",
    "PassionSeed",
    "Proof of work portfolio",
    "SHIFT sandbox",
  ],
  alternates: {
    canonical: "/techseed",
  },
  openGraph: {
    title: "TechSeed | คลังผลงานจริงจากนักเรียน ม.ปลาย (Proof of Work)",
    description:
      "รวมชิ้นงานจริงที่นักเรียนสร้างเองและปล่อยสู่โลกจริง ตั้งแต่ AI, Web Apps ไปจนถึง 3D Games พร้อมหลักฐานการทดสอบจริง",
    url: "https://passionseed.org/techseed",
    type: "website",
    images: [
      {
        url: "/og-passionseed.jpg",
        width: 1200,
        height: 630,
        alt: "TechSeed Proof of Work Gallery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TechSeed | คลังผลงานจริงจากนักเรียน ม.ปลาย (Proof of Work)",
    description:
      "รวม Final Projects จากนักเรียน TechSeed ปั้นเองจริงใน 5 วัน พร้อมหลักฐานการทดสอบจริง",
    images: ["/og-passionseed.jpg"],
  },
};

// Curate a spread of final projects so the marquee stays light: at most 18
// tiles sampled evenly across every cohort.
const images = gallery.filter((g) => g.kind === "image");
const sampleStep = Math.max(1, Math.floor(images.length / 18));
const curated = images.filter((_, i) => i % sampleStep === 0).slice(0, 18);
const columns = [0, 1, 2].map((c) => curated.filter((_, i) => i % 3 === c));
const columnDuration = ["61s", "83s", "71s"]; // prime-ish, never sync

const techseedJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://passionseed.org/techseed#collection",
      "name": "TechSeed Student Proof-of-Work Gallery",
      "url": "https://passionseed.org/techseed",
      "description":
        "Curated showcase of real student projects built by high school students in TechSeed cohorts across Thailand, spanning AI, web tools, game dev, and hardware.",
      "publisher": {
        "@type": "Organization",
        "name": "PassionSeed",
        "url": "https://passionseed.org"
      }
    },
    {
      "@type": "ItemList",
      "@id": "https://passionseed.org/techseed#items",
      "name": "TechSeed Final Projects",
      "numberOfItems": curated.length,
      "itemListElement": curated.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": `TechSeed #${item.cohort} Project Artifact`,
        "image": item.url
      }))
    }
  ]
};

export default function TechseedPage() {
  return (
    <div className="dawn-theme relative min-h-screen overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techseedJsonLd) }}
      />
      {/* Dawn atmosphere: base gradient + cloud blobs + horizon glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, #020617 0%, #0f172a 28%, #1e1b4b 58%, #312e81 82%, #1e3a5f 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(99, 102, 241, 0.20) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/4 h-[420px] w-[420px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "linear-gradient(to top, rgba(254, 217, 92, 0.12) 0%, transparent 60%)",
          filter: "blur(52px)",
        }}
      />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 py-12 sm:px-6">
        <Suspense fallback={null}>
          <TechseedSignup />
        </Suspense>
      </main>

      {/* Student work gallery: slow vertical marquee, tall on purpose */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-28 sm:px-6">
        <div className="text-center">
          <p className="dawn-eyebrow">Proof of Work</p>
          <h2 className="font-kodchasan mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            ชิ้นงานจริงจากรุ่นพี่ TechSeed
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300/80">
            ทุกชิ้นคือ final project ที่น้องลงมือทำเองและปล่อยสู่โลกจริงภายใน 5
            วัน ตั้งแต่เกม 3D model ไปจนถึง AI
          </p>
        </div>

        <div className="ts-marquee mt-12 grid h-[110vh] grid-cols-2 gap-4 overflow-hidden sm:grid-cols-3 [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)]">
          {columns.map((col, c) => (
            <div
              key={c}
              className={`ts-marquee__col ${c === 1 ? "ts-marquee__col--reverse" : ""}`}
              style={
                { "--ts-marquee-duration": columnDuration[c] } as React.CSSProperties
              }
            >
              {/* duplicated once so the -50% loop is seamless */}
              {[...col, ...col].map((item, i) => (
                <figure
                  key={`${item.url}-${i}`}
                  className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {/* no lazy loading: the reverse-animated column confuses
                      Chrome's lazy-load intersection check and never loads */}
                  <img
                    src={item.url}
                    alt={`TechSeed #${item.cohort} final project`}
                    className="w-full"
                  />
                  <figcaption className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-amber-200 backdrop-blur-sm">
                    TechSeed #{item.cohort}
                  </figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>

        <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
          Final Projects · TechSeed #3, #4 & #5 · Shared with student permission
        </p>

        {/* ============ SHIFT CRUCIBLE BRIDGE ============ */}
        <div className="mt-16 rounded-3xl border border-amber-400/30 bg-gradient-to-b from-amber-500/10 via-purple-500/10 to-transparent p-8 text-center backdrop-blur-md sm:p-12">
          <p className="dawn-eyebrow text-amber-300">The 7-Day Admissions Crucible</p>
          <h3 className="font-kodchasan mt-3 text-2xl font-bold tracking-tight text-white sm:text-4xl">
            พร้อมยกระดับไอเดียเป็น <span className="text-amber-300">1-Page TCAS Case Study</span> หรือยัง?
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300/90 sm:text-base">
            หลังจากเห็นสิ่งที่รุ่นพี่สร้างใน TechSeed แล้ว หากคุณต้องการสร้างโปรเจกต์ที่มีผู้ใช้งานจริง 15–30 คน พร้อม Failure &amp; Pivot Log เพื่อยื่นพอร์ตมหาลัยชั้นนำใน 7 วัน
          </p>
          <div className="mt-8 flex justify-center">
            <ShiftApplyButton
              location="techseed_bridge"
              href="/shift"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 !px-8 !py-4 font-mono !text-xs font-bold uppercase tracking-wider !text-black shadow-xl shadow-amber-400/20 transition hover:scale-105"
            >
              ดูรายละเอียด SHIFT Sandbox (7 Days)
            </ShiftApplyButton>
          </div>
        </div>
      </section>
    </div>
  );
}
