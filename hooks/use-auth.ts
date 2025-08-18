import { useState, useEffect } from "react";
import {
  checkClientAuth,
  type AuthWithRoleResult,
  type UserRole,
} from "@/lib/supabase/auth-client";

/**
 * React hook for authentication with optional role checking
 * Usage:
 * const { user, isAuthenticated, loading } = useAuth();
 * const { user, isAuthenticated, hasRole, loading } = useAuth('instructor');
 */
export function useAuth(requiredRole?: UserRole) {
  const [authState, setAuthState] = useState<
    AuthWithRoleResult & { loading: boolean }
  >({
    user: null,
    isAuthenticated: false,
    hasRole: undefined,
    userRoles: undefined,
    loading: true,
    error: undefined,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await checkClientAuth(requiredRole);
        setAuthState({
          ...result,
          loading: false,
        });
      } catch (error) {
        console.error("Auth hook error:", error);
        setAuthState({
          user: null,
          isAuthenticated: false,
          hasRole: false,
          userRoles: undefined,
          loading: false,
          error: "Authentication check failed",
        });
      }
    };

    checkAuth();
  }, [requiredRole]);

  return authState;
}

/**
 * Hook specifically for checking if user is authenticated (no role check)
 */
export function useAuthState() {
  return useAuth();
}

/**
 * Hook for checking instructor role
 */
export function useInstructor() {
  return useAuth("instructor");
}

/**
 * Hook for checking TA role
 */
export function useTA() {
  return useAuth("TA");
}

/**
 * Hook for checking admin role
 */
export function useAdmin() {
  return useAuth("admin");
}
