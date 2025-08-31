"use client";

import { useEffect, useState } from "react";
import {
  enrollUserInMap,
  isUserEnrolledInMap,
} from "@/lib/api/enrollment-client";
import { useToast } from "@/components/ui/use-toast";
import { MapWelcomeDialog } from "./MapWelcomeDialog";
import { LearningMap } from "@/types/map";

interface MapEnrollmentTrackerProps {
  map: LearningMap & {
    node_count?: number;
    avg_difficulty?: number;
    total_assessments?: number;
  };
  children: React.ReactNode;
}

export function MapEnrollmentTracker({
  map,
  children,
}: MapEnrollmentTrackerProps) {
  const [isCheckingEnrollment, setIsCheckingEnrollment] = useState(true);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [justEnrolled, setJustEnrolled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkAndEnrollUser = async () => {
      try {
        console.log("🔍 [MapEnrollmentTracker] Checking enrollment for map:", map.id);
        
        // Check if user is already enrolled
        const isEnrolled = await isUserEnrolledInMap(map.id);
        console.log("✅ [MapEnrollmentTracker] Enrollment check result:", isEnrolled);

        if (!isEnrolled) {
          console.log("🎯 [MapEnrollmentTracker] User not enrolled, attempting auto-enrollment");
          
          // Automatically enroll the user
          const enrollmentSuccess = await enrollUserInMap(map.id);
          
          if (enrollmentSuccess) {
            console.log("✅ [MapEnrollmentTracker] Auto-enrollment successful");
            setJustEnrolled(true);
            setShowWelcomeDialog(true);

            toast({
              title: "🎉 Welcome to Your Adventure!",
              description: `You've been enrolled in ${map.title}. Let the learning begin!`,
            });
          } else {
            console.warn("⚠️ [MapEnrollmentTracker] Auto-enrollment failed, but continuing");
            // Don't show error to user, just continue - they can still view the map
          }
        } else {
          console.log("✅ [MapEnrollmentTracker] User already enrolled, no action needed");
        }
      } catch (error) {
        // If there's an error (e.g., user not logged in), silently continue
        // The enrollment will be handled through the proper flow
        console.warn("⚠️ [MapEnrollmentTracker] Auto-enrollment error:", error);
        
        // Check if it's an authentication error
        if (error instanceof Error && error.message.includes('401')) {
          console.log("🔐 [MapEnrollmentTracker] Authentication required - user needs to log in");
        }
      } finally {
        setIsCheckingEnrollment(false);
      }
    };

    checkAndEnrollUser();
  }, [map.id, map.title, toast]);

  // Don't show the welcome dialog if we came from the enrollment dialog
  // (to avoid double dialogs)
  useEffect(() => {
    if (justEnrolled) {
      // Check if we just came from the maps page (where enrollment dialog was shown)
      const referrer = document.referrer;
      const isFromMapsPage =
        referrer.includes("/map") && !referrer.includes("/map/");

      if (isFromMapsPage) {
        // Don't show welcome dialog if user just came from maps page
        setShowWelcomeDialog(false);
      }
    }
  }, [justEnrolled]);

  return (
    <>
      {children}

      {/* Welcome dialog for first-time visitors */}
      <MapWelcomeDialog
        isOpen={showWelcomeDialog}
        onOpenChange={setShowWelcomeDialog}
        map={map}
      />
    </>
  );
}
