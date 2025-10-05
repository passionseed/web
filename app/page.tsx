import { HeroSection } from "@/components/hero-section";
import { FeatureSection } from "@/components/feature-section";
import { WorkshopCategories } from "@/components/workshop-categories";
import { CommunitySection } from "@/components/community-section";
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

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if logged-in user has completed their profile
  if (user) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, username, date_of_birth")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData?.full_name || !profileData?.username || !profileData?.date_of_birth) {
      // Profile incomplete, redirect to finish profile
      redirect("/auth/finish-profile");
    }
  }

  // Learning Maps Preview Component for non-logged-in users
  const LearningMapsPreview = () => (
    <section className="container py-16 px-4 md:px-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tighter mb-4">
          Interactive Learning Maps
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
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
            className="hover:shadow-lg transition-all duration-300 group hover:scale-105"
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {mapData.title}
                </CardTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Map className="h-4 w-4" />
                  <span>{mapData.nodes}</span>
                </div>
              </div>
              <CardDescription>{mapData.description}</CardDescription>
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
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Link href="/map" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Start Your Learning Journey
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground mt-4">
          Sign up to track your progress and unlock achievements
        </p>
      </div>
    </section>
  );

  return (
    <>
      {user ? (
        <>
          <DashboardHome user={user} />
          <HeroSection />
          <FeatureSection />
          <WorkshopCategories />
          <CommunitySection />
        </>
      ) : (
        <>
          <HeroSection />
          <LearningMapsPreview />
          <FeatureSection />
          <WorkshopCategories />
          <CommunitySection />
        </>
      )}
    </>
  );
}
