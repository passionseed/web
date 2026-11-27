import { Badge } from "@/components/ui/badge";
import { formatBangkokDateTime } from "@/lib/admin/queue-tools/format";
import { linkSource, shareCode } from "@/lib/hackathon/elemental/share";
import { GOALS, phonesMatch, reachedDevicesGoal, sameSchool, seatRecipientId } from "@/lib/hackathon/elemental/share-rules";
import type { AdminShareLink } from "@/lib/supabase/hackathon-share-links";
import { cn } from "@/lib/utils";

import { ShareSeatActions } from "./ShareSeatActions";
import { ShareCopyTeacherLink, ShareTeacherMarks } from "./ShareTeacherTools";

/**
 * Every Elemental share link, students and teachers: school, devices, paid,
 * status. Seats waiting for a check go on top with Confirm / Reject;
 * teachers get the Demo Day invite mark and their private link.
 * Staff only: names and contacts show here and nowhere public.
 */

export type ShareRegInfo = {
  name: string;
  status: string;
  /** The first member's school, as typed at sign-up. */
  school: string;
  /** The contact phone and every parent phone on the sign-up. */
  phones: string[];
  source: string | null;
  seats: number;
};

export type ShareSummary = {
  links: number;
  students: number;
  teachers: number;
  qualified: number;
  confirmed: number;
  teachersAtGoal: number;
  verified: number;
  invited: number;
};

export function shareSummary(links: AdminShareLink[]): ShareSummary {
  const teachers = links.filter((l) => l.kind === "teacher");
  return {
    links: links.length,
    students: links.length - teachers.length,
    teachers: teachers.length,
    qualified: links.filter((l) => l.seat?.status === "qualified").length,
    confirmed: links.filter((l) => l.seat?.status === "confirmed").length,
    teachersAtGoal: teachers.filter((l) => reachedDevicesGoal(l.progress)).length,
    verified: teachers.filter((l) => l.verifiedAt).length,
    invited: teachers.filter((l) => l.invitedAt).length,
  };
}

type Status = "qualified" | "confirmed" | "sharing" | "taken" | "rejected";
const STATUS_LABEL: Record<Status, string> = {
  qualified: "qualified: check it",
  confirmed: "free seat confirmed",
  sharing: "sharing",
  taken: "school seat taken by another link",
  rejected: "rejected",
};
const ORDER: Record<Status, number> = { qualified: 0, confirmed: 1, sharing: 2, taken: 3, rejected: 4 };

function statusOf(l: AdminShareLink): Status {
  if (l.status === "rejected") return "rejected";
  if (l.seat?.status === "qualified") return "qualified";
  if (l.seat?.status === "confirmed") return "confirmed";
  if (l.schoolTaken) return "taken";
  return "sharing";
}

/** Who a seat goes to on Confirm, and whether Confirm can go ahead. */
function recipientLine(l: AdminShareLink, regs: Map<string, ShareRegInfo>): { text: string; ok: boolean } {
  const own = l.registrationId ? regs.get(l.registrationId) : undefined;
  const id = seatRecipientId({
    kind: l.kind,
    ownRegistrationId: l.registrationId,
    ownStatus: own?.status ?? null,
    namedRecipientId: l.seat?.recipientRegistrationId ?? null,
  });
  if (!id) {
    return {
      text: l.kind === "teacher" ? "Waiting for the teacher to type a student's code." : "They have paid: waiting for them to type an unpaid friend's code.",
      ok: false,
    };
  }
  const r = regs.get(id);
  const who =
    id === l.registrationId
      ? "their own sign-up"
      : `${r?.name ?? "?"} (code ${shareCode(id).toUpperCase()}${r?.school ? `, ${r.school}` : ""})`;
  const ok = r?.status === "pending";
  return { text: `Goes to ${who}${r ? `, ${r.status === "pending" ? "unpaid" : `now ${r.status}: ask for another code`}` : ""}.`, ok };
}

/** What staff check before confirming: who paid through the link, shared phones, the school, and how the devices came in. */
function FraudCheck({ l, regs }: { l: AdminShareLink; regs: Map<string, ShareRegInfo> }) {
  const src = linkSource(l.kind, l.code);
  const own = l.registrationId ? regs.get(l.registrationId) : undefined;
  const sharerPhones = l.kind === "teacher" ? [l.teacherPhone] : (own?.phones ?? []);
  const payers = [...regs.entries()].filter(([, r]) => r.source === src && r.status === "paid");
  const schoolMismatch = l.kind === "student" && own && !sameSchool(l.schoolName, own.school);
  const t = l.traffic;
  return (
    <div className="space-y-1.5 rounded-md border bg-background p-3">
      <p className="font-medium">Fraud check</p>
      {schoolMismatch && (
        <p className="text-destructive">
          School doesn&apos;t match: the link says {l.schoolName}, the sign-up says {own.school}.
        </p>
      )}
      <p>
        Devices: {l.progress.devices} from {t.networks} network{t.networks === 1 ? "" : "s"} · {t.last24h} in the last 24 hours · busiest hour{" "}
        {t.peakHour}
        {t.networks > 0 && l.progress.devices / t.networks >= 4 && " · many devices per network: look closer"}
      </p>
      <p>Paid through this link ({payers.reduce((n, [, r]) => n + r.seats, 0)} seats):</p>
      <ul className="list-disc space-y-0.5 pl-5">
        {payers.map(([id, r]) => {
          const shared = phonesMatch(sharerPhones, r.phones);
          return (
            <li key={id} className={cn(shared && "text-destructive")}>
              {r.name} · {r.school} · {r.seats} {r.seats === 1 ? "seat" : "seats"}
              {shared && " · same phone as the sharer"}
            </li>
          );
        })}
        {payers.length === 0 && <li className="text-muted-foreground">none</li>}
      </ul>
    </div>
  );
}

function LinkRow({ l, regs }: { l: AdminShareLink; regs: Map<string, ShareRegInfo> }) {
  const status = statusOf(l);
  const own = l.registrationId ? regs.get(l.registrationId) : undefined;
  const recipient = l.seat ? recipientLine(l, regs) : null;
  const custom = l.schoolKey.startsWith("custom:");
  return (
    <li className={cn("space-y-2 rounded-lg border p-3 text-sm", status === "qualified" && "border-primary/50 bg-primary/10")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={l.kind === "teacher" ? "secondary" : "outline"}>{l.kind}</Badge>
        <span className="font-medium">
          {l.schoolName}
          {l.province && `, ${l.province}`}
        </span>
        {custom && <span className="text-muted-foreground">(typed, not on the list: check the name)</span>}
        <span className="text-muted-foreground">src: {linkSource(l.kind, l.code)}</span>
      </div>
      <p>
        <span className="tabular-nums">
          {l.progress.devices}/{GOALS.devices} devices · {l.progress.paid}/{GOALS.paid} paid
        </span>
        {" · "}
        {STATUS_LABEL[status]}
        {l.seat && ` (qualified ${formatBangkokDateTime(l.seat.qualifiedAt, { year: false })})`}
      </p>
      <p className="text-muted-foreground">
        {l.kind === "teacher"
          ? [l.teacherName, l.teacherContact, l.teacherPhone].filter(Boolean).join(" · ")
          : `${own?.name ?? "?"}${own ? ` (sign-up ${own.status})` : ""}`}
      </p>
      {status === "qualified" && <FraudCheck l={l} regs={regs} />}
      {status === "qualified" && recipient && (
        <div className="flex flex-wrap items-center gap-3">
          <span>{recipient.text}</span>
          <ShareSeatActions id={l.seat!.id} canConfirm={recipient.ok} />
        </div>
      )}
      {status === "confirmed" && recipient && <p>{recipient.text.replace(/^Goes to/, "Given to")}</p>}
      {l.kind === "teacher" && (
        <div className="flex flex-wrap items-center gap-2">
          <ShareTeacherMarks id={l.id} verified={!!l.verifiedAt} invited={!!l.invitedAt} canInvite={reachedDevicesGoal(l.progress)} />
          {!reachedDevicesGoal(l.progress) && !l.invitedAt && (
            <span className="text-muted-foreground">Demo Day invite at {GOALS.devices} devices</span>
          )}
          {l.invitedAt && <span className="text-muted-foreground">invite sent {formatBangkokDateTime(l.invitedAt, { year: false })}</span>}
          {l.token && <ShareCopyTeacherLink token={l.token} />}
        </div>
      )}
    </li>
  );
}

export function ShareLinksPanel({ links, regs }: { links: AdminShareLink[]; regs: Map<string, ShareRegInfo> }) {
  if (links.length === 0) return null;
  const sorted = [...links].sort(
    (a, b) =>
      ORDER[statusOf(a)] - ORDER[statusOf(b)] ||
      (a.seat?.qualifiedAt ?? "").localeCompare(b.seat?.qualifiedAt ?? "") ||
      b.progress.devices - a.progress.devices,
  );
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">Share links</h2>
      <ul className="space-y-2">
        {sorted.map((l) => (
          <LinkRow key={l.id} l={l} regs={regs} />
        ))}
      </ul>
    </section>
  );
}
