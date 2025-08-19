"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Clock } from "lucide-react";

export default function DeprecatedInterestsPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect to finish-profile page
          router.push("/auth/finish-profile");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleGoToProfile = () => {
    router.push("/auth/finish-profile");
  };

  const handleGoToDashboard = () => {
    router.push("/me");
  };

  return (
    <div className="container max-w-4xl py-10">
      <Card className="w-full max-w-2xl mx-auto shadow-lg border-orange-200">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-orange-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-orange-600">
            Page Moved
          </CardTitle>
          <CardDescription className="text-lg">
            This interests page is no longer used
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 text-center">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-800 mb-2">
              What's Changed?
            </h3>
            <p className="text-orange-700 text-sm leading-relaxed">
              Interest and skill selection is now part of the profile setup process.
              You can manage your skills and interests directly from your profile page.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-800">Auto-redirect</span>
            </div>
            <p className="text-blue-700 text-sm">
              You'll be automatically redirected to the profile setup in{" "}
              <span className="font-mono font-bold">{countdown}</span> seconds
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            If the automatic redirect doesn't work, use the buttons below:
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            onClick={handleGoToProfile}
            className="w-full"
            variant="default"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Complete Profile Setup
          </Button>
          <Button
            onClick={handleGoToDashboard}
            className="w-full"
            variant="outline"
          >
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
