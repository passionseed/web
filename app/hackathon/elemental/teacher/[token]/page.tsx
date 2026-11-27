import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { TeacherView } from "@/components/hackathon/elemental/share/TeacherView";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { demoPagesOn, shareOpen } from "@/lib/hackathon/elemental/share";
import { teacherDemo } from "@/lib/hackathon/elemental/share-demo";
import { TEACHER_TOKEN_RE, type ShareLinkView } from "@/lib/hackathon/elemental/share-rules";
import { posterVersion } from "@/lib/hackathon/elemental/share-poster";
import { getTeacherLink, linkView } from "@/lib/supabase/hackathon-share-links";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `ลิงก์ของคุณครู ${ELEMENTAL.edition} Hackathon`,
  robots: { index: false, follow: false },
  // The URL is the teacher's private key: don't leak it to other sites.
  referrer: "no-referrer",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * A teacher's private page. /hackathon/elemental/teacher/demo?s=<state> shows
 * made-up states where demo pages are on: start · sharing · invited ·
 * invite-sent · seat · named · given · taken (lib/hackathon/elemental/share-demo.ts).
 */
export default async function TeacherLinkPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: SearchParams }) {
  const { token } = await params;
  if (token === "demo" && demoPagesOn()) {
    return (
      <div className={trirong.variable}>
        <TeacherView token="demo" demo open link={teacherDemo(first((await searchParams).s))} posterVersion={await posterVersion()} />
      </div>
    );
  }
  if (!TEACHER_TOKEN_RE.test(token)) notFound();

  let open = shareOpen();
  let found = true;
  let link: ShareLinkView | null = null;
  let version = "";
  try {
    const own = await getTeacherLink(token);
    found = !!own;
    if (own) [link, version] = await Promise.all([linkView(ELEMENTAL.slug, own, null), posterVersion()]);
  } catch (error) {
    // No share tables yet, or the database is down: show "closed" rather than break.
    console.error("[elemental teacher] could not load the link", error);
    open = false;
  }
  if (!found) notFound();

  return (
    <div className={trirong.variable}>
      <TeacherView token={token} open={open} link={link} posterVersion={version} />
    </div>
  );
}
