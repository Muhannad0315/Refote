import { useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "./auth";
import { queryClient } from "./queryClient";

/**
 * Hook that checks both authentication and profile completion.
 * - If not authenticated: redirects to /signup
 * - If authenticated but profile incomplete: redirects to /profile/complete
 * - If both conditions met: returns true and allows action to proceed
 */
export function useRequireAuthAndProfile() {
  const { user, authResolved } = useAuth() as any;
  const [, setLocation] = useLocation();

  const requireAuthAndProfile = useCallback(
    async (onOk?: () => void): Promise<boolean> => {
      // Wait up to ~1500ms for auth to resolve to avoid redirecting prematurely
      const start = Date.now();
      while (!authResolved && Date.now() - start < 1500) {
        // small sleep
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 100));
      }

      // Check authentication
      if (!user) {
        setLocation("/signup");
        return false;
      }

      // Fetch profile to check if complete
      try {
        const profile = queryClient.getQueryData(["/api/profile"]) as any;

        // If profile already in cache, check completion immediately
        if (profile) {
          if (!profile.isComplete) {
            setLocation("/profile/complete");
            return false;
          }
          if (onOk) onOk();
          return true;
        }

        // Profile not in cache, fetch it
        const response = await fetch("/api/profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status}`);
        }

        const profileData = await response.json();

        // Cache the profile
        queryClient.setQueryData(["/api/profile"], profileData);

        // Check if profile is complete
        if (!profileData.isComplete) {
          setLocation("/profile/complete");
          return false;
        }

        if (onOk) onOk();
        return true;
      } catch (error) {
        console.error("Error checking profile completion:", error);
        // On error, allow proceeding - the server will handle validation
        if (onOk) onOk();
        return true;
      }
    },
    [user, authResolved, setLocation],
  );

  return requireAuthAndProfile;
}
