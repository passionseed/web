import TeamFinderAdminPage from "@/components/admin/hackathon/TeamFinderAdminPage";

export const dynamic = "force-dynamic";

export default function HackathonTeamFinderAdminPage() {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xl font-semibold">Team Finder</h3>
        <p className="text-sm text-muted-foreground">
          ดูว่าใครกำลังหาทีม จำลองการจับกลุ่ม และยืนยันเพื่อสร้างทีมจริง
        </p>
      </div>
      <TeamFinderAdminPage />
    </div>
  );
}
