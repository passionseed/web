"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BOARD_PATH } from "@/lib/shift/alumniBoard";

import board from "./board.module.css";

const LINKS = [
  { href: BOARD_PATH, label: "การ์ดของฉัน" },
  { href: `${BOARD_PATH}/team`, label: "ทีม" },
  { href: `${BOARD_PATH}/feed`, label: "📣 ฟีด" },
];

export function BoardNav({ mentor }: { mentor: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Alumni board" className={board.nav}>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={board.navLink}
          aria-current={pathname === link.href ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
      {mentor && (
        <Link href="/admin/shift/alumni/board" className={board.navLink}>
          Mentor
        </Link>
      )}
    </nav>
  );
}
