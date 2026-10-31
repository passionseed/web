"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Search } from "lucide-react";

import { AdminErrorState } from "@/components/admin/shared/AdminStates";
import { Input } from "@/components/ui/input";
import { describeError, isNoRoundRole } from "@/lib/shift-round/admin/format";
import type { AdminError } from "@/lib/shift-round/admin/types";
import { cn } from "@/lib/utils";

/** Native select styled for the dusk admin theme (works with keyboard and in tests). */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function SearchBox({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:w-64", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder ?? label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8"
      />
    </div>
  );
}

/** Load failure for a whole panel, with the error code kept visible. */
export function LoadError({
  error,
  onRetry,
  retrying,
  title,
}: {
  error: AdminError;
  onRetry: () => void;
  retrying?: boolean;
  title?: string;
}) {
  return (
    <AdminErrorState
      title={isNoRoundRole(error) ? "No SHIFT round access" : title ?? "Could not load this"}
      message={describeError(error)}
      onRetry={isNoRoundRole(error) ? undefined : onRetry}
      retrying={retrying}
    />
  );
}

/** Inline failure of the last action. */
export function ActionError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

const TONE: Record<string, string> = {
  good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  bad: "border-destructive/50 bg-destructive/15 text-red-300",
  info: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  muted: "border-border bg-muted/40 text-muted-foreground",
};

/** Plain-text placeholder for an empty value: an en dash, never an em dash. */
export const EMPTY_VALUE = "–";

/** Muted en dash for an empty table cell or field. Screen readers hear "none". */
export function EmptyValue() {
  return (
    <span className="text-muted-foreground">
      <span aria-hidden="true">{EMPTY_VALUE}</span>
      <span className="sr-only">none</span>
    </span>
  );
}

export function Pill({ tone = "muted", children }: { tone?: keyof typeof TONE; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", TONE[tone])}>
      {children}
    </span>
  );
}

export function statusTone(status: string): keyof typeof TONE {
  switch (status) {
    case "accepted":
    case "issued":
    case "approved":
    case "certified":
    case "published":
    case "active":
    case "ok":
      return "good";
    case "rejected":
    case "revoked":
    case "failed":
    case "taken_down":
      return "bad";
    case "pending":
    case "submitted":
    case "review":
    case "running":
    case "draft":
      return "warn";
    case "upcoming":
      return "info";
    default:
      return "muted";
  }
}

export function Section({
  title,
  aside,
  children,
  className,
  id,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("space-y-3 rounded-lg border bg-card/40 p-4", className)} aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const ROUND_TABS = [
  { slug: "", label: "Dashboard" },
  { slug: "attendance", label: "เช็กชื่อ" },
  { slug: "entrants", label: "Entrants" },
  { slug: "squads", label: "Squads" },
  { slug: "review", label: "Review" },
  { slug: "summaries", label: "Summaries" },
  { slug: "certificates", label: "Certificates" },
  { slug: "settings", label: "Settings" },
];

/** Sub-navigation inside one round. */
export function RoundSubnav({ roundId }: { roundId: string }) {
  const pathname = usePathname();
  const base = `/admin/shift/rounds/${roundId}`;
  return (
    <nav aria-label="Round sections" className="flex flex-wrap items-center gap-1 border-b pb-2">
      <Link href="/admin/shift/rounds" className="mr-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground">
        All rounds
      </Link>
      {ROUND_TABS.map((tab) => {
        const href = tab.slug ? `${base}/${tab.slug}` : base;
        const active = tab.slug ? pathname === href || pathname.startsWith(`${href}/`) : pathname === base;
        return (
          <Link
            key={tab.slug || "dashboard"}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-300" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
