import { notFound } from "next/navigation";

import { EntryDetail } from "@/components/admin/shift-rounds/EntryDetail";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { isUuid } from "@/lib/shift-round/admin/format";

export const dynamic = "force-dynamic";

export default async function RoundEntryPage({
  params,
}: {
  params: Promise<{ roundId: string; entryId: string }>;
}) {
  await requireAdmin();
  const { entryId } = await params;
  if (!isUuid(entryId)) notFound();
  return <EntryDetail entryId={entryId} />;
}
