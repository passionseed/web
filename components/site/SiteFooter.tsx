import Image from "next/image";
import Link from "next/link";

import { HAIR, INK, paper } from "@/components/shift/ShiftRiso";
import {
  SITE_FOOTER_COLUMNS,
  SITE_LEGAL_LINKS,
  SITE_SOCIAL_LINKS,
  type HomeLink,
} from "@/lib/content/home";

function FooterLink({ link }: { link: HomeLink }) {
  const external = link.href.startsWith("http");
  return (
    <Link
      href={link.href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="text-sm transition-colors hover:text-[#ffe800]"
      style={{ color: paper("99") }}
    >
      {link.label}
    </Link>
  );
}

function FooterBrand() {
  return (
    <div className="max-w-xs">
      <Link href="/" className="flex items-center gap-2.5">
        <Image src="/passion-seed-logo.png" alt="" width={32} height={32} unoptimized />
        <span className="font-kodchasan text-lg font-bold" style={{ color: INK.paper }}>
          PassionSeed
        </span>
      </Link>
      <p className="mt-4 text-sm leading-relaxed" style={{ color: paper("99") }}>
        พื้นที่ที่การลงมือสร้างของจริงเป็นเรื่องปกติ สำหรับน้อง ม.ปลาย ที่อยากเป็นคนเลือกทางเดินของตัวเอง
      </p>
      <ul className="mt-5 flex gap-5">
        {SITE_SOCIAL_LINKS.map((link) => (
          <li key={link.href}>
            <FooterLink link={link} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Public-site footer, same riso ink as the SHIFT page. */
export function SiteFooter() {
  return (
    <footer className={`relative border-t ${HAIR}`} style={{ backgroundColor: INK.black }}>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <FooterBrand />
          {SITE_FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <p
                className="font-mono text-[11px] font-bold uppercase tracking-[0.24em]"
                style={{ color: INK.orange }}
              >
                {column.title}
              </p>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className={`mt-14 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between ${HAIR}`}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: paper("73") }}>
            © {new Date().getFullYear()} PassionSeed · Bangkok
          </p>
          <ul className="flex gap-5">
            {SITE_LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <FooterLink link={link} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
