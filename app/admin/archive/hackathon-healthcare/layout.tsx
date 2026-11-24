import type { ReactNode } from "react";

import { FIRST_EDITION_ITEMS, HackathonNav } from "@/components/admin/HackathonNav";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";

export default function AdminHackathonArchiveLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="Archive"
        title="Hackathon, 1st edition"
        description="The Next Decade health hackathon (Feb to Jun 2026): activities, participants, teams, submissions, mentors and the email and push senders."
      />
      <HackathonNav items={FIRST_EDITION_ITEMS} label="1st edition sections" />
      {children}
    </div>
  );
}
