import type { Metadata } from "next";

import { AlreadySignedUp } from "@/components/hackathon/elemental/join/AlreadySignedUp";
import { Body, H1, Page, v } from "@/components/hackathon/elemental/share/ui";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { demoPagesOn } from "@/lib/hackathon/elemental/share";

export const metadata: Metadata = {
  title: `หาหน้าของฉัน ${ELEMENTAL.edition} Hackathon`,
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Back to your own page on another phone, for someone who has already signed
 * up (Big, 2026-11-28). There's no login: a person's page is its link, so this
 * is the remembered-phone button or the link by email to the sign-up address.
 * Linked from the sign-up form's first screen and the waiting room.
 */
export default async function FindMyPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const demo = demoPagesOn() && params.demo === "1";
  return (
    <Page surface="paper" back={{ href: "/hackathon/elemental", label: ELEMENTAL.edition }}>
      <H1>หาหน้าของฉัน</H1>
      <div className="mt-3 mb-8" style={{ color: v.secondary }}>
        <Body>สมัครไว้แล้ว เปลี่ยนเครื่องหรือหาลิงก์ไม่เจอ ใส่อีเมลที่ใช้สมัคร เราส่งลิงก์หน้าของคุณไปให้</Body>
      </div>
      <AlreadySignedUp startOpen demo={demo} />
    </Page>
  );
}
