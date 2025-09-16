"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import Link from "next/link";

export default function AuthCodeErrorPage() {
  const searchParams = useSearchParams();
  const [errorDetails, setErrorDetails] = useState({
    error: "unknown_error",
    error_code: "unexpected_failure", 
    error_description: "An unexpected error occurred during authentication"
  });

  useEffect(() => {
    const error = searchParams.get("error") || "unknown_error";
    const error_code = searchParams.get("error_code") || "unexpected_failure";
    const error_description = searchParams.get("error_description") || "An unexpected error occurred during authentication";
    
    setErrorDetails({
      error,
      error_code,
      error_description: decodeURIComponent(error_description)
    });
  }, [searchParams]);

  return (
    <div className="container py-12 max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Authentication Error</CardTitle>
          <CardDescription>
            We encountered an issue while signing you in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">Error Details:</h4>
            <div className="text-sm text-red-700 space-y-1">
              <div><strong>Error:</strong> {errorDetails.error}</div>
              <div><strong>Code:</strong> {errorDetails.error_code}</div>
              <div><strong>Description:</strong> {errorDetails.error_description}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This usually happens when there's an issue with:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Database connection</li>
              <li>• User profile creation</li>
              <li>• Authentication configuration</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button asChild className="flex-1">
              <Link href="/login">
                Try Again
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}