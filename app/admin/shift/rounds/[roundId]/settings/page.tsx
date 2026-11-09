import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { RoundSettings } from "@/components/admin/shift-rounds/RoundSettings";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function RoundSettingsPage({ params }: { params: Promise<{ roundId: string }> }) {
  await requireAdmin();
  const { roundId } = await params;
  return (
    <div className="space-y-4">
      <AdminPageHeader eyebrow="SHIFT round" title="Settings" description="Policy, status, extension, allowlist, mentors and round staff." />
      <RoundSettings roundId={roundId} />
    </div>
  );
}
