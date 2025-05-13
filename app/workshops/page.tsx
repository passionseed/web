import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default async function WorkshopsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch workshops
  const { data: workshops, error } = await supabase
    .from("workshops")
    .select("*")
    .order("start_date", { ascending: false });
  console.log(workshops, "workshops");

  // TODO: Add filter/sort logic (for now, just show all)
  //   return <div style={{ color: "white" }}>Hello Workshops</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 to-violet-900">
      {/* Hero Section */}
      <section className="w-full py-16 md:py-24 text-center flex flex-col items-center justify-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          🌱 Grow Your Passion with Our Workshops
        </h1>
        <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-2xl mx-auto">
          Explore hands-on learning paths that inspire action — from tech to
          tea!
        </p>
        <Button
          className="text-lg px-6 py-3 bg-yellow-400 hover:bg-yellow-500 font-semibold"
          asChild
        >
          <Link href={user ? "/suggest-path" : "/login?modal=suggest"}>
            Suggest a Path ✨
          </Link>
        </Button>
      </section>

      {/* Filter & Sort Bar */}
      <section className="container mx-auto px-4 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/10 rounded-lg p-4">
          <div className="flex gap-2 items-center">
            <span className="font-semibold text-white">Filter by:</span>
            <Button
              variant="outline"
              className="bg-white/20 text-white border-none"
            >
              Past
            </Button>
            <Button
              variant="outline"
              className="bg-white/20 text-white border-none"
            >
              Current
            </Button>
            <Button
              variant="outline"
              className="bg-white/20 text-white border-none"
            >
              Upcoming
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            <span className="font-semibold text-white">Sort by:</span>
            <Button
              variant="outline"
              className="bg-white/20 text-white border-none"
            >
              Date
            </Button>
            <Button
              variant="outline"
              className="bg-white/20 text-white border-none"
            >
              Popularity
            </Button>
            <Button
              variant="outline"
              className="bg-white/20 text-white border-none"
            >
              Name
            </Button>
          </div>
          {user && (
            <Button
              variant="outline"
              className="bg-green-600 text-white border-none"
            >
              Vote for Next Paths
            </Button>
          )}
        </div>
      </section>

      {/* Workshop Cards Grid */}
      <section className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {workshops && workshops.length > 0 ? (
            workshops.map((workshop: any) => (
              <Card
                key={workshop.id}
                className="bg-white/10 backdrop-blur-sm border-none hover:shadow-xl transition-shadow flex flex-col h-full"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2 text-white">
                      {workshop.title}
                      <Badge className={getStatusColor(workshop.status)}>
                        {workshop.status.charAt(0).toUpperCase() +
                          workshop.status.slice(1)}
                      </Badge>
                    </CardTitle>
                  </div>
                  <CardDescription className="text-base text-white/80 mt-2">
                    {workshop.theme}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-2">
                  <div className="text-white/70 text-sm mb-2">
                    <span className="font-semibold">📍 Date(s):</span>{" "}
                    {formatDateRange(workshop.start_date, workshop.end_date)}
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold text-white">🧭 Paths:</span>
                    <ul className="flex flex-wrap gap-2 mt-1">
                      {Array.isArray(workshop.paths)
                        ? workshop.paths.map((path: any, idx: number) => (
                            <li
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 text-white rounded text-sm"
                            >
                              {path.emoji} {path.name}
                            </li>
                          ))
                        : null}
                    </ul>
                  </div>
                  <div className="text-white/70 text-sm mb-2">
                    {workshop.description}
                  </div>
                  <Button
                    variant="outline"
                    className="mt-auto w-full bg-white/20 text-white border-none hover:bg-white/30"
                    asChild
                  >
                    <Link href={`/workshops/${workshop.slug}`}>
                      View Details
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center text-white/80 py-12">
              No workshops found.
            </div>
          )}
        </div>
      </section>

      {/* Footer Callout */}
      <footer className="w-full mt-16 flex flex-col items-center justify-center text-center py-12 bg-gradient-to-t from-purple-950 to-violet-900">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Want to inspire the next generation? 💫
        </h2>
        <p className="text-white/80 mb-4">
          Become a speaker, mentor, or partner for our next PassionSeed!
        </p>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg font-semibold"
          asChild
        >
          <Link href="/apply">Apply here</Link>
        </Button>
      </footer>
    </div>
  );
}
