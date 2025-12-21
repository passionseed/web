"use client";

import { DirectionFinderFlow } from "@/components/education/direction-finder/DirectionFinderFlow";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DirectionFinderPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </div>

        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-blue-500/10 mb-4">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-slate-400 bg-clip-text text-transparent">
            Find Your Direction
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Discover your strengths, passions, and ideal path through our
            interactive assessment.
          </p>
        </div>

        <DirectionFinderFlow
          onComplete={(result) => {
            console.log("Completed!", result);
            // Optionally redirect or show a "Done" state here
            // The flow itself handles showing results
          }}
          onCancel={() => router.push("/")}
        />
      </div>
    </div>
  );
}
