/**
 * Client-side enrollment functions
 * These make API calls to avoid RLS issues
 */

export interface EnrollmentResponse {
  success: boolean;
  data: any;
  message: string;
  error?: string;
}

export interface EnrollmentCheckResponse {
  success: boolean;
  data: {
    isEnrolled: boolean;
    enrollment?: any;
  };
  error?: string;
}

/**
 * Check if user is enrolled in a map
 */
export async function isUserEnrolledInMap(mapId: string): Promise<boolean> {
  try {
    console.log("🔍 [Enrollment Client] Checking enrollment for map:", mapId);

    const response = await fetch(`/api/maps/${mapId}/enrollment`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("❌ [Enrollment Client] API response not ok:", {
        status: response.status,
        statusText: response.statusText,
      });
      return false;
    }

    const result: EnrollmentCheckResponse = await response.json();

    if (!result.success) {
      console.error("❌ [Enrollment Client] API returned error:", result.error);
      return false;
    }

    console.log(
      "✅ [Enrollment Client] Enrollment check result:",
      result.data.isEnrolled
    );
    return result.data.isEnrolled;
  } catch (error) {
    console.error("❌ [Enrollment Client] Error checking enrollment:", error);
    return false;
  }
}

/**
 * Enroll user in a map
 */
export async function enrollUserInMap(mapId: string): Promise<boolean> {
  try {
    console.log("🎯 [Enrollment Client] Enrolling in map:", mapId);

    const response = await fetch(`/api/maps/${mapId}/enroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("❌ [Enrollment Client] API response not ok:", {
        status: response.status,
        statusText: response.statusText,
      });
      return false;
    }

    const result: EnrollmentResponse = await response.json();

    if (!result.success) {
      console.error("❌ [Enrollment Client] API returned error:", result.error);
      return false;
    }

    console.log(
      "✅ [Enrollment Client] Successfully enrolled:",
      result.message
    );
    return true;
  } catch (error) {
    console.error("❌ [Enrollment Client] Error enrolling in map:", error);
    return false;
  }
}
