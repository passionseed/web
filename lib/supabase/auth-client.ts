import { createClient } from "@/utils/supabase/client";

// Types for auth utilities
export type UserRole = "instructor" | "TA" | "student";

export interface AuthResult {
  user: any | null;
  isAuthenticated: boolean;
  error?: string;
}

export interface AuthWithRoleResult extends AuthResult {
  hasRole?: boolean;
  userRoles?: UserRole[];
}

/**
 * Client-side authentication check with optional role validation
 */
export const checkClientAuth = async (
  requiredRole?: UserRole
): Promise<AuthWithRoleResult> => {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        isAuthenticated: false,
        hasRole: false,
        error: error?.message || "Not authenticated",
      };
    }

    // If no role required, return basic auth result
    if (!requiredRole) {
      return {
        user,
        isAuthenticated: true,
        hasRole: true,
      };
    }

    // Check user roles
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) {
      console.error("Error checking user roles:", roleError);
      return {
        user,
        isAuthenticated: true,
        hasRole: false,
        error: "Failed to check user roles",
      };
    }

    const userRoles = roles?.map((r) => r.role as UserRole) || [];
    const hasRole = userRoles.includes(requiredRole);

    return {
      user,
      isAuthenticated: true,
      hasRole,
      userRoles,
    };
  } catch (error) {
    console.error("Client auth check failed:", error);
    return {
      user: null,
      isAuthenticated: false,
      hasRole: false,
      error: "Authentication check failed",
    };
  }
};

/**
 * Get all roles for a user (client-side)
 */
export const getUserRolesClient = async (
  userId: string
): Promise<UserRole[]> => {
  try {
    const supabase = createClient();
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user roles:", error);
      return [];
    }

    return roles?.map((r) => r.role as UserRole) || [];
  } catch (error) {
    console.error("Failed to get user roles:", error);
    return [];
  }
};
