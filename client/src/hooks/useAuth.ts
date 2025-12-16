import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";

/**
 * Auth state interface returned by the useAuth hook
 */
interface AuthState {
  /** Current authenticated user, null if not logged in */
  user: User | null;
  /** True if user is authenticated, false if not, null if still loading */
  isLoggedIn: boolean | null;
  /** True while checking initial auth state */
  isLoading: boolean;
  /** Sign out the current user */
  logout: () => Promise<void>;
}

/**
 * Custom hook for managing authentication state.
 * Centralizes auth logic to avoid repetition across components.
 * Automatically subscribes to auth state changes.
 */
export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Signs out the current user
   */
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    user,
    isLoggedIn: isLoading ? null : !!user,
    isLoading,
    logout,
  };
};

export default useAuth;
