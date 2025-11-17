"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Star,
  Users,
  Target,
  TrendingUp,
  Heart,
  Lightbulb,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  const stats = [
    {
      icon: Users,
      value: "2,000+",
      label: "Students Reached",
      description: "Empowering learners worldwide",
    },
    {
      icon: Star,
      value: "50+",
      label: "Organizations Partnered",
      description: "Growing our educational network",
    },
    {
      icon: Target,
      value: "89%",
      label: "Purpose Discovery Rate",
      description: "Students finding their calling",
    },
    {
      icon: TrendingUp,
      value: "95%",
      label: "Student Satisfaction",
      description: "Consistently high ratings",
    },
  ];

  const features = [
    {
      icon: Lightbulb,
      title: "Self-Discovery",
      description: "Guided reflection tools help students uncover their passions and strengths through structured activities.",
    },
    {
      icon: Target,
      title: "Goal Setting",
      description: "Transform discoveries into actionable goals with our milestone-based journey mapping system.",
    },
    {
      icon: Users,
      title: "Community Learning",
      description: "Connect with peers, mentors, and educators in collaborative learning environments.",
    },
    {
      icon: Sparkles,
      title: "Real-World Application",
      description: "Bridge the gap between classroom learning and career readiness through practical projects.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-purple-950 via-violet-900 to-red-700">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-white">
                  Passion Seed
                </h1>
                <p className="mx-auto max-w-[700px] text-white md:text-xl">
                  Turn their daily routine into meaningful activities and build a fulfilling future.
                </p>
              </div>
              <div className="space-x-4">
                <Button asChild size="lg" className="bg-red-600 hover:bg-red-700">
                  <Link href="/login">Get Started</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-white border-white hover:bg-white/10"
                >
                  <Link href="/map">Explore Learning Maps</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Vision & Mission Section */}
        <section className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter mb-4">
              Empowering Student Discovery
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our mission is to help students find their path through reflection, exploration, and purposeful learning
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-2xl">Our Vision</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  A generation of students who live with purpose—turning everyday routines into meaningful journeys toward a fulfilling life.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Heart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-2xl">Our Mission</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  We empower students to design their own life journey through interactive goal maps that guide reflection, growth, and discovery of what truly matters beyond social expectations.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-7xl bg-muted/30">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter mb-4">
              How We Support Students
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive platform provides the tools and guidance needed for meaningful self-discovery
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-all duration-300 group">
                <CardHeader>
                  <div className="mx-auto p-3 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-xl mb-4 w-fit group-hover:scale-110 transition-transform">
                    <feature.icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Impact/Stats Section */}
        <section className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter mb-4">
              Our Impact
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Making a difference in students' lives across the globe
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-all duration-300 group">
                <CardHeader className="pb-2">
                  <div className="mx-auto p-3 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-xl mb-4 w-fit group-hover:scale-110 transition-transform">
                    <stat.icon className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-4xl font-bold text-primary">{stat.value}</div>
                  <div className="text-lg font-semibold">{stat.label}</div>
                  <CardDescription className="text-sm">
                    {stat.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-16 bg-gradient-to-r from-blue-600 via-purple-600 to-red-600">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter text-white">
                  Ready to Start Your Journey?
                </h2>
                <p className="mx-auto max-w-[600px] text-white/90 md:text-xl">
                  Join thousands of students who have discovered their purpose and built meaningful careers
                </p>
              </div>
              <div className="space-x-4">
                <Button asChild size="lg" className="bg-white text-purple-600 hover:bg-white/90">
                  <Link href="/login" className="flex items-center gap-2">
                    Get Started Today
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-white border-white hover:bg-white/10"
                >
                  <Link href="/contact">Contact Us</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}