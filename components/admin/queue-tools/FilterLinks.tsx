import Link from "next/link";

import { cn } from "@/lib/utils";

export interface FilterLinkItem {
  key: string;
  label: string;
  href: string;
  active: boolean;
  count?: number;
}

/**
 * A row of filter links for server-rendered queue tools. The filter lives in
 * the URL, so every state is a shareable link; the active one is marked with
 * aria-current and the amber selection style.
 */
export function FilterLinks({
  label,
  items,
  className,
}: {
  /** Accessible name of the group, e.g. "Stage". */
  label: string;
  items: FilterLinkItem[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          scroll={false}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors lg:[@media(pointer:fine)]:min-h-9",
            item.active
              ? "border-primary bg-primary/10 font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted active:text-foreground",
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span className="text-xs tabular-nums text-muted-foreground">{item.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
