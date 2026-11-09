import { Badge } from "@/components/ui/badge";
import { TrialReviewActions } from "@/components/admin/TrialReviewActions";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminEmptyState, AdminErrorState } from "@/components/admin/shared/AdminStates";
import { formatBangkokDateTime } from "@/lib/admin/queue-tools/format";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  getTrialReviewQueue,
  trialStudentLabel,
  type AdminTrial,
} from "@/lib/supabase/admin-trials";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RECENT_LIMIT = 50;

const formatTs = (value: string | null) => formatBangkokDateTime(value, { year: true });

function TrialStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === "paid" ? "secondary" : "outline"}
      className={cn(
        status === "pending" && "border-primary/50 bg-primary/10 text-foreground",
        status === "expired" && "text-muted-foreground",
      )}
    >
      {status}
    </Badge>
  );
}

function SlipPreview({ slipUrl }: { slipUrl: string | null }) {
  if (!slipUrl) {
    return (
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground">
        No slip
      </div>
    );
  }
  return (
    <a
      href={slipUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title="Open the full slip"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slipUrl}
        alt="Payment slip"
        className="h-20 w-20 rounded-md border object-cover"
        referrerPolicy="no-referrer"
      />
    </a>
  );
}

function TrialCard({ trial }: { trial: AdminTrial }) {
  return (
    <li className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-start">
      <div className="flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{trialStudentLabel(trial)}</span>
          <TrialStatusBadge status={trial.status} />
          <span className="text-sm text-muted-foreground">฿{trial.priceAmount.toLocaleString()}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          PathLab: <span className="text-foreground">{trial.seedTitle ?? "Unknown PathLab"}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Started {formatTs(trial.startedAt)}
          {" · "}Deadline {formatTs(trial.paymentDeadline)}
          {trial.paidAt && <>{" · "}Paid {formatTs(trial.paidAt)}</>}
        </p>
        {trial.adminNote && (
          <p className="text-sm text-muted-foreground">Note: {trial.adminNote}</p>
        )}
      </div>

      <div className="flex items-start gap-4">
        <SlipPreview slipUrl={trial.slipUrl} />
        {trial.status === "pending" && (
          <TrialReviewActions trialId={trial.id} studentLabel={trialStudentLabel(trial)} />
        )}
      </div>
    </li>
  );
}

async function loadQueue() {
  try {
    return await getTrialReviewQueue(RECENT_LIMIT);
  } catch (error) {
    console.error("[admin/trials] failed to load trials", error);
    return null;
  }
}

export default async function AdminTrialsPage() {
  await requireAdmin();
  const queue = await loadQueue();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Payments"
        title="PathLab trial payments"
        description="Check each uploaded payment slip, then approve it to unlock the PathLab or reject it to give the student their remaining time back."
      />

      {queue === null ? (
        <AdminErrorState
          title="Could not load trial payments"
          message="The list did not load, so this is not an empty queue. Refresh the page to try again. If it keeps failing, tell the tech team."
        />
      ) : (
        <>
          <section aria-labelledby="trials-pending" className="space-y-3">
            <h2 id="trials-pending" className="text-sm font-medium">
              Waiting for verification
              <span className="ml-2 tabular-nums text-muted-foreground">{queue.pending.length}</span>
            </h2>
            {queue.pending.length === 0 ? (
              <AdminEmptyState
                title="No slips waiting"
                description="New payment slips appear here as soon as a student uploads one."
              />
            ) : (
              <ul className="space-y-3">
                {queue.pending.map((trial) => (
                  <TrialCard key={trial.id} trial={trial} />
                ))}
              </ul>
            )}
          </section>

          {queue.recent.length > 0 && (
            <section aria-labelledby="trials-recent" className="space-y-3">
              <h2 id="trials-recent" className="text-sm font-medium">
                Recent trials
                <span className="ml-2 text-muted-foreground">latest {RECENT_LIMIT}</span>
              </h2>
              <ul className="space-y-3">
                {queue.recent.map((trial) => (
                  <TrialCard key={trial.id} trial={trial} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
