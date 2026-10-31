import TeamFinderAdminPage from "@/components/admin/hackathon/TeamFinderAdminPage";

export const dynamic = "force-dynamic";

export default function HackathonTeamFinderAdminPage() {
  return (
    <section className="space-y-3" aria-labelledby="hackathon-team-finder">
      <div>
        <h2 id="hackathon-team-finder" className="text-lg font-semibold">Team finder</h2>
        <p className="text-sm text-muted-foreground">
          ดูว่าใครกำลังหาทีม จำลองการจับกลุ่ม และยืนยันเพื่อสร้างทีมจริง
        </p>
      </div>
      <TeamFinderAdminPage />
    </section>
  );
}
