"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function MapError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Map page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-red-600 mb-4">
            Map Loading Error
          </h1>
          <p className="text-muted-foreground mb-4">
            We couldn't load this learning map. This could be due to:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 mb-6">
            <li>• The map might not exist or has been deleted</li>
            <li>• You may not have permission to access this map</li>
            <li>• There's a temporary network or server issue</li>
          </ul>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <p className="text-red-800 mb-4">
            {error.message || "An unexpected error occurred while loading the map."}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset}>
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/map"}
            >
              Browse Maps
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/"}
            >
              Home
            </Button>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          <p>If this error persists, please contact support.</p>
          {error.digest && <p className="mt-1">Error ID: {error.digest}</p>}
        </div>
      </div>
    </div>
  );
}