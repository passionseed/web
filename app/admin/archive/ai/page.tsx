import { AIAgentManagement } from "@/components/admin/AIAgentManagement";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function AIArchivePage() {
  const user = await requireAdmin();

  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="Archive"
        title="AI agents"
        description="Manage the AI agents and prompts used throughout the platform."
      />
      {/* Only the id is passed; the full auth user stays on the server. */}
      <AIAgentManagement user={{ id: user.id }} />
    </div>
  );
}
