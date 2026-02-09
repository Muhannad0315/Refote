import { useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "./auth";

// Shared helper: waits briefly for auth to resolve, then either runs onOk or
// redirects to /signup when unauthenticated.
export function useRequireAuth() {
  const { user, authResolved } = useAuth() as any;
  const [, setLocation] = useLocation();

  const requireAuth = useCallback(
    async (onOk?: () => void): Promise<boolean> => {
      // Wait up to ~1500ms for auth to resolve to avoid redirecting prematurely
      const start = Date.now();
      while (!authResolved && Date.now() - start < 1500) {
        // small sleep
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 100));
      }

      if (!user) {
        setLocation("/signup");
        return false;
      }
      if (onOk) onOk();
      return true;
    },
    [user, authResolved, setLocation],
  );

  return requireAuth;
}
