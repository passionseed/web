import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Users,
  BookOpen,
  ArrowRight,
  Sparkles,
  Heart,
} from "lucide-react";
import Link from "next/link";

interface DashboardHomeProps {
  user: any;
}

export function DashboardHome({ user }: DashboardHomeProps) {
  return (
    <div className="container py-10 px-4 md:px-6">
      {/* Welcome Section */}
      <div className="mb-12">
        <div className="flex flex-col space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome back, {user?.user_metadata?.name || "Passion Explorer"}! 🌱
          </h1>
          <p className="text-xl text-muted-foreground">
            Let's nurture your passion tree and watch it grow
          </p>
        </div>
        <div className="mt-6">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-700 hover:to-red-700"
          >
            <Link href="/me" className="flex items-center gap-2">
              See Your Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3 mb-12">
        <Card className="bg-gradient-to-br from-purple-950 to-violet-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <Flame className="mr-2 h-5 w-5 text-red-400" />
              Passion Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Growth Progress</span>
                <span>75%</span>
              </div>
              <Progress value={75} className="h-2 bg-white/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-900 to-purple-800 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <BookOpen className="mr-2 h-5 w-5 text-yellow-400" />
              Learning Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Streak</span>
                <span>5 days</span>
              </div>
              <Progress value={50} className="h-2 bg-white/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-800 to-violet-700 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <Users className="mr-2 h-5 w-5 text-blue-400" />
              Community Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Contributions</span>
                <span>12</span>
              </div>
              <Progress value={60} className="h-2 bg-white/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Workshops */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Workshops for You
          </h2>
          <Button variant="ghost" asChild>
            <Link href="/workshops" className="flex items-center gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Advanced JavaScript Patterns",
              description: "Master modern JavaScript techniques",
              category: "Build",
              date: "Starting in 2 days",
            },
            {
              title: "Creative UI Design",
              description: "Learn the principles of beautiful design",
              category: "Inspire",
              date: "Starting tomorrow",
            },
            {
              title: "Community Leadership",
              description: "Become an effective community leader",
              category: "Scale",
              date: "Starting next week",
            },
          ].map((workshop, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{workshop.title}</CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      workshop.category === "Inspire"
                        ? "bg-yellow-600 text-white border-none"
                        : workshop.category === "Build"
                          ? "bg-orange-600 text-white border-none"
                          : "bg-red-600 text-white border-none"
                    }
                  >
                    {workshop.category}
                  </Badge>
                </div>
                <CardDescription>{workshop.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{workshop.date}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Discover Communities */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Discover Communities
          </h2>
          <Button variant="ghost" asChild>
            <Link href="/communities" className="flex items-center gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              name: "JavaScript Developers",
              members: 1250,
              description: "Share knowledge and build amazing things together",
              tag: "Technology",
            },
            {
              name: "Creative Designers",
              members: 980,
              description: "Explore design principles and share your work",
              tag: "Design",
            },
            {
              name: "Community Builders",
              members: 750,
              description: "Learn how to build and grow communities",
              tag: "Leadership",
            },
          ].map((community, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{community.name}</CardTitle>
                  <Badge variant="secondary">{community.tag}</Badge>
                </div>
                <CardDescription>{community.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{community.members.toLocaleString()} members</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
