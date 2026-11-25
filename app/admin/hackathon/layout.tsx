import type { ReactNode } from "react";
import Link from "next/link";

import { HackathonNav } from "@/components/admin/HackathonNav";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

export default function AdminHackathonLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow={`${ELEMENTAL.series}, 2nd edition`}
        title={`${ELEMENTAL.edition} Hackathon`}
        description={
          <>
            Seats, sign-ups and slips to check, tasks and the sponsor pipeline. The 1st edition&apos;s tools are in the{" "}
            <Link href="/admin/archive/hackathon-healthcare" className="underline underline-offset-2">
              archive
            </Link>
            .
          </>
        }
      />
      <HackathonNav />
      {children}
    </div>
  );
}
