import { Badge } from "@/components/ui/badge";
import { formatBangkokDateTime } from "@/lib/admin/queue-tools/format";
import { linkSource, shareCode } from "@/lib/hackathon/elemental/share";
import {
  nextSeat,
  phonesMatch,
  reachedInvite,
  schoolMatch,
  SEAT_RULE,
  TEACHER_INVITE_DEVICES,
  type SchoolMatch,
  type SeatSlotStatus,
} from "@/lib/hackathon/elemental/share-rules";
import type { AdminShareLink, SharePerson, ShareSeat } from "@/lib/supabase/hackathon-share-links";
import { cn } from "@/lib/utils";

import { ShareSeatActions } from "./ShareSeatActions";
import { ShareCopyTeacherLink, ShareTeacherMarks } from "./ShareTeacherTools";

/**
 * Every Elemental share link, students and teachers, and the free seats each
 * has earned (SEAT_RULE: every 50 devices + 1 paid = 1 seat, up to 2 per
 * link). Seats waiting for a check go on top, each with its own fraud check
 * and Confirm / Reject; teachers get the verified and Demo Day invite marks
 * and their private link. Staff only: names and contacts show here and
 * nowhere public.
 */

/** A sign-up as the panel sees it (lib/supabase/hackathon-share-links.ts, loadSharePeople). */
export type ShareRegInfo = SharePerson;

export type ShareSummary = {
  links: number;
  students: number;
  teachers: number;
  /** Seats earned, and by status. */
  seats: number;
  waitingCheck: number;
  waitingName: number;
  confirmed: number;
  rejected: number;
  teachersAtGoal: number;
  verified: number;
  invited: number;
};

export function shareSummary(links: AdminShareLink[]): ShareSummary {
  const teachers = links.filter((l) => l.kind === "teacher");
  const seats = links.flatMap((l) => l.seats);
  const count = (s: SeatSlotStatus) => seats.filter((x) => x.status === s).length;
  return {
    links: links.length,
    students: links.length - teachers.length,
    teachers: teachers.length,
    seats: seats.length,
    waitingCheck: count("qualified"),
    waitingName: count("needs_recipient"),
    confirmed: count("confirmed"),
    rejected: count("rejected"),
    teachersAtGoal: teachers.filter((l) => reachedInvite(l.progress)).length,
    verified: teachers.filter((l) => l.verifiedAt).length,
    invited: teachers.filter((l) => l.invitedAt).length,
  };
}

const MATCH_LABEL: Record<SchoolMatch, string> = { match: "match", similar: "similar names: check", different: "different" };

/** Two schools side by side, and whether they're the same: match, similar (look), or different. */
function SchoolPair({ label, linkSchool, other }: { label: string; linkSchool: string; other: string | undefined }) {
  const m = schoolMatch(linkSchool, other);
  return (
    <p className={cn(m === "different" && "text-destructive", m === "similar" && "text-amber-700 dark:text-amber-400")}>
      {label}: link {linkSchool} · sign-up {other || "?"} · <span className="font-medium">{MATCH_LABEL[m]}</span>
    </p>
  );
}

const SEAT_LABEL: Record<SeatSlotStatus, string> = {
  qualified: "waiting for a check",
  needs_recipient: "waiting for a name",
  confirmed: "confirmed: given",
  rejected: "rejected",
};

/** Who a seat goes to on Confirm, and whether Confirm can go ahead. */
function recipientLine(l: AdminShareLink, seat: ShareSeat, regs: Map<string, ShareRegInfo>): { text: string; ok: boolean } {
  const id = seat.recipientRegistrationId;
  if (!id || seat.status === "needs_recipient") {
    return {
      text: l.kind === "teacher" ? "Waiting for the teacher to type a student's code." : "Waiting for the student to type an unpaid friend's code.",
      ok: false,
    };
  }
  const r = regs.get(id);
  const who = id === l.registrationId ? "their own sign-up" : `${r?.name ?? "?"} (code ${shareCode(id).toUpperCase()}${r?.school ? `, ${r.school}` : ""})`;
  const ok = r?.status === "pending";
  const verb = seat.status === "confirmed" ? "Given to" : "Goes to";
  return {
    text: `${verb} ${who}${r && seat.status !== "confirmed" ? `, ${r.status === "pending" ? "unpaid" : `now ${r.status}: they must name someone else`}` : ""}.`,
    ok,
  };
}

/** What staff check before confirming a seat: the schools, who paid through the link, shared phones, how the devices came in. */
function FraudCheck({ l, seat, regs }: { l: AdminShareLink; seat: ShareSeat; regs: Map<string, ShareRegInfo> }) {
  const src = linkSource(l.kind, l.code);
  const own = l.registrationId ? regs.get(l.registrationId) : undefined;
  const sharerPhones = l.kind === "teacher" ? [l.teacherPhone] : (own?.phones ?? []);
  const all = [...regs.entries()].filter(([, r]) => r.source === src && r.status === "paid");
  const counted = all.filter(([, r]) => !r.freeSeat && !r.paidAfterClose);
  const recipientId = seat.recipientRegistrationId;
  const t = l.traffic;
  return (
    <div className="space-y-1.5 rounded-md border bg-background p-3">
      <p className="font-medium">Fraud check, seat {seat.index}</p>
      {l.kind === "student" && <SchoolPair label="Sharer" linkSchool={l.schoolName} other={own?.school} />}
      {recipientId && recipientId !== l.registrationId && <SchoolPair label="Recipient" linkSchool={l.schoolName} other={regs.get(recipientId)?.school} />}
      <p>
        Devices: {l.progress.devices} from {t.networks} network{t.networks === 1 ? "" : "s"} · {t.last24h} in the last 24 hours · busiest hour {t.peakHour}
        {t.networks > 0 && l.progress.devices / t.networks >= 4 && " · many devices per network: look closer"}
      </p>
      <p>
        Seat {seat.index} needs {seat.index * SEAT_RULE.devicesPerSeat} devices + {seat.index * SEAT_RULE.paidPerSeat} paid; earned{" "}
        {formatBangkokDateTime(seat.earnedAt, { year: false })} at {seat.devices} devices, {seat.paid} paid.
      </p>
      <p>Paid through this link ({counted.reduce((n, [, r]) => n + r.seats, 0)} seats that count):</p>
      <ul className="list-disc space-y-0.5 pl-5">
        {all.map(([id, r]) => {
          const shared = phonesMatch(sharerPhones, r.phones);
          const note = r.freeSeat ? "free seat, doesn't count" : r.paidAfterClose ? "paid after close, doesn't count" : null;
          return (
            <li key={id} className={cn(note && "text-muted-foreground", !note && shared && "text-destructive")}>
              {r.name} · {r.school} · {r.seats} {r.seats === 1 ? "seat" : "seats"}
              {shared && " · same phone as the sharer"}
              {note && ` · ${note}`}
            </li>
          );
        })}
        {all.length === 0 && <li className="text-muted-foreground">none</li>}
      </ul>
    </div>
  );
}

function SeatRowView({ l, seat, regs }: { l: AdminShareLink; seat: ShareSeat; regs: Map<string, ShareRegInfo> }) {
  const recipient = recipientLine(l, seat, regs);
  const open = seat.status === "qualified" || seat.status === "needs_recipient";
  return (
    <div className={cn("space-y-2 rounded-md border p-3", seat.status === "qualified" && "border-primary/50 bg-primary/10")}>
      <p>
        <span className="font-medium">Seat {seat.index}</span> · {SEAT_LABEL[seat.status]}
        {seat.decidedAt && ` ${formatBangkokDateTime(seat.decidedAt, { year: false })}`}
      </p>
      <p>{recipient.text}</p>
      {seat.status === "qualified" && <FraudCheck l={l} seat={seat} regs={regs} />}
      {open && <ShareSeatActions id={seat.id} canConfirm={seat.status === "qualified" && recipient.ok} />}
    </div>
  );
}

function LinkRow({ l, regs }: { l: AdminShareLink; regs: Map<string, ShareRegInfo> }) {
  const own = l.registrationId ? regs.get(l.registrationId) : undefined;
  const custom = l.schoolKey.startsWith("custom:");
  const next = nextSeat(l.progress, l.seats.length);
  const waiting = l.seats.some((x) => x.status === "qualified");
  return (
    <li className={cn("space-y-2 rounded-lg border p-3 text-sm", waiting && "border-primary/50")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={l.kind === "teacher" ? "secondary" : "outline"}>{l.kind}</Badge>
        <span className="font-medium">
          {l.schoolName}
          {l.province && `, ${l.province}`}
        </span>
        {custom && <span className="text-muted-foreground">(typed, not on the list: check the name)</span>}
        <span className="text-muted-foreground">src: {linkSource(l.kind, l.code)}</span>
        {l.registrationStatus === "cancelled" && <Badge variant="outline">sign-up cancelled: earns no seats</Badge>}
      </div>
      <p>
        <span className="tabular-nums">
          {l.progress.devices} devices · {l.progress.paid} paid
        </span>
        {" · "}
        {l.seats.length} of {SEAT_RULE.maxSeatsPerLink} seats earned
        {next && ` · next: ${next.devicesLeft} devices + ${next.paidLeft} paid to seat ${next.index}`}
      </p>
      <p className="text-muted-foreground">
        {l.kind === "teacher"
          ? [l.teacherName, l.teacherContact, l.teacherPhone].filter(Boolean).join(" · ")
          : `${own?.name ?? "?"}${own ? ` (sign-up ${own.status})` : ""}`}
      </p>
      {l.seats.map((seat) => (
        <SeatRowView key={seat.id} l={l} seat={seat} regs={regs} />
      ))}
      {l.kind === "teacher" && (
        <div className="flex flex-wrap items-center gap-2">
          <ShareTeacherMarks id={l.id} verified={!!l.verifiedAt} invited={!!l.invitedAt} canInvite={reachedInvite(l.progress)} />
          {!reachedInvite(l.progress) && !l.invitedAt && <span className="text-muted-foreground">Demo Day invite at {TEACHER_INVITE_DEVICES} devices</span>}
          {l.invitedAt && <span className="text-muted-foreground">invite sent {formatBangkokDateTime(l.invitedAt, { year: false })}</span>}
          {l.token && <ShareCopyTeacherLink token={l.token} />}
        </div>
      )}
    </li>
  );
}

/** Links with a seat waiting for a check first (oldest first), then waiting for a name, then by devices. */
function rank(l: AdminShareLink): [number, string, number] {
  const check = l.seats.filter((x) => x.status === "qualified").map((x) => x.earnedAt).sort()[0];
  if (check) return [0, check, 0];
  if (l.seats.some((x) => x.status === "needs_recipient")) return [1, "", -l.progress.devices];
  return [2, "", -l.progress.devices];
}

export function ShareLinksPanel({ links, regs }: { links: AdminShareLink[]; regs: Map<string, ShareRegInfo> }) {
  if (links.length === 0) return null;
  const sorted = [...links].sort((a, b) => {
    const [ga, ta, da] = rank(a);
    const [gb, tb, db] = rank(b);
    return ga - gb || ta.localeCompare(tb) || da - db;
  });
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
