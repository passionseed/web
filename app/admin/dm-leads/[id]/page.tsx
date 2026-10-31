import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { isUuid } from "@/lib/shift-round/admin/format";
import { getConversationWithMessages } from "@/lib/supabase/dm-leads";
import { DmLeadManageBar } from "@/components/admin/DmLeadManageBar";
import { DmLeadTagsEditor } from "@/components/admin/DmLeadTagsEditor";
import { LeadNeedsSummary } from "@/components/admin/LeadNeedsSummary";
import { LeadTagBadges } from "@/components/admin/LeadTagBadges";
import { DmLeadConversation } from "@/components/admin/DmLeadConversation";
import { PlanGeneratorModal } from "@/components/admin/PlanGeneratorModal";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";

export const dynamic = "force-dynamic";

type Conversation = NonNullable<Awaited<ReturnType<typeof getConversationWithMessages>>>;

function instagramHandle(username: string | null): string | null {
  const handle = username?.trim().replace(/^@+/, "");
  return handle ? `@${handle}` : null;
}

function LeadSubtitle({ conversation }: { conversation: Conversation }) {
  return (
    <>
      {conversation.display_name && conversation.username && (
        <p>{instagramHandle(conversation.username)}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        <Badge variant="outline" className="capitalize">{conversation.platform}</Badge>
        {conversation.grade_level && <Badge variant="outline">{conversation.grade_level}</Badge>}
        <Badge variant="secondary">{conversation.stage}</Badge>
      </div>
    </>
  );
}

export default async function DmLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const conversation = await getConversationWithMessages(id);
  if (!conversation) notFound();

  return (
    <div className="space-y-6">
      <div>
        <AdminPageHeader
          eyebrow="DM lead"
          title={conversation.display_name || conversation.username || conversation.platform_user_id}
          description={<LeadSubtitle conversation={conversation} />}
          actions={
            <>
              <RefreshButton />
              <PlanGeneratorModal conversation={conversation} />
            </>
          }
        />
        <LeadTagBadges tags={conversation} />
        <div className="mt-3 space-y-2">
          <DmLeadManageBar conversation={conversation} />
          <DmLeadTagsEditor conversation={conversation} />
        </div>
        {conversation.interests.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Interests: {conversation.interests.join(", ")}
          </p>
        )}
        <div className="mt-3 max-w-xl">
          <LeadNeedsSummary conversation={conversation} />
        </div>
      </div>

      <DmLeadConversation conversation={conversation} />
    </div>
  );
}
