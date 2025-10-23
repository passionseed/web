import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-screen flex-col bg-slate-950">
      {/* Header skeleton */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4 sticky top-0 z-20">
        <div className="container mx-auto max-w-7xl flex items-center justify-between gap-4">
          {/* Back button skeleton */}
          <div className="w-24 h-9 bg-slate-800 rounded-md animate-pulse" />

          {/* Breadcrumb skeleton - hidden on mobile */}
          <div className="hidden md:flex gap-2">
            <div className="w-20 h-4 bg-slate-800 rounded animate-pulse" />
            <div className="w-4 h-4 bg-slate-700 rounded animate-pulse" />
            <div className="w-24 h-4 bg-slate-700 rounded animate-pulse" />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Title skeleton - mobile only */}
          <div className="md:hidden w-32 h-6 bg-slate-800 rounded-md animate-pulse" />
        </div>
      </header>

      {/* Main content - journey map loading skeleton */}
      <main className="flex-1 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-8 text-center">
          {/* Animated loading spinner */}
          <div className="relative">
            <div className="absolute inset-0 animate-spin">
              <div className="w-20 h-20 border-4 border-slate-700 border-t-blue-400 rounded-full" />
            </div>
            <div className="w-20 h-20 flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-blue-400/60 animate-pulse" />
            </div>
          </div>

          {/* Loading text skeleton */}
          <div className="space-y-3 w-48">
            <div className="h-6 bg-slate-700 rounded-md animate-pulse" />
            <div className="h-4 bg-slate-800 rounded-md animate-pulse w-3/4 mx-auto" />
          </div>

          {/* Shimmer effect elements */}
          <div className="mt-8 grid grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-16 h-16 bg-slate-700/50 rounded-lg animate-pulse"
                style={{
                  animation: `pulse ${1.5 + i * 0.3}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                }}
              />
            ))}
          </div>

          {/* Decorative shimmer lines */}
          <div className="mt-8 space-y-2 opacity-30">
            <div className="h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full animate-pulse" style={{ width: "200px" }} />
            <div className="h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent rounded-full animate-pulse" style={{ width: "160px", marginLeft: "20px" }} />
          </div>
        </div>
      </main>
    </div>
  );
}
