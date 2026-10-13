import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { CertificatesPanel } from "@/components/admin/shift-rounds/CertificatesPanel";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function RoundCertificatesPanelPage({ params }: { params: Promise<{ roundId: string }> }) {
  await requireAdmin();
  const { roundId } = await params;
  return (
    <div className="space-y-4">
      <AdminPageHeader eyebrow="SHIFT round" title="Certificates" description="Issued and revoked certificates, outcomes per entrant, and the issue job." />
      <CertificatesPanel roundId={roundId} />
    </div>
  );
}
