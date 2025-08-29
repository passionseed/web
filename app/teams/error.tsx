"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function TeamsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Teams page error:", error);
  }, [error]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-red-600 mb-4">
            Teams Loading Error
          </h1>
          <p className="text-muted-foreground">
            We couldn't load your teams data. This might be due to a network issue or server problem.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <p className="text-red-800 mb-4">
            {error.message || "An unexpected error occurred while loading your teams."}
          </p>
          
          <div className="space-y-3">
            <Button onClick={reset} className="w-full sm:w-auto">
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/classrooms"}
              className="w-full sm:w-auto ml-0 sm:ml-3"
            >
              Go to Classrooms
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