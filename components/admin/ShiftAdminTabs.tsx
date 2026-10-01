"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const SHIFT_ADMIN_LINKS = [
  { href: "/admin/shift/camp", label: "Interactive camp" },
  { href: "/admin/shift", label: "Tracker" },
  { href: "/admin/shift/applications", label: "Applications" },
];

/** Switches between the SHIFT admin surfaces. */
export function ShiftAdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
      {SHIFT_ADMIN_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            pathname === link.href
              ? "bg-background font-medium text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
