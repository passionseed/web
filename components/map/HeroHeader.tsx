import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Compass, Plus, LogIn, Search } from "lucide-react";

interface HeroHeaderProps {
  isAuthenticated: boolean;
  onCreateMap: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function HeroHeader({ isAuthenticated, onCreateMap, searchQuery = "", onSearchChange }: HeroHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900 text-white border-b border-blue-800/50">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-blue-400/30">
              <Compass className="h-5 w-5 text-blue-300" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Learning Maps
            </h1>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300" />
              <Input
                type="text"
                placeholder="Search learning maps..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-10 bg-blue-900/30 border-blue-700/50 text-white placeholder:text-blue-300/60 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <Button
            size="default"
            variant="secondary"
            className="bg-blue-800/50 hover:bg-blue-700/60 backdrop-blur-sm border-blue-400/30 text-blue-100 whitespace-nowrap"
            onClick={isAuthenticated ? undefined : onCreateMap}
          >
            {isAuthenticated ? (
              <Link href="/map/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Map
              </Link>
            ) : (
              <div className="flex items-center gap-2 cursor-pointer">
                <LogIn className="h-4 w-4" />
                Login
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}