/**
 * Centralized error mapping for user-facing messages.
 * Detects network, DNS, and Supabase failures and maps them to user-friendly messages.
 * Prevents raw technical errors from reaching the UI.
 */

export interface AppError {
  isNetworkError: boolean;
  userMessage: string;
  originalError: Error | null;
}

/**
 * Detects if an error is a network-level failure
 * (DNS, connection refused, fetch failed, etc.)
 */
function isNetworkError(error: any): boolean {
  if (!error) return false;

  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  const combined = `${message} ${details} ${code}`;

  return (
    combined.includes("fetch failed") ||
    combined.includes("enotfound") || // DNS resolution failed
    combined.includes("getaddrinfo") || // DNS lookup error
    combined.includes("econnrefused") || // Connection refused
    combined.includes("etimedout") || // Connection timeout
    combined.includes("network error") ||
    combined.includes("failed to fetch") ||
    combined.includes("unable to reach") ||
    combined.includes("service unavailable") ||
    error?.code === "ENOTFOUND" ||
    error?.code === "ECONNREFUSED" ||
    error?.code === "ETIMEDOUT" ||
    error?.code === "SUPABASE_UNREACHABLE"
  );
}

/**
 * Maps any error to a user-friendly message.
 * Network/DNS errors get a generic message.
 * Other errors pass through or get sanitized.
 */
export function mapErrorForUI(error: any): AppError {
  if (!error) {
    return {
      isNetworkError: false,
      userMessage: "An error occurred. Please try again.",
      originalError: null,
    };
  }

  // Check for network errors first
  if (isNetworkError(error)) {
    return {
      isNetworkError: true,
      userMessage:
        "We're having trouble connecting to our servers right now. Please try again in a moment.",
      originalError: error instanceof Error ? error : new Error(String(error)),
    };
  }

  // Check for marked Supabase unreachable errors
  if ((error as any)?.code === "SUPABASE_UNREACHABLE") {
    return {
      isNetworkError: true,
      userMessage:
        "We're having trouble connecting to our servers right now. Please try again in a moment.",
      originalError: error instanceof Error ? error : new Error(String(error)),
    };
  }

  // Check for HTTP 503 (Service Unavailable)
  if (
    (error as any)?.status === 503 ||
    (error as any)?.error === "SERVICE_UNAVAILABLE"
  ) {
    return {
      isNetworkError: true,
      userMessage:
        "We're having trouble connecting to our servers right now. Please try again in a moment.",
      originalError: error instanceof Error ? error : new Error(String(error)),
    };
  }

  // For other errors, use the message if available, else generic
  const message =
    (error as any)?.message ||
    (error as any)?.error_description ||
    (error instanceof Error ? error.message : String(error));

  return {
    isNetworkError: false,
    userMessage: message || "An error occurred. Please try again.",
    originalError: error instanceof Error ? error : new Error(String(error)),
  };
}

/**
 * Convenience wrapper for use in error handlers.
 * Returns only the user-facing message.
 */
export function getUserFriendlyErrorMessage(error: any): string {
  return mapErrorForUI(error).userMessage;
}

/**
 * Helper to check if an error is a network error without full mapping
 */
export function isNetworkErrorDetected(error: any): boolean {
  return (
    isNetworkError(error) || (error as any)?.code === "SUPABASE_UNREACHABLE"
  );
}
