import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass, Plus, LogIn } from "lucide-react";

interface HeroHeaderProps {
  isAuthenticated: boolean;
  onCreateMap: () => void;
}

export function HeroHeader({ isAuthenticated, onCreateMap }: HeroHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900 text-white border-b border-blue-800/50">
      <div className="container mx-auto px-6 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-blue-400/30">
              <Compass className="h-8 w-8 text-blue-300" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Learning Maps
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-blue-200 mb-8">
            Navigate through gamified learning adventures
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="bg-blue-800/50 hover:bg-blue-700/60 backdrop-blur-sm border-blue-400/30 text-blue-100"
              onClick={isAuthenticated ? undefined : onCreateMap}
            >
              {isAuthenticated ? (
                <Link href="/map/new" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Map
                </Link>
              ) : (
                <div className="flex items-center gap-2 cursor-pointer">
                  <LogIn className="h-4 w-4" />
                  Login to Create Maps
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}