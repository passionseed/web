import { AdminEventTracker } from "@/components/admin/AdminEventTracker";

export const dynamic = "force-dynamic";

export default function AdminEventTrackerPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold">Event Tracker</h2>
      <p className="text-sm text-muted-foreground">
        Monitor product activity and planner conversion.
      </p>
      <AdminEventTracker />
    </div>
  );
}
