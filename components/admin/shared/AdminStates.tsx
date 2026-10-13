"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Shared load states for admin tools. They use the theme tokens only, so they
 * read correctly inside the dusk admin shell and anywhere else.
 */

export function AdminErrorState({
  title = "Could not load this",
  message = "Something went wrong while loading. Check your connection and try again.",
  onRetry,
  retrying = false,
  className,
}: {
  title?: string;
  message?: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <div className="text-sm text-muted-foreground">{message}</div>
        </div>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} disabled={retrying} className="shrink-0">
          <RefreshCw className={cn("mr-2 h-4 w-4", retrying && "animate-spin")} aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed px-4 py-12 text-center",
        className,
      )}
    >
      <span className="mb-3 text-muted-foreground" aria-hidden="true">
        {icon ?? <Inbox className="h-6 w-6" />}
      </span>
      <p className="font-medium">{title}</p>
      {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AdminLoading({
  rows = 4,
  rowClassName = "h-14",
  label = "Loading",
  className,
}: {
  rows?: number;
  rowClassName?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true">
      <span className="sr-only" role="status">
        {label}
      </span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cn("w-full rounded-lg", rowClassName)} />
      ))}
    </div>
  );
}
