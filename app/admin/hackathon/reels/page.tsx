import type { Metadata } from "next";

import { ReelList } from "@/components/admin/reels/ReelList";
import { REELS } from "@/lib/content/elemental-reels";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { bangkokToday, groupByDay } from "@/lib/reels/studio";

export const metadata: Metadata = { title: "Reel Studio" };
export const dynamic = "force-dynamic";

export default async function ReelsPage() {
  await requireAdmin();
  const today = bangkokToday();

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        Elemental reels by posting day. Open one to film it on a phone. Status and takes are saved in this browser only.
      </p>
      <ReelList groups={groupByDay(REELS, today)} today={today} />
    </div>
  );
}
