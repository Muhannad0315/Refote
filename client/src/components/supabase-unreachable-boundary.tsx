import React, { useState, useEffect } from "react";
import { setSupabaseUnreachableHandler } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

interface SupabaseUnreachableBoundaryProps {
  children: React.ReactNode;
}

export function SupabaseUnreachableBoundary({
  children,
}: SupabaseUnreachableBoundaryProps) {
  const [isUnreachable, setIsUnreachable] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Set up global handler for Supabase unreachable errors
    setSupabaseUnreachableHandler((error) => {
      // Log only once per error type (avoid spam)
      if (!isUnreachable) {
        console.warn(
          "Supabase unreachable:",
          (error as any).code || error.message,
        );
      }
      setIsUnreachable(true);
      setRetryCount(0);
    });
  }, [isUnreachable]);

  // Auto-retry every 10-15 seconds
  useEffect(() => {
    if (!isUnreachable) return;

    const timer = setTimeout(() => {
      setRetryCount((prev) => prev + 1);
      // Just increment to trigger any queries that might retry
      // (React Query will handle actual retry logic)
    }, 12000); // 12 seconds

    return () => clearTimeout(timer);
  }, [isUnreachable, retryCount]);

  const handleManualRetry = () => {
    setIsUnreachable(false);
    setRetryCount(0);
    // Optionally refresh the page to clear all errors
    window.location.reload();
  };

  if (!isUnreachable) {
    return <>{children}</>;
  }

  // Show blocking error message
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <h2 className="text-xl font-semibold text-amber-900 dark:text-amber-100 mb-3">
            Service Temporarily Unavailable
          </h2>

          <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
            We're having trouble connecting right now. This appears to be a
            temporary service issue. Please try again in a moment.
          </p>

          <div className="space-y-3">
            <Button onClick={handleManualRetry} className="w-full">
              Try Again
            </Button>

            <div className="text-xs text-amber-700 dark:text-amber-300 text-center">
              Automatic retry in {12}s...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
