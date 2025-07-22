import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-purple-950 via-violet-900 to-red-700">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-white">
              Discover Your Passion, Ignite Your Potential
            </h1>
            <p className="mx-auto max-w-[700px] text-white md:text-xl">
              Join a community of like-minded individuals who are passionate
              about personal growth and helping others.
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
              <Link href="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
