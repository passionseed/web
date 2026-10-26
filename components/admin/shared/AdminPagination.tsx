"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AdminPaginationProps {
  /** 1-based current page. */
  page: number;
  totalPages: number;
  /** Rows across every page. Nothing renders when this is 0. */
  total: number;
  /** Rows per page, for the "1 to 20 of 340" range. */
  pageSize: number;
  /** What the rows are, singular and plural: ["user", "users"]. */
  noun: readonly [one: string, many: string];
  onPageChange: (page: number) => void;
  /** Names the nav landmark, e.g. "Users pages". */
  label?: string;
  className?: string;
}

/**
 * Range text plus Previous and Next for a server-paged admin list.
 * Buttons are 44px tall and say which way they go to screen readers.
 */
export function AdminPagination({
  page,
  totalPages,
  total,
  pageSize,
  noun,
  onPageChange,
  label = "Pagination",
  className,
}: AdminPaginationProps) {
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const word = total === 1 ? noun[0] : noun[1];

  return (
    <nav
      aria-label={label}
      className={cn("flex flex-wrap items-center justify-between gap-2", className)}
    >
      <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
        {first.toLocaleString()} to {last.toLocaleString()} of {total.toLocaleString()} {word}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 active:bg-accent"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            Page {page.toLocaleString()} of {totalPages.toLocaleString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 active:bg-accent"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </nav>
  );
}
