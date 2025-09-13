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
    hasStarted?: boolean;
    enrollment?: any;
  };
  error?: string;
}

/**
 * Check if user is enrolled in a map and their progress status
 */
export async function checkUserEnrollmentStatus(mapId: string): Promise<{
  isEnrolled: boolean;
  hasStarted: boolean;
}> {
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
        url: response.url,
      });
      
      // Try to get response body for more details
      try {
        const errorText = await response.text();
        console.error("❌ [Enrollment Client] Response body:", errorText);
      } catch (e) {
        console.error("❌ [Enrollment Client] Could not read response body:", e);
      }
      
      return { isEnrolled: false, hasStarted: false };
    }

    const result: EnrollmentCheckResponse = await response.json();

    if (!result.success) {
      console.error("❌ [Enrollment Client] API returned error:", result.error);
      return { isEnrolled: false, hasStarted: false };
    }

    console.log(
      "✅ [Enrollment Client] Enrollment check result:",
      result.data
    );
    return { 
      isEnrolled: result.data.isEnrolled, 
      hasStarted: result.data.hasStarted || false 
    };
  } catch (error) {
    console.error("❌ [Enrollment Client] Error checking enrollment:", error);
    return { isEnrolled: false, hasStarted: false };
  }
}

/**
 * Check if user is enrolled in a map (backward compatibility)
 */
export async function isUserEnrolledInMap(mapId: string): Promise<boolean> {
  const { isEnrolled } = await checkUserEnrollmentStatus(mapId);
  return isEnrolled;
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
      let errorDetails: any = {};
      let responseText = "";
      let parseError: any = null;
      
      try {
        responseText = await response.text();
        console.log("🔍 [Enrollment Client] Raw response text:", responseText);
        
        if (responseText) {
          try {
            errorDetails = JSON.parse(responseText);
          } catch (parseErr) {
            parseError = parseErr;
            errorDetails = { 
              message: responseText || "Could not parse error response",
              parseError: parseErr instanceof Error ? parseErr.message : String(parseErr)
            };
          }
        } else {
          errorDetails = { message: "Empty response body" };
        }
      } catch (readErr) {
        errorDetails = { 
          message: "Could not read error response",
          readError: readErr instanceof Error ? readErr.message : String(readErr)
        };
      }
      
      console.error("❌ [Enrollment Client] API response not ok:", {
        status: response.status,
        statusText: response.statusText,
        url: `/api/maps/${mapId}/enroll`,
        mapId,
        errorDetails,
        responseText: responseText ? responseText.substring(0, 500) : "No response text",
        parseError: parseError ? (parseError instanceof Error ? parseError.message : String(parseError)) : null
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
