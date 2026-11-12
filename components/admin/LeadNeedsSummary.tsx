import { Flame, MessageSquareWarning, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { summarizeLeadNeeds } from "@/lib/dm-leads/lead-summary";
import type { DmConversation } from "@/types/dm-leads";

/**
 * One-glance "what does this customer need" card for the DM inbox.
 * Pure render — safe in server and client components.
 */
export function LeadNeedsSummary({ conversation }: { conversation: DmConversation }) {
  const summary = summarizeLeadNeeds(conversation);

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        summary.priority === "hot" && "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {summary.priority === "hot" && (
          <Badge variant="destructive" className="gap-1">
            <Flame className="h-3 w-3" /> Hot: พร้อมสมัคร
          </Badge>
        )}
        {summary.priority === "reply" && (
          <Badge variant="outline" className="gap-1 border-amber-400 text-amber-600 dark:text-amber-400">
            <MessageSquareWarning className="h-3 w-3" /> รอเราตอบ
          </Badge>
        )}
        <span className="font-medium">{summary.headline}</span>
      </div>

      {summary.needs.length > 0 && (
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {summary.needs.map((need) => (
            <li key={need} className="flex items-start gap-1.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              {need}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 flex items-start gap-1.5 font-medium">
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
        {summary.suggestedAction}
      </p>
    </div>
  );
}
