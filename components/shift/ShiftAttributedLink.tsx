"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { getShiftSource, withShiftSource } from "@/lib/shift/attribution";

/** Explicit URLs also carry attribution when opened in a new tab. */
export function ShiftAttributedLink({ href, children, className, onClick }: {
  href: string; children: ReactNode; className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => { setSource(getShiftSource()); }, []);
  return <Link href={withShiftSource(href, source)} className={className} onClick={onClick}>{children}</Link>;
}
