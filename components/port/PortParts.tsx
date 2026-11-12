import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Shared pieces for the /port portfolio guides: a dark, quiet reading page in
 * the SHIFT palette, and the SHIFT call to action every guide ends with.
 * Plain server-rendered text on purpose: crawlers and AI answer engines read
 * the HTML, not the motion.
 */

export function PortShell({
  back,
  children,
}: {
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[#0b0a14] font-bai-jamjuree text-[#f2ead9] antialiased" lang="th">
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        {back && (
          <Link
            href={back.href}
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#f2ead9]/70 transition-colors hover:text-[#f2ead9]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {back.label}
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}

export function PortEyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#fed95c]">{children}</p>;
}

export function PortShiftCta() {
  return (
    <aside className="mt-14 rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <PortEyebrow>SHIFT by PassionSeed</PortEyebrow>
      <h2 className="mt-3 font-kodchasan text-2xl font-bold leading-snug">
        อยากลองทำโปรเจกต์ 7 วันไปพร้อมกับคนอื่น
      </h2>
      <p className="mt-3 leading-relaxed text-[#f2ead9]/80">
        SHIFT คือ 7 วัน ปั้น 1 โปรเจกต์จริง สร้างของที่คนนอกได้ลองใช้ พร้อมบันทึกจุดพังและสิ่งที่แก้
        และพอร์ต 1 หน้าสำหรับ TCAS 1 ออนไลน์ทาง Discord สร้างคนเดียวหรือชวนเพื่อนมาด้วยก็ได้
      </p>
      <Link
        href="/shift"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f2ead9] px-5 py-2.5 text-sm font-bold text-[#17151c] transition-opacity hover:opacity-90"
      >
        ดู SHIFT ทุกรุ่น
        <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </aside>
  );
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
