import type { Metadata } from "next";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { TeacherForm } from "@/components/hackathon/elemental/share/TeacherForm";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { demoPagesOn, shareOpen } from "@/lib/hackathon/elemental/share";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `ลิงก์แชร์ของคุณครู ${ELEMENTAL.edition} Hackathon`,
  description: "คุณครูสร้างโปสเตอร์และลิงก์ของตัวเอง ส่งให้นักเรียน",
  // Shared by link with teachers while sign-up is open.
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Public teacher page: make a share link, no sign-up.
 * ?demo=1 (development and PR previews only) opens the form even while
 * sharing is off, and sends the made-up result to /hackathon/elemental/teacher/demo.
 */
export default async function TeacherPage({ searchParams }: { searchParams: SearchParams }) {
  const demo = demoPagesOn() && (await searchParams).demo === "1";
  return (
    <div className={trirong.variable}>
      <TeacherForm open={demo || shareOpen()} demo={demo} />
    </div>
  );
}
