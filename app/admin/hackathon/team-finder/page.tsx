import TeamFinderAdminPage from "@/components/admin/hackathon/TeamFinderAdminPage";

export const dynamic = "force-dynamic";

export default async function HackathonTeamFinderAdminPage() {

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Team Finder — Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">
          ดูว่าใครกำลังหาทีม จำลองการจับกลุ่ม และยืนยันเพื่อสร้างทีมจริง
        </p>
      </div>
      <TeamFinderAdminPage />
    </div>
  );
}
