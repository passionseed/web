import { Card, CardContent } from "@/components/ui/card";

export const MapSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-20 justify-items-center animate-pulse">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="relative w-80 h-80">
          {/* Vinyl Record Skeleton */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-16 w-72 h-72">
            <div className="relative w-full h-full">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-700 via-gray-800 to-gray-700 border-4 border-gray-600 shadow-2xl">
                {/* Vinyl Grooves */}
                <div className="absolute inset-4 rounded-full border border-gray-500 opacity-40" />
                <div className="absolute inset-8 rounded-full border border-gray-500 opacity-25" />
                <div className="absolute inset-12 rounded-full border border-gray-500 opacity-15" />
                <div className="absolute inset-16 rounded-full border border-gray-500 opacity-10" />
                
                {/* Center Label */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gray-600 border-2 border-gray-500 flex items-center justify-center">
                  <div className="w-6 h-6 bg-gray-800 rounded-full" />
                </div>

                {/* Reflection */}
                <div className="absolute top-4 left-4 w-16 h-16 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-sm" />
              </div>
            </div>
          </div>

          {/* Album Cover Skeleton */}
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 rounded-lg border border-gray-600 overflow-hidden">
              
              {/* Cover Content Skeleton */}
              <div className="relative h-full flex flex-col">
                {/* Title at bottom */}
                <div className="mt-auto p-6">
                  <div className="h-8 bg-gray-600 rounded mb-2 w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded w-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};