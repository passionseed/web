import { Skeleton } from "@/components/ui/skeleton";
import { Compass } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      {/* Hero Header Skeleton */}
      <div className="bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900 text-white border-b border-blue-800/50">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-blue-400/30">
                <Compass className="h-5 w-5 text-blue-300" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Learning Maps
              </h1>
            </div>
            <Skeleton className="h-10 w-32 bg-blue-800/30" />
          </div>
        </div>
      </div>

      {/* Maps Grid Skeleton */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 bg-blue-800/30 rounded" />
            <Skeleton className="h-8 w-48 bg-blue-800/30" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex flex-col space-y-3">
                <Skeleton className="aspect-square w-full rounded-lg bg-blue-800/30" />
                <Skeleton className="h-4 w-3/4 bg-blue-800/30" />
                <Skeleton className="h-3 w-1/2 bg-blue-800/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
