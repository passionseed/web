import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getMapWithNodesServer } from "@/lib/supabase/maps-server";
import { createClient } from "@/utils/supabase/server";
import { isInstructor } from "@/lib/supabase/roles";
import { MapViewerWithProvider as MapViewer } from "@/components/map/MapViewer";
import { MapEnrollmentTracker } from "@/components/map/MapEnrollmentTracker";
import { ArrowLeft, Pencil, ClipboardCheck } from "lucide-react";

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

  // Check if user is admin
  const userIsAdmin = user
    ? await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single()
      .then(({ data }) => !!data)
    : false;

  // Restrict access to seed maps - only admins can access seed maps directly
  if (map.map_type === 'seed' && !userIsAdmin) {
    notFound();
  }

  // OPTIMIZATION: Only check instructor status if needed (user exists and isn't creator)
  const userIsInstructor = user && map.creator_id !== user.id
    ? await isInstructor(user.id)
    : false;

  // Check if user is the creator of this map
  const userIsCreator = user && map.creator_id === user.id;

  // Check if user is an editor of this map
  const userIsEditor = user
    ? await supabase
      .from("map_editors")
      .select("id")
      .eq("map_id", params.id)
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => !!data)
    : false;

  // Simple inline permission check - user can edit if they're the creator OR editor OR instructor OR admin
  const userCanEdit = user && (userIsCreator || userIsEditor || userIsInstructor || userIsAdmin);

  // User can grade if they're creator OR editor OR instructor OR admin
  const userCanGrade = user && (userIsCreator || userIsEditor || userIsInstructor || userIsAdmin);

  return (
    <MapEnrollmentTracker map={map}>
      <div className="w-full" style={{ height: "calc(100vh - 65px)" }}>
        <div className="absolute top-20 left-4 z-10 flex gap-2">
          <Button asChild variant="outline" size="sm">
            {map.map_type === 'seed' && map.parent_seed_id ? (
              <Link href={`/seeds/${map.parent_seed_id}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Seed
              </Link>
            ) : (
              <Link href="/map">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Maps
              </Link>
            )}
          </Button>
          {userCanEdit && (
            <Button asChild variant="default" size="sm">
              <Link href={`/map/${params.id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Map
              </Link>
            </Button>
          )}
          {userCanGrade && (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/map/${params.id}/grading`}>
                <ClipboardCheck className="h-4 w-4 mr-2" />
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
