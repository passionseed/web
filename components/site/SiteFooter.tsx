import Image from "next/image";
import Link from "next/link";

import { HAIR, T, tint } from "@/components/home/homeTheme";
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
      className="text-sm transition-colors hover:text-[#7fe3ff]"
      style={{ color: tint("99") }}
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
        <span className="font-kodchasan text-lg font-bold" style={{ color: T.text }}>
          PassionSeed
        </span>
      </Link>
      <p className="mt-4 text-sm leading-relaxed" style={{ color: tint("99") }}>
        พื้นที่ที่การลงมือสร้างของจริงเป็นเรื่องปกติ สำหรับนักเรียน ม.ปลาย ที่อยากเป็นคนเลือกทางเดินของตัวเอง
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

/** Public-site footer, in the space palette of the home page. */
export function SiteFooter() {
  return (
    <footer className={`relative border-t ${HAIR}`} style={{ backgroundColor: T.bg }}>
      <div className="mx-auto max-w-[74rem] px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <FooterBrand />
          {SITE_FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <p
                className="font-mono text-[11px] font-bold uppercase tracking-[0.24em]"
                style={{ color: T.accent1 }}
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
          <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: tint("73") }}>
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
