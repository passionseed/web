import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getMapWithNodesServer } from "@/lib/supabase/maps-server";
import { createClient } from "@/utils/supabase/server";
import { isInstructor } from "@/lib/supabase/roles";
import { MapViewerWithProvider as MapViewer } from "@/components/map/MapViewer";
import { MapEnrollmentTracker } from "@/components/map/MapEnrollmentTracker";
import { ArrowLeft, Pencil } from "lucide-react";

export default async function MapViewerPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const supabase = await createClient();

  // OPTIMIZATION: Execute auth and data fetching concurrently
  const [userResult, map] = await Promise.all([
    supabase.auth.getUser(),
    getMapWithNodesServer(params.id),
  ]);

  const { data: { user } } = userResult;

  if (!map) {
    notFound();
  }

  // OPTIMIZATION: Only check instructor status if needed (user exists and isn't creator)
  const userIsInstructor = user && map.creator_id !== user.id 
    ? await isInstructor(user.id)
    : false;

  // Simple inline permission check - user can edit if they're the creator OR instructor
  const userCanEdit = user && (map.creator_id === user.id || userIsInstructor);

  return (
    <MapEnrollmentTracker map={map}>
      <div className="w-full" style={{ height: "calc(100vh - 65px)" }}>
        <div className="absolute top-20 left-4 z-10 flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/map">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Maps
            </Link>
          </Button>
          {userCanEdit && (
            <Button asChild variant="default" size="sm">
              <Link href={`/map/${params.id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Map
              </Link>
            </Button>
          )}
          {userIsInstructor && (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/map/${params.id}/grading`}>
                <Pencil className="h-4 w-4 mr-2" />
                Grade Submissions
              </Link>
            </Button>
          )}
        </div>
        <MapViewer map={map} />
      </div>
    </MapEnrollmentTracker>
  );
}
