import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Flame, Users, BookOpen } from "lucide-react";

export function FeatureSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-red-700 to-purple-950">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-white">
              Nurture Your Passions
            </h2>
            <p className="max-w-[900px] text-white md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Passion Seed provides the tools and community you need to develop
              your skills and interests.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
          <Card className="bg-white/10 backdrop-blur-sm border-none text-white">
            <CardHeader>
              <Flame className="h-10 w-10 text-red-400" />
              <CardTitle>Discover Interests</CardTitle>
              <CardDescription className="text-white/80">
                Explore new passions and interests through our guided discovery
                process.
              </CardDescription>
            </CardHeader>
            <CardContent>
              Our platform helps you identify and nurture your natural interests
              and talents.
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-none text-white">
            <CardHeader>
              <Users className="h-10 w-10 text-red-400" />
              <CardTitle>Join Communities</CardTitle>
              <CardDescription className="text-white/80">
                Connect with others who share your passions and interests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              Engage with supportive communities that help you grow and develop
              your skills.
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-none text-white">
            <CardHeader>
              <BookOpen className="h-10 w-10 text-red-400" />
              <CardTitle>Attend Workshops</CardTitle>
              <CardDescription className="text-white/80">
                Learn from experts and peers in interactive workshop sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              Develop your skills through hands-on workshops designed to
              accelerate your growth.
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
