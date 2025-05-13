import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function getStatusColor(status: string) {
  switch (status) {
    case "past":
      return "bg-gray-300 text-gray-700";
    case "ongoing":
      return "bg-green-500 text-white";
    case "upcoming":
      return "bg-blue-500 text-white";
    default:
      return "bg-gray-200 text-gray-700";
  }
}

function formatDateRange(start: string, end?: string) {
  if (!start) return "TBD";
  const startDate = new Date(start);
  if (!end)
    return startDate.toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  const endDate = new Date(end);
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${startDate.toLocaleDateString(undefined, { month: "short" })} - ${endDate.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
  }
  return `${startDate.toLocaleDateString(undefined, { month: "short", year: "numeric" })} - ${endDate.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
}

export default async function WorkshopPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = await createClient();
  const { data: workshop, error } = await supabase
    .from("workshops")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (error || !workshop) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 to-violet-900 pb-24">
      <div className="container mx-auto px-4 py-12">
        <Button
          variant="outline"
          className="mb-8 bg-white/20 text-white border-none hover:bg-white/30"
          asChild
        >
          <Link href="/workshops">← Back to Workshops</Link>
        </Button>

        <Card className="bg-white/10 backdrop-blur-sm border-none">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl mb-2 text-white">
                  {workshop.title}
                </CardTitle>
                <Badge className={getStatusColor(workshop.status)}>
                  {workshop.status.charAt(0).toUpperCase() +
                    workshop.status.slice(1)}
                </Badge>
              </div>
            </div>
            <CardDescription className="text-xl text-white/80 mt-4">
              {workshop.theme}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">
                  📅 Date(s)
                </h3>
                <p className="text-white/70">
                  {formatDateRange(workshop.start_date, workshop.end_date)}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">
                  👨‍🏫 Instructor
                </h3>
                <p className="text-white/70">{workshop.instructor || "TBD"}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-white">
                🧭 Learning Paths
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(workshop.paths)
                  ? workshop.paths.map((path: any, idx: number) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="px-3 py-1 text-sm bg-white/20 text-white border-none"
                      >
                        {path.emoji} {path.name}
                      </Badge>
                    ))
                  : null}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-white">
                📝 Description
              </h3>
              <p className="text-white/70 whitespace-pre-wrap">
                {workshop.description}
              </p>
            </div>

            <div className="flex justify-center mt-8">
              <Button
                size="lg"
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8"
              >
                Join Workshop
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
