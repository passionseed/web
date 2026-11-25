import { ExternalLink } from "lucide-react";

import { addDays, shortDate } from "@/lib/hackathon/elemental/bangkok-date";
import type { DueItem, OperationProgress, PostCell, TaskProgress } from "@/lib/hackathon/elemental/linear-progress";
import { cn } from "@/lib/utils";

import { DashSection, ProgressRow, QuietNotice, SubBlock } from "./ProgressMeter";

export type TasksState =
  | { ok: true; progress: TaskProgress; teamUrl: string | null }
  | { ok: false; reason: "no_key" | "failed" };

function DueList({ items, empty, showOwner = false }: { items: DueItem[]; empty: string; showOwner?: boolean }) {
  if (items.length === 0) return <p className="py-3 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y">
      {items.map((i) => (
        <li key={i.identifier} className="py-2">
          <a
            href={i.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start justify-between gap-3 text-sm"
          >
            <span className="min-w-0">
              <span className="mr-1.5 text-xs tabular-nums text-muted-foreground">{i.identifier}</span>
              <span className="group-hover:text-primary group-hover:underline">{i.title}</span>
            </span>
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </a>
          <div className="mt-0.5 flex gap-2 text-xs text-muted-foreground">
            {showOwner && (
              <>
                <span>{i.owner ?? "No owner"}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span className={cn("tabular-nums", i.overdue && "text-destructive")}>
              {i.overdue ? `Overdue, was due ${shortDate(i.dueDate)}` : `Due ${shortDate(i.dueDate)}`}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Today and overdue, one block per owner, unowned last. */
function ByOwner({ items }: { items: DueItem[] }) {
  if (items.length === 0) return <p className="py-3 text-sm text-muted-foreground">Nothing due today or overdue.</p>;
  const groups = new Map<string, DueItem[]>();
  for (const i of items) {
    const k = i.owner ?? "";
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }
  const order = [...groups.keys()].sort((a, b) => Number(a === "") - Number(b === "") || a.localeCompare(b));
  return (
    <div className="space-y-3 pt-1">
      {order.map((k) => (
        <div key={k || "none"}>
          <h4 className="text-xs text-muted-foreground">
            {k || "No owner"} <span className="tabular-nums">{groups.get(k)!.length}</span>
          </h4>
          <DueList items={groups.get(k)!} empty="" />
        </div>
      ))}
    </div>
  );
}

const POST_TONE: Record<PostCell["state"], string> = {
  done: "border-transparent bg-primary text-primary-foreground",
  today: "border-foreground/60 text-foreground",
  missed: "border-destructive/60 text-destructive",
  upcoming: "border-dashed text-muted-foreground",
};

const POST_WORD: Record<PostCell["state"], string> = {
  done: "posted",
  today: "due today",
  missed: "missed",
  upcoming: "coming up",
};

/** Promotion posts as day cells, in due-date order. */
function PostCells({ posts }: { posts: PostCell[] }) {
  const counts = posts.reduce(
    (acc, p) => ({ ...acc, [p.state]: (acc[p.state] ?? 0) + 1 }),
    {} as Partial<Record<PostCell["state"], number>>,
  );
  return (
    <div>
      <ul className="flex flex-wrap gap-1">
        {posts.map((p) => (
          <li key={p.identifier}>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${p.identifier} ${p.title}, ${shortDate(p.dueDate)}: ${POST_WORD[p.state]}`}
              aria-label={`${p.title}, ${shortDate(p.dueDate)}: ${POST_WORD[p.state]}`}
              className={cn(
                "grid h-9 min-w-9 place-items-center rounded border px-1 text-[11px] tabular-nums md:h-7 md:min-w-7",
                POST_TONE[p.state],
              )}
            >
              {Number(p.dueDate.slice(8))}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
        {counts.done ?? 0} posted, {counts.missed ?? 0} missed, {counts.today ?? 0} today, {counts.upcoming ?? 0} coming up
      </p>
    </div>
  );
}

function OperationRow({ op }: { op: OperationProgress }) {
  return (
    <ProgressRow
      href={op.url}
      label={op.title}
      hint={
        <span className={cn(op.pastDue && "text-destructive")}>
          {[op.owner, op.dueDate ? `${op.pastDue ? "was due" : "due"} ${shortDate(op.dueDate)}` : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      }
      value={op.done}
      target={op.total}
      tone={op.pastDue ? "behind" : undefined}
    />
  );
}

/** Linear tasks for the hackathon team: operations, promotion posts, and what is due. */
export function TasksSection({ state, today }: { state: TasksState; today: string }) {
  if (!state.ok) {
    return (
      <DashSection id="tasks" title="Tasks">
        <QuietNotice>
          {state.reason === "no_key"
            ? "Add LINEAR_API_KEY in Vercel to see tasks."
            : "Linear didn't answer, try again in a minute."}
        </QuietNotice>
      </DashSection>
    );
  }

  const { overall, operations, promotionPosts, todayAndOverdue, next48h, noDueDate } = state.progress;
  if (overall.total === 0) {
    return (
      <DashSection id="tasks" title="Tasks" meta="From Linear, refreshed every minute">
        <QuietNotice>No open or done tasks in the HAC team yet.</QuietNotice>
      </DashSection>
    );
  }

  const pastDue = operations.filter((o) => o.pastDue).length;

  return (
    <DashSection id="tasks" title="Tasks" meta="From Linear, refreshed every minute">
      {noDueDate > 0 && (
        <p className="-mt-1 mb-3 text-sm text-muted-foreground">
          <span className="tabular-nums text-foreground">{noDueDate}</span> open{" "}
          {noDueDate === 1 ? "task has" : "tasks have"} no due date, so they never show up as due.{" "}
          {state.teamUrl && (
            <a
              href={state.teamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-primary"
            >
              Date them in Linear
            </a>
          )}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SubBlock title="Operations" aside={pastDue > 0 ? `${pastDue} past due` : `${operations.length}`}>
          {operations.map((op) => (
            <OperationRow key={op.identifier} op={op} />
          ))}
        </SubBlock>

        <div className="min-w-0 space-y-6">
          {promotionPosts.length > 0 && (
            <SubBlock title="Promotion posts" aside={`${promotionPosts.length}`}>
              <div className="pt-2">
                <PostCells posts={promotionPosts} />
              </div>
            </SubBlock>
          )}
          <SubBlock title="Today and overdue" aside={`${todayAndOverdue.length}`}>
            <ByOwner items={todayAndOverdue} />
          </SubBlock>
          <SubBlock title="Next 48 hours" aside={`${next48h.length}`}>
            <DueList showOwner items={next48h} empty={`Nothing due after today through ${shortDate(addDays(today, 2))}.`} />
          </SubBlock>
        </div>
      </div>
    </DashSection>
  );
}
