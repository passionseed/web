import { AdminHackathonActivities } from "@/components/admin/AdminHackathonActivities";
import { AdminHackathonPhase3Grading } from "@/components/admin/AdminHackathonPhase3Grading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default function AdminHackathonActivitiesPage() {
  return (
    <Tabs defaultValue="linear" className="space-y-4">
      <TabsList>
        <TabsTrigger value="linear">Linear Activities</TabsTrigger>
        <TabsTrigger value="phase3">Phase 3</TabsTrigger>
      </TabsList>
      <TabsContent value="linear" className="space-y-4">
        <AdminHackathonActivities />
      </TabsContent>
      <TabsContent value="phase3" className="space-y-4">
        <AdminHackathonPhase3Grading />
      </TabsContent>
    </Tabs>
  );
}
