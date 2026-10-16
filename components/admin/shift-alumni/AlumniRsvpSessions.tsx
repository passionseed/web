import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { longThaiDate, stepsLine } from "@/lib/content/shift-alumni";
import type { SessionRsvps } from "@/lib/shift/alumniRsvpSummary";

/**
 * Who said they're coming, per alumni session, for /admin/shift/alumni.
 * Nicknames only, as students typed them; RSVPs are not verified.
 */

const signedUpAt = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function SessionHeader({
  group,
  next,
}: {
  group: SessionRsvps;
  next: boolean;
}) {
  const { session, rsvps, byCohort } = group;
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h3 className="text-lg font-semibold">{longThaiDate(session.date)}</h3>
      {next && <Badge>Next</Badge>}
      {session.cancelled && <Badge variant="secondary">Cancelled</Badge>}
      <span className="text-sm text-muted-foreground">
        {stepsLine(session.topic) || "No topic yet"}
      </span>
      {!session.cancelled && (
        <span className="ml-auto text-sm">
          <span className="text-2xl font-semibold tabular-nums">
            {rsvps.length}
          </span>{" "}
          <span className="text-muted-foreground">going</span>
          {Object.entries(byCohort).map(([cohort, n]) => (
            <span key={cohort} className="ml-2 text-xs text-muted-foreground">
              {cohort} {n}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

function RsvpTable({ group }: { group: SessionRsvps }) {
  if (group.rsvps.length === 0) {
    return <p className="text-sm text-muted-foreground">No RSVPs yet.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nickname</TableHead>
          <TableHead>Round</TableHead>
          <TableHead>Answered feedback</TableHead>
          <TableHead className="text-right">Signed up</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {group.rsvps.map((rsvp) => (
          <TableRow key={`${rsvp.cohort}-${rsvp.nickname}`}>
            <TableCell className="font-medium">{rsvp.nickname}</TableCell>
            <TableCell>{rsvp.cohort}</TableCell>
            <TableCell>
              {rsvp.answeredFeedback ? (
                "Yes"
              ) : (
                <span className="text-muted-foreground">No match</span>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {signedUpAt(rsvp.created_at)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AlumniRsvpSessions({
  groups,
  nextDate,
}: {
  groups: SessionRsvps[];
  nextDate?: string;
}) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <section
          key={group.session.date}
          className="space-y-3 rounded-lg border p-4"
        >
          <SessionHeader group={group} next={group.session.date === nextDate} />
          {!group.session.cancelled && <RsvpTable group={group} />}
        </section>
      ))}
    </div>
  );
}
