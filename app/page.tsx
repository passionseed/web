import { LandingPageWrapper } from "@/components/landing-page-wrapper";
import { DashboardHome } from "@/components/dashboard-home";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, ArrowRight, Sparkles, Play } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

// Learning Maps Preview Component for non-logged-in users - defined OUTSIDE to avoid hooks issues
function LearningMapsPreview() {
  return (
    <section className="container py-16 px-4 md:px-6 bg-black/50">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tighter mb-4 text-white">
          Interactive Learning Maps
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Navigate through gamified learning paths with floating islands,
          unlockable content, and progress tracking
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {[
          {
            title: "JavaScript Fundamentals",
            description:
              "Master the building blocks of modern web development with interactive nodes",
            nodes: 12,
            difficulty: "Beginner",
            theme: "Crystal Islands",
          },
          {
            title: "React Development Path",
            description:
              "Build dynamic user interfaces through gamified learning experiences",
            nodes: 15,
            difficulty: "Intermediate",
            theme: "Desert Oasis",
          },
          {
            title: "TypeScript Mastery",
            description:
              "Add type safety while exploring frozen learning landscapes",
            nodes: 10,
            difficulty: "Advanced",
            theme: "Tundra Peaks",
          },
        ].map((mapData, index) => (
          <Card
            key={index}
            className="bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-lg transition-all duration-300 group hover:scale-105"
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg text-white group-hover:text-primary transition-colors">
                  {mapData.title}
                </CardTitle>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Map className="h-4 w-4" />
                  <span>{mapData.nodes}</span>
                </div>
              </div>
              <CardDescription className="text-gray-400">
                {mapData.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Badge
                    variant={
                      mapData.difficulty === "Beginner"
                        ? "default"
                        : mapData.difficulty === "Intermediate"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-xs"
                  >
                    {mapData.difficulty}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Sparkles className="h-3 w-3" />
                    <span>{mapData.theme}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button
          asChild
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
        >
          <Link href="/map" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Start Your Learning Journey
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-sm text-gray-500 mt-4">
          Sign up to track your progress and unlock achievements
        </p>
      </div>
    </section>
  );
}

// TCAS Semantic Explorer Preview
function TCASPreview() {
  return (
    <section className="container py-16 px-4 md:px-6 bg-gradient-to-b from-black/50 to-blue-900/20">
      <div className="grid gap-10 lg:grid-cols-2 items-center">
        <div className="space-y-4">
          <Badge variant="outline" className="text-blue-400 border-blue-400/30">
            New Feature
          </Badge>
          <h2 className="text-3xl font-bold tracking-tighter text-white sm:text-4xl">
            TCAS Semantic Explorer
          </h2>
          <p className="text-xl text-gray-400">
            Visualize over 4,000 university programs in a semantic map. 
            Discover related fields of study and explore academic pathways 
            using advanced AI embeddings.
          </p>
          <div className="flex flex-col gap-2 min-[400px]:flex-row">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Link href="/tcas/visualizer">
                Explore the Map
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="relative aspect-video rounded-xl border border-white/10 bg-white/5 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 group-hover:opacity-50 transition-opacity" />
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <Sparkles className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <div className="text-sm font-medium text-gray-300">Interactive Semantic Visualization</div>
              <div className="text-xs text-gray-500">Powered by BAAI/bge-m3 Embeddings</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Robust check for anonymous users
  const isAnonymous =
    user?.is_anonymous === true ||
    user?.app_metadata?.provider === "anonymous" ||
    user?.aud === "anonymous" ||
    false;

  // Check if logged-in user has completed their profile
  console.log("HOME PAGE USER OBJECT:", JSON.stringify(user, null, 2));
  if (user && !isAnonymous) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, username, date_of_birth")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profileData?.full_name ||
      !profileData?.username ||
      !profileData?.date_of_birth
    ) {
      // Profile incomplete, redirect to finish profile
      redirect("/auth/finish-profile");
    }

    // Profile complete, redirect to /me
    redirect("/me");
  }

  return (
    <>
      {user && !isAnonymous ? (
        <DashboardHome user={user} />
      ) : (
        <LandingPageWrapper>
          <LearningMapsPreview />
          <TCASPreview />
        </LandingPageWrapper>
      )}
    </>
  );
}
