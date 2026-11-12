import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * One cell in the talent statistics row. The row is a single divided strip
 * (see "Admin workspace (Dusk)" in docs/ui-design-system.md), so cells carry
 * no card or accent of their own. A cell with `href` links to its queue.
 *
 * Server component, no interactivity needed.
 */
interface StatTileProps {
  label: string;
  value: number | string;
  /** Marks the number that needs someone, in the selection colour. */
  emphasis?: boolean;
  href?: string;
}

export function StatTile({ label, value, emphasis = false, href }: StatTileProps) {
  const body = (
    <>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          emphasis ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
    </>
  );

  if (!href) return <div className="bg-background px-4 py-3">{body}</div>;
  return (
    <Link
      href={href}
      className="block min-h-11 bg-background px-4 py-3 transition-colors hover:bg-muted/60 active:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {body}
    </Link>
  );
}

/** The divided strip that holds the tiles: two columns on phones, three above. */
export function StatRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3"
    >
      {children}
    </section>
  );
}
