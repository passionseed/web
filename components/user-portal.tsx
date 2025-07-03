import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Star, Users, BookOpen, Award, Heart, Leaf } from "lucide-react";
import Link from "next/link";
import { Project } from "@/types/project";

interface UserPortalProps {
  dashboardData: {
    projects: Project[];
    reflectionStreak: number;
    workshops: any[];
  };
}

export function UserPortal({ dashboardData }: UserPortalProps) {
  const { projects, reflectionStreak, workshops } = dashboardData;

  const getProgressColor = (level: number) => {
    if (level >= 80) return "bg-green-500";
    if (level >= 60) return "bg-blue-500";
    if (level >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="container py-10 px-4 md:px-6">
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Your Passion Portal</h1>
          <p className="text-muted-foreground">Track your projects, reflections, and workshops.</p>
        </div>

        <Link href="/me/reflection" className="block mb-8">
          <Card className="bg-gradient-to-r from-green-800 to-emerald-700 hover:from-green-700 hover:to-emerald-600 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Reflection Journey</h3>
                <p className="text-white/80">You have a {reflectionStreak}-day reflection streak! Keep it up.</p>
              </div>
              <Heart className="h-12 w-12 text-red-300" />
            </CardContent>
          </Card>
        </Link>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-1 bg-gradient-to-br from-purple-950 to-violet-900 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Flame className="mr-2 h-5 w-5 text-red-400" />
                Your Projects
              </CardTitle>
              <CardDescription className="text-white/70">Projects you're currently working on</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.map((project, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{project.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {project.tags.map(tag => (
                            <Badge key={tag.id} style={{ backgroundColor: tag.color }}>{tag.name}</Badge>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 bg-gradient-to-br from-violet-900 to-purple-800 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Star className="mr-2 h-5 w-5 text-yellow-400" />
                Your Skills
              </CardTitle>
              <CardDescription className="text-white/70">Skills you're developing</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder for skills */}
              <p className="text-white/70">Coming soon...</p>
            </CardContent>
          </Card>

          <Link href="/me/reflection/new" className="col-span-1 md:col-span-2 lg:col-span-1">
            <Card className="bg-gradient-to-br from-purple-800 to-violet-700 text-white hover:from-purple-700 hover:to-violet-600 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Heart className="mr-2 h-5 w-5 text-red-400" />
                  Add a Reflection
                </CardTitle>
                <CardDescription className="text-white/70">Reflect on your progress</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-red-600 hover:bg-red-700">Start Reflecting</Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Tabs defaultValue="workshops" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="workshops">Workshops</TabsTrigger>
            <TabsTrigger value="communities">Communities</TabsTrigger>
          </TabsList>
          <TabsContent value="workshops">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Workshops You've Joined
                </CardTitle>
                <CardDescription>Track your learning journey through workshops</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workshops.map((workshop, index) => (
                    <div key={index} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div className="space-y-1">
                        <h4 className="font-medium">{workshop.title}</h4>
                        <p className="text-sm text-muted-foreground">{workshop.category}</p>
                      </div>
                      <Badge variant="outline">Joined</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="communities">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Your Communities
                </CardTitle>
                <CardDescription>Communities you're actively participating in</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Placeholder for communities */}
                <p>Coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
