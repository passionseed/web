import { ScanSearch, Hammer, Award, Mail, Phone, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";

export default function PitchPage() {
  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-white font-sans antialiased relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-pink-500/10 rounded-full blur-[128px]" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

      {/* Main Content Container - Fixed height for 1080p */}
      <div className="relative z-10 h-full flex flex-col px-12 py-8">
        {/* Header */}
        <header className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Image
              src="/passionseed-logo.svg"
              alt="PassionSeed Logo"
              width={60}
              height={60}
              className="brightness-0 invert drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
            />
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              PassionSeed
            </span>
          </h1>
          <p className="text-lg text-gray-400 font-medium">
            The AI Co-Pilot for Student Success
          </p>
        </header>

        {/* Main Grid - 3 columns for steps */}
        <main className="flex-grow grid grid-cols-12 gap-6 mb-6">
          {/* Left: 3 Steps in columns */}
          <div className="col-span-9 grid grid-cols-3 gap-4">
            {/* Step 1: Discover */}
            <div className="flex flex-col">
              <div className="flex-shrink-0 mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 shadow-xl flex items-center justify-center mb-2">
                  <ScanSearch className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-purple-400">
                  Extract Latent Skills
                </h3>
              </div>

              {/* Image Placeholder */}
              <div className="flex-grow bg-white/5 border border-white/10 rounded-xl mb-3 flex items-center justify-center min-h-[200px]">
                <span className="text-gray-500 text-sm">Image Placeholder</span>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed">
                AI-driven analysis of student routines to uncover hidden
                passions and technical strengths.
              </p>
            </div>

            {/* Step 2: Build */}
            <div className="flex flex-col">
              <div className="flex-shrink-0 mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 shadow-xl flex items-center justify-center mb-2">
                  <Hammer className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-blue-400">
                  Agentic Milestones & Mentorship
                </h3>
              </div>

              {/* Image Placeholder */}
              <div className="flex-grow bg-white/5 border border-white/10 rounded-xl mb-3 flex items-center justify-center min-h-[200px]">
                <span className="text-gray-500 text-sm">Image Placeholder</span>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed">
                Agentic AI assigns high-impact projects supported by alumni
                mentors from our global programs.
              </p>
            </div>

            {/* Step 3: Validate */}
            <div className="flex flex-col">
              <div className="flex-shrink-0 mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 shadow-xl flex items-center justify-center mb-2">
                  <Award className="w-6 h-6 text-pink-400" />
                </div>
                <h3 className="text-lg font-bold text-pink-400">
                  The Holistic Edge
                </h3>
              </div>

              {/* Image Placeholder */}
              <div className="flex-grow bg-white/5 border border-white/10 rounded-xl mb-3 flex items-center justify-center min-h-[200px]">
                <span className="text-gray-500 text-sm">Image Placeholder</span>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed">
                Verified, high-signal portfolios bridging Thailand to top-tier
                US/Global destinations.
              </p>
            </div>
          </div>

          {/* Right: Validation Metrics */}
          <div className="col-span-3 flex flex-col">
            <Card className="bg-white/5 border-white/10 flex-grow">
              <CardHeader className="pb-3">
                <Badge
                  variant="outline"
                  className="w-fit mb-2 border-purple-500/50 text-purple-400 text-xs"
                >
                  Validation
                </Badge>
                <CardTitle className="text-white text-lg">
                  Proven Track Record
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <h3 className="font-bold text-white text-sm">
                      1000+ Alumni Community
                    </h3>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed pl-4 border-l-2 border-white/10">
                    Active student alumni network in Discord.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <h3 className="font-bold text-white text-sm">
                      Piloting in Thailand
                    </h3>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed pl-4 border-l-2 border-white/10">
                    Currently piloting with 2 schools in Thailand.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <h3 className="font-bold text-white text-sm">$5B Market</h3>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed pl-4 border-l-2 border-white/10">
                    Targeting the Independent Educational Consultant (IEC)
                    market.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Bottom Bar: This Semester's Goal & Contact */}
        <footer className="border-t border-white/10 pt-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Left: This Semester's Goal */}
            <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 text-lg">
                  ★
                </span>
                <h3 className="font-bold text-base">
                  This Semester&apos;s Goal
                </h3>
              </div>
              <p className="text-gray-300 text-sm">
                Validate and pilot with 1 school in Berkeley
              </p>
            </div>

            {/* Right: Contact Information */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
              <h3 className="font-bold text-base mb-2">Get in Touch</h3>
              <div className="space-y-1 text-sm">
                <Link
                  href="https://passionseed.org"
                  target="_blank"
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span>passionseed.org</span>
                </Link>
                <a
                  href="tel:+15103459135"
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>+1 510 345 9135</span>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
