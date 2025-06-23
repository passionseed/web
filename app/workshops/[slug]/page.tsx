import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Custom Components
import { JoinWorkshopButton } from "@/components/workshop/join-workshop-button";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient();
  const { slug } = await params;

  const { data: workshop } = await supabase
    .from("workshops")
    .select("title, description, theme")
    .eq("slug", slug)
    .single();

  if (!workshop) {
    return {
      title: "Workshop Not Found | PassionSeed",
      icons: {
        icon: [
          { url: "/favicon.ico" },
          { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
          { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        ],
        apple: [
          { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ],
        other: [
          {
            rel: "mask-icon",
            url: "/passionseed-logo.svg",
          },
        ],
      },
      manifest: "/site.webmanifest",
    };
  }

  return {
    title: `${workshop.title} | PassionSeed Workshop`,
    description: workshop.description || workshop.theme,
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
      other: [
        {
          rel: "mask-icon",
          url: "/passionseed-logo.svg",
        },
      ],
    },
    manifest: "/site.webmanifest",
    openGraph: {
      title: `${workshop.title} | PassionSeed Workshop`,
      description: workshop.description || workshop.theme,
      images: [
        {
          url: "/passionseed-logo.svg",
          width: 1200,
          height: 630,
          alt: workshop.title,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${workshop.title} | PassionSeed Workshop`,
      description: workshop.description || workshop.theme,
      images: ["/passionseed-logo.svg"],
    },
  };
}

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

// Server component for the workshop page
export default async function WorkshopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Get the workshop data with questions
  const { data: workshop, error } = await supabase
    .from("workshops")
    .select(`
      *,
      user_workshops!left(
        status, 
        answer_1, 
        answer_2, 
        answer_3, 
        answer_4, 
        answer_5
      )
    `)
    .eq("slug", (await params).slug)
    .single();
    
  // Extract questions from workshop data
  const questions = {
    question_1: workshop?.question_1,
    question_2: workshop?.question_2,
    question_3: workshop?.question_3,
    question_4: workshop?.question_4,
    question_5: workshop?.question_5
  };

  if (error || !workshop) {
    notFound();
  }

  // Check if the current user is registered
  let isRegistered = false;
  if (session?.user?.id) {
    const { data: registration } = await supabase
      .from("workshop_participants")
      .select("id")
      .eq("workshop_id", workshop.id)
      .eq("user_id", session.user.id)
      .maybeSingle();

    isRegistered = !!registration;
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
              {isRegistered ? (
                <div className="text-center">
                  <div className="inline-flex items-center px-6 py-3 rounded-full bg-green-100 text-green-800">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    You're registered for this workshop!
                  </div>
                  <p className="mt-2 text-sm text-green-200">
                    Check your email for the workshop details.
                  </p>
                </div>
              ) : (
                <Suspense
                  fallback={
                    <Button
                      size="lg"
                      className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8"
                      disabled
                    >
                      Loading...
                    </Button>
                  }
                >
                  <JoinWorkshopButton
                    workshopId={workshop.id}
                    isAuthenticated={!!session}
                    questions={{
                      question_1: workshop.question_1,
                      question_2: workshop.question_2,
                      question_3: workshop.question_3,
                      question_4: workshop.question_4,
                      question_5: workshop.question_5
                    }}
                  />
                </Suspense>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
