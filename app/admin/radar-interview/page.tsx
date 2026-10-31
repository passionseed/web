import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { RadarInterviewClient } from "./RadarInterviewClient";

export const dynamic = "force-dynamic";

export default function AdminRadarInterviewPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="Career Radar"
        title="Interview note-taker"
        description={
          <>
            Take live notes during a mentor interview, then generate a DB-ready AI prompt that turns them into a
            Career Radar <code>realPeople</code> entry.
          </>
        }
      />
      <RadarInterviewClient />
    </div>
  );
}
