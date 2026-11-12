import Link from "next/link";
import { Bot, ChevronRight, University, type LucideIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

const ARCHIVE_SECTIONS: { href: string; title: string; description: string; icon: LucideIcon }[] = [
  {
    href: "/admin/archive/universities",
    title: "Universities",
    description: "Add, edit, and organize the universities students can pick as targets, and their example journey maps.",
    icon: University,
  },
  {
    href: "/admin/archive/ai",
    title: "AI agents",
    description: "The AI agents and prompts used across the platform.",
    icon: Bot,
  },
];

function ArchiveRow({ href, title, description, icon: Icon }: (typeof ARCHIVE_SECTIONS)[number]) {
  return (
    <li>
      <Link
        href={href}
        className="group flex min-h-11 items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{title}</span>
          <span className="block text-sm text-muted-foreground">{description}</span>
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

export default async function ArchivePage() {
  await requireAdmin();

  return (
    <div className="max-w-3xl space-y-4">
      <AdminPageHeader
        eyebrow="Tools & archive"
        title="Archive"
        description="Reference data and older tools that still back parts of the platform."
      />
      <ul className="space-y-2">
        {ARCHIVE_SECTIONS.map((section) => (
          <ArchiveRow key={section.href} {...section} />
        ))}
      </ul>
    </div>
  );
}
