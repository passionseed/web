import { Badge } from "@/components/ui/badge";
import type { SeedstackConsentState } from "@/lib/seedstack/consent";
import type { BoardRow, StepStatus } from "@/lib/seedstack/board";
import { SEEDSTACK_STEPS } from "@/lib/seedstack/events";

export interface SeedstackBoardStudent {
  userId: string;
  nickname: string | null;
  cohort: string | null;
  consent: SeedstackConsentState;
  row: BoardRow | null;
}

const STATUS_LABEL: Record<StepStatus, string> = {
  not_started: "-",
  in_progress: "working",
  stuck: "stuck",
  done: "done",
};

const STATUS_VARIANT: Record<StepStatus, "outline" | "secondary" | "destructive" | "default"> = {
  not_started: "outline",
  in_progress: "secondary",
  stuck: "destructive",
  done: "default",
};

const CONSENT_LABEL: Record<SeedstackConsentState, string> = {
  none: "no consent",
  active: "active",
  withdrawn: "withdrawn",
};

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

export function AdminSeedstackBoard({ students }: { students: SeedstackBoardStudent[] }) {
  if (students.length === 0) {
    return <p className="text-sm text-muted-foreground">No student has opened /shift/seedstack yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="p-3">Student</th>
            <th className="p-3">Consent</th>
            {SEEDSTACK_STEPS.map((s) => (
              <th key={s} className="p-3 capitalize">{s}</th>
            ))}
            <th className="p-3">Next</th>
            <th className="p-3">Live</th>
            <th className="p-3">Last seen</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.userId} className="border-t align-top">
              <td className="p-3">
                <div className="font-medium">{s.nickname ?? s.userId.slice(0, 8)}</div>
                {s.cohort && <div className="text-xs text-muted-foreground">{s.cohort}</div>}
              </td>
              <td className="p-3">{CONSENT_LABEL[s.consent]}</td>
              {SEEDSTACK_STEPS.map((step) => {
                const summary = s.row?.steps[step];
                const status = summary?.status ?? "not_started";
                return (
                  <td key={step} className="p-3">
                    <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
                    {summary?.minutes != null && <div className="mt-1 text-xs text-muted-foreground">{summary.minutes} min</div>}
                    {summary?.detail && <div className="mt-1 max-w-[16rem] text-xs text-destructive">{summary.detail}</div>}
                  </td>
                );
              })}
              <td className="max-w-[16rem] p-3">{s.row?.next ?? "-"}</td>
              <td className="p-3">
                {s.row?.liveUrl ? (
                  <a href={s.row.liveUrl} target="_blank" rel="noreferrer" className="underline">
                    {new URL(s.row.liveUrl).hostname}
                  </a>
                ) : (
                  "-"
                )}
              </td>
              <td className="p-3 text-muted-foreground">{s.row ? timeAgo(s.row.lastSeen) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
