import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration, sharePercent, type VoiceReportRow } from "@/lib/shift/voiceSummary";
import { cn } from "@/lib/utils";

function clock(ms: number | null): string {
  if (ms === null) return "";
  return new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

/** Minutes plus their share of time in voice, e.g. "42 min · 65%". */
function Share({ ms, of }: { ms: number; of: number }) {
  if (of === 0) return <span className="text-muted-foreground">–</span>;
  return (
    <span>
      {formatDuration(ms)}
      <span className="text-muted-foreground"> · {sharePercent(ms, of)}%</span>
    </span>
  );
}

function StudentCell({ row }: { row: VoiceReportRow }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {row.totals.inVoiceNow && (
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-label="In voice now" title="In voice now" />
      )}
      <span className="font-medium">{row.name}</span>
      {row.kind === "role_only" && (
        <Badge variant="outline" title="Has the round's Discord role but no linked application">
          role only
        </Badge>
      )}
      {row.kind === "student" && !row.paid && <Badge variant="outline">unpaid</Badge>}
    </div>
  );
}

function Summary({ rows }: { rows: VoiceReportRow[] }) {
  const students = rows.filter((r) => r.kind === "student");
  const present = students.filter((r) => r.totals.voiceMs > 0).length;
  const unlinked = students.filter((r) => !r.discordLinked).length;
  const roleOnly = rows.filter((r) => r.kind === "role_only" && r.totals.voiceMs > 0).length;
  const live = rows.filter((r) => r.totals.inVoiceNow).length;

  const parts = [`${present} of ${students.length} students were in voice`];
  if (live > 0) parts.push(`${live} in voice now`);
  if (roleOnly > 0) parts.push(`${roleOnly} more by Discord role only`);
  if (unlinked > 0) parts.push(`${unlinked} never linked Discord, so they cannot be seen`);
  return <p className="text-sm text-muted-foreground">{parts.join(" · ")}</p>;
}

/** One row per student: time in voice, mic open, screen share, camera, joins. */
export function ShiftVoiceReport({ rows }: { rows: VoiceReportRow[] }) {
  return (
    <div className="space-y-3">
      <Summary rows={rows} />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">In voice</TableHead>
              <TableHead className="text-right">Mic on</TableHead>
              <TableHead className="text-right">Screen share</TableHead>
              <TableHead className="text-right">Camera</TableHead>
              <TableHead className="text-right" title="Times they entered voice. More than one means they dropped and came back.">
                Joins
              </TableHead>
              <TableHead className="text-right">First in</TableHead>
              <TableHead className="text-right">Last seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const t = row.totals;
              const absent = t.voiceMs === 0;
              return (
                <TableRow key={row.key} className={cn(absent && "text-muted-foreground")}>
                  <TableCell>
                    <StudentCell row={row} />
                  </TableCell>
                  {absent ? (
                    <TableCell colSpan={7} className="text-right">
                      {row.discordLinked ? "Not in voice" : "Discord not linked"}
                    </TableCell>
                  ) : (
                    <>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {formatDuration(t.voiceMs)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        <Share ms={t.micMs} of={t.voiceMs} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {t.streamMs > 0 ? formatDuration(t.streamMs) : "–"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {t.cameraMs > 0 ? formatDuration(t.cameraMs) : "–"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{t.joins}</TableCell>
                      <TableCell className="text-right tabular-nums">{clock(t.firstAt)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.inVoiceNow ? "now" : clock(t.lastAt)}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Mic on means unmuted, not talking: no audio is recorded. A student can sit unmuted in silence or talk in
        a room without the bot. Read these as a signal to check in, not a grade.
      </p>
    </div>
  );
}
