import { checkAdminAccess } from "@/utils/admin";
import { AIAgentManagement } from "@/components/admin/AIAgentManagement";

export default async function AIArchivePage() {
  const user = await checkAdminAccess();

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Agent Archive</h1>
          <p className="text-muted-foreground">
            Manage AI agents and prompts used throughout the platform
          </p>
        </div>
        <AIAgentManagement user={user} />
      </div>
    </div>
  );
}
