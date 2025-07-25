import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getMapWithNodes } from "@/lib/supabase/maps";
import { createClient } from "@/utils/supabase/server";
import { isInstructor } from "@/lib/supabase/roles";
import { MapViewer } from "@/components/map/MapViewer";
import { ArrowLeft, Pencil } from "lucide-react";

export default async function MapViewerPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [map, userIsInstructor] = await Promise.all([
    getMapWithNodes(params.id),
    user ? isInstructor(user.id) : false,
  ]);

  if (!map) {
    notFound();
  }

  return (
    <div className="w-full" style={{ height: "calc(100vh - 65px)" }}>
      <div className="absolute top-20 left-4 z-10 flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/map">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Maps
          </Link>
        </Button>
        {userIsInstructor && (
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
  );
}
