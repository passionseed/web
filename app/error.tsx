"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);

    // Transient WebSocket/realtime errors from Supabase — auto-reset instead of
    // showing the crash page. The connection will recover on its own.
    const isConnectionError =
      error.message === "Connection closed." ||
      error.message?.includes("Connection closed") ||
      error.message?.includes("WebSocket");

    if (isConnectionError) {
      reset();
    }
  }, [error, reset]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Something went wrong!
          </h2>
          <p className="text-gray-600 mb-4">
            We encountered an unexpected error. Please try again.
          </p>
          {error.digest && (
            <p className="text-sm text-gray-500 mb-4">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        
        <div className="space-y-3">
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = "/"}
            className="w-full"
          >
            Go to homepage
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 mb-2">
              Error Details (Development Only)
            </summary>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}