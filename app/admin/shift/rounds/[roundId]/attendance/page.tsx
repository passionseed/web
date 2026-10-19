import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AttendanceBoard } from "@/components/admin/shift-rounds/AttendanceBoard";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function RoundAttendancePage({ params }: { params: Promise<{ roundId: string }> }) {
  await requireAdmin();
  const { roundId } = await params;
  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="SHIFT round"
        title="เช็กชื่อเซสชัน"
        description="ใครมา ชดเชย หรือขาด ในแต่ละวันที่มีเซสชัน ขั้น 9 ของนักเรียนนับจากหน้านี้"
      />
      <AttendanceBoard roundId={roundId} />
    </div>
  );
}
