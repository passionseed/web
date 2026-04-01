import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Calendar, Users, Cpu } from "lucide-react";

export function HackathonPromo() {
  return (
    <div className="relative isolate overflow-hidden">
      {/* Background with thematic hackathon styling */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-background to-emerald-900/20" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(20, 184, 166, 0.08) 0%, transparent 50%)",
          }}
        />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-10" />
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-24 pt-32 sm:pt-40 lg:px-8 lg:pt-48 relative z-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-semibold text-green-400 backdrop-blur-sm">
              <Trophy className="h-4 w-4" />
              Registration Closed · 800 Participants
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl mb-6">
            The Next Decade{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
              Hackathon
            </span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            Join visionary builders and creators to shape the future of EdTech
            and Personal Growth. Build the tools that will redefine learning for
            the next generation.
          </p>

          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button
              asChild
              size="lg"
              className="bg-green-600 hover:bg-green-500 text-white font-semibold shadow-[0_0_20px_rgba(22,163,74,0.4)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(22,163,74,0.6)]"
            >
              <Link href="/hackathon">
                Discover the Hackathon
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-green-500/30 text-green-400 hover:bg-green-500/10"
            >
              <Link href="/hackathon#rules">View Rules</Link>
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3 border-t border-white/10 pt-10">
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full bg-white/5 p-3 ring-1 ring-white/10">
                <Calendar className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-white">48 Hours</p>
              <p className="text-xs text-slate-400">Intense Building</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full bg-white/5 p-3 ring-1 ring-white/10">
                <Users className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-white">100+ Builders</p>
              <p className="text-xs text-slate-400">Global Community</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full bg-white/5 p-3 ring-1 ring-white/10">
                <Cpu className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-white">$10k+ Prizes</p>
              <p className="text-xs text-slate-400">In Cash & Credits</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
