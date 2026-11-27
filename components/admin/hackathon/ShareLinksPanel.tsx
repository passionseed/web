import { Badge } from "@/components/ui/badge";
import { linkSource } from "@/lib/hackathon/elemental/share";
import type { AdminShareLink } from "@/lib/supabase/hackathon-share-links";

import { ShareCopyTeacherLink } from "./ShareTeacherTools";

/**
 * Every Elemental share link, students and teachers, with what it brought in:
 * devices and paid sign-ups, both counted up to sign-up close. A plain
 * tracking list: sharing earns no seats (Big, 2026-11-27). Staff only:
 * teachers' names and contacts show here and nowhere public.
 */

export type ShareSummary = { links: number; students: number; teachers: number; devices: number; paid: number };

export function shareSummary(links: AdminShareLink[]): ShareSummary {
  const teachers = links.filter((l) => l.kind === "teacher").length;
  return {
    links: links.length,
    students: links.length - teachers,
    teachers,
    devices: links.reduce((n, l) => n + l.devices, 0),
    paid: links.reduce((n, l) => n + l.paid, 0),
  };
}

function LinkRow({ l }: { l: AdminShareLink }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-3 text-sm">
      <Badge variant={l.kind === "teacher" ? "secondary" : "outline"}>{l.kind}</Badge>
      <span className="font-medium">
        {l.schoolName}
        {l.province && `, ${l.province}`}
      </span>
      {l.schoolKey.startsWith("custom:") && <span className="text-muted-foreground">(typed, not on the list)</span>}
      <span className="text-muted-foreground">src: {linkSource(l.kind, l.code)}</span>
      <span className="tabular-nums">
        {l.devices} devices · {l.paid} paid
      </span>
      {l.registrationStatus === "cancelled" && <Badge variant="outline">sign-up cancelled</Badge>}
      {l.kind === "teacher" && (
        <span className="flex w-full flex-wrap items-center gap-2 text-muted-foreground">
          {[l.teacherName, l.teacherContact, l.teacherPhone].filter(Boolean).join(" · ")}
          {l.token && <ShareCopyTeacherLink token={l.token} />}
        </span>
      )}
    </li>
  );
}

export function ShareLinksPanel({ links }: { links: AdminShareLink[] }) {
  if (links.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">Share links</h2>
      <p className="text-xs text-muted-foreground">Most devices first. Devices and paid sign-ups count up to sign-up close; paid by slip time.</p>
      <ul className="space-y-2">
        {links.map((l) => (
          <LinkRow key={l.id} l={l} />
        ))}
      </ul>
    </section>
  );
}
