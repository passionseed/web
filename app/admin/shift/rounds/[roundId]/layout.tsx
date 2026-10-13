import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { RoundSubnav } from "@/components/admin/shift-rounds/shared";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { isUuid } from "@/lib/shift-round/admin/format";

export const dynamic = "force-dynamic";

export default async function ShiftRoundLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ roundId: string }>;
}) {
  await requireAdmin();
  const { roundId } = await params;
  if (!isUuid(roundId)) notFound();
  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <RoundSubnav roundId={roundId} />
      {children}
    </div>
  );
}
