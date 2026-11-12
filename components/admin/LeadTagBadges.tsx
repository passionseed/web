import { Badge } from "@/components/ui/badge";

export interface LeadTags {
  has_hands_on_experience: boolean;
  wants_pathlab: boolean;
  pathlab_pay_ready: boolean;
  wants_community: boolean;
  wants_talent: boolean;
}

const TAG_CONFIG: { key: keyof LeadTags; label: string; variant: "default" | "secondary" | "outline" }[] = [
  { key: "pathlab_pay_ready", label: "Pay-ready", variant: "default" },
  { key: "wants_pathlab", label: "Wants PathLab", variant: "secondary" },
  { key: "wants_community", label: "Wants Community", variant: "secondary" },
  { key: "wants_talent", label: "Wants Talent", variant: "secondary" },
  { key: "has_hands_on_experience", label: "Hands-on", variant: "outline" },
];

export function LeadTagBadges({ tags }: { tags: LeadTags }) {
  const active = TAG_CONFIG.filter((t) => tags[t.key]);
  if (active.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        <span aria-hidden="true">–</span>
        <span className="sr-only">No tags</span>
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {active.map((t) => (
        <Badge key={t.key} variant={t.variant} className="text-xs">
          {t.label}
        </Badge>
      ))}
    </div>
  );
}
