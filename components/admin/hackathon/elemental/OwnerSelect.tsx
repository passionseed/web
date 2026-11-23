"use client";

import { OWNERS, type Owner } from "@/lib/hackathon/elemental/targets";
import { cn } from "@/lib/utils";

/** The fixed owner list as a native select: big enough to tap, 16px on phones so iOS does not zoom. */
export function OwnerSelect({
  id,
  value,
  onChange,
  label = "Owner",
  noneLabel = "No owner",
  className,
}: {
  id?: string;
  value: Owner | null;
  onChange: (v: Owner | null) => void;
  /** Accessible name when there is no visible label. */
  label?: string;
  noneLabel?: string;
  className?: string;
}) {
  return (
    <select
      id={id}
      aria-label={id ? undefined : label}
      value={value ?? ""}
      onChange={(e) => onChange((e.target.value || null) as Owner | null)}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-background px-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:text-sm",
        className,
      )}
    >
      <option value="">{noneLabel}</option>
      {OWNERS.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
