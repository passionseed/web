import type { ReactNode } from "react";

import { HackathonNav } from "@/components/admin/HackathonNav";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";

export default function AdminHackathonLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="The Next Decade Hackathon"
        title="Hackathon"
        description="Grade activity and team submissions, manage participants, teams and mentors, and email or push everyone who registered. Pick a tool below."
      />
      <HackathonNav />
      {children}
    </div>
  );
}
