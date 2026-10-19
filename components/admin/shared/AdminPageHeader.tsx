import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Page title block for admin tools, built on the admin-page-heading and
 * admin-eyebrow styles in app/admin/admin.css (same look as the overview).
 */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("admin-page-heading admin-page-heading-compact", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="admin-eyebrow">{eyebrow.toUpperCase()}</p>}
        <h1>{title}</h1>
        {description && <div className="admin-page-description">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
