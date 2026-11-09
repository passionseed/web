import { getCampaignQueue, getCampaignReadout, type VariantReadout } from "@/lib/supabase/dm-campaigns";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";
import { CampaignReviewQueue } from "@/components/admin/CampaignReviewQueue";
import { CampaignControls } from "@/components/admin/CampaignControls";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";

export const dynamic = "force-dynamic";

/** Callers must run requireAdmin() first: this reads with the service-role client. */
async function getLatestCampaign() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("dm_campaigns")
    .select("id, name, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

function ReplyRateReadout({ readout }: { readout: VariantReadout[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border bg-muted/30 px-3 py-1.5 text-xs">
      <span className="text-muted-foreground">ผลตอบกลับต่อกลุ่ม</span>
      {readout.map((arm) => (
        <span key={arm.variant} className="flex items-center gap-1">
          <span className="text-muted-foreground">
            {arm.variant === "ask" ? "มีคำถามปิดท้าย" : "ไม่มีคำถามปิดท้าย"}
          </span>
          <b className="tabular-nums">{arm.replyRate}%</b>
          <span className="text-muted-foreground">
            ({arm.replied}/{arm.sent})
          </span>
        </span>
      ))}
      <span className="text-muted-foreground">
        ยังสรุปไม่ได้จนกว่าจะส่งครบทั้งสองกลุ่ม
      </span>
    </div>
  );
}

export default async function CampaignPage() {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const campaign = await getLatestCampaign();

  if (!campaign) {
    return (
      <div className="space-y-4">
        <AdminPageHeader
          eyebrow="DM leads"
          title="รอบทัก"
          description="ยังไม่มีรอบทัก กดสร้างเพื่อให้ระบบเลือกคนที่ยังส่งข้อความหาได้ แล้วร่างข้อความให้ทุกคน"
        />
        <CampaignControls campaignId={null} autoCount={0} />
      </div>
    );
  }

  const [reviewQueue, autoQueue, readout] = await Promise.all([
    getCampaignQueue(campaign.id, "review"),
    getCampaignQueue(campaign.id, "auto"),
    getCampaignReadout(campaign.id),
  ]);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="DM leads"
        title={campaign.name}
        description="เรียงตามเวลาที่เหลือก่อน Meta ปิดหน้าต่าง 7 วัน"
      />

      <CampaignControls campaignId={campaign.id} autoCount={autoQueue.length} />

      {readout.length > 0 && <ReplyRateReadout readout={readout} />}

      <CampaignReviewQueue campaignId={campaign.id} items={reviewQueue} />
    </div>
  );
}
