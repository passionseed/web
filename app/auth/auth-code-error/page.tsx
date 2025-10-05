import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

function AuthCodeErrorContent({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const error = searchParams?.error as string;
  const errorDescription = searchParams?.error_description as string;
  const details = searchParams?.details as string;
  
  const getErrorMessage = () => {
    switch (error) {
      case 'profile_creation_failed':
        if (details === 'fallback_failed') {
          return 'Both automatic and manual profile creation failed. This may be a database permissions issue.';
        }
        return 'Failed to create user profile. Our system will attempt to create it automatically on retry.';
      case 'profile_fetch_failed':
        return 'Unable to retrieve user profile information. The profile may have been created but cannot be accessed.';
      case 'server_error':
        return errorDescription || 'A server error occurred during authentication.';
      default:
        return 'An unexpected error occurred during the authentication process.';
    }
  };

  const getErrorTitle = () => {
    switch (error) {
      case 'profile_creation_failed':
      case 'profile_fetch_failed':
        return 'Profile Error';
      case 'server_error':
        return 'Server Error';
      default:
        return 'Authentication Error';
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
          {getErrorTitle()}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {getErrorMessage()}
        </p>
      </div>
      
      <div className="rounded-md bg-destructive/10 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-destructive">
              Possible causes:
            </h3>
            <div className="mt-2 text-sm text-destructive/80">
              <ul className="list-disc space-y-1 pl-5">
                <li>Your authentication link may have expired</li>
                <li>The link may have been used already</li>
                <li>There was a database connection issue</li>
                {error === 'profile_creation_failed' && (
                  <li>Database permissions may need to be updated</li>
                )}
                {details && (
                  <li>Technical details: {decodeURIComponent(details)}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Button asChild className="w-full">
          <Link href="/login">
            Try Again
          </Link>
        </Button>
        
        <Button variant="outline" asChild className="w-full">
          <Link href="/">
            Go Home
          </Link>
        </Button>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          If this problem persists, please{" "}
          <Link href="/contact" className="font-medium text-primary hover:underline">
            contact support
          </Link>
        </p>
      </div>
    </div>
  );
}

export default async function AuthCodeErrorPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParamsResolved = await searchParams;
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <AuthCodeErrorContent searchParams={searchParamsResolved} />
    </div>
  );
}