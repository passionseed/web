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
    <div className="relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent" />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px]" />

      {/* Border with gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="relative container mx-auto px-6 py-6">
        <div className="flex items-center justify-between gap-8">
          {/* Logo and Title */}
          <div className="flex items-center gap-4 min-w-fit">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-300" />
              <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/10 shadow-lg">
                <Compass className="h-6 w-6 text-blue-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                Learning Maps
              </h1>
              <p className="text-xs text-gray-400 mt-0.5 tracking-wide">
                Discover • Learn • Master
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-300" />
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400/70 group-hover:text-blue-400 transition-colors" />
                <Input
                  type="text"
                  placeholder="Search by title, description, or category..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="pl-11 pr-4 h-11 bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-lg backdrop-blur-xl transition-all"
                />
              </div>
            </div>
          </div>

          {/* Create Map Button */}
          <Button
            size="default"
            className="relative h-11 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 whitespace-nowrap font-medium"
            onClick={isAuthenticated ? undefined : onCreateMap}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 hover:opacity-100 transition-opacity rounded-md" />
            {isAuthenticated ? (
              <Link href="/map/new" className="flex items-center gap-2 relative z-10">
                <Plus className="h-4 w-4" />
                Create Map
              </Link>
            ) : (
              <div className="flex items-center gap-2 cursor-pointer relative z-10">
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