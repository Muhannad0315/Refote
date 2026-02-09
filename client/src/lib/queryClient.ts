import { QueryClient, QueryFunction } from "@tanstack/react-query";
import supabase from "./supabaseClient";

// Global handler for SESSION_INVALID errors
let onSessionInvalid: (() => void) | null = null;

// Global handler for SUPABASE_UNREACHABLE errors
let onSupabaseUnreachable: ((error: Error) => void) | null = null;

export function setSessionInvalidHandler(handler: () => void) {
  onSessionInvalid = handler;
}

export function setSupabaseUnreachableHandler(handler: (error: Error) => void) {
  onSupabaseUnreachable = handler;
}

// Detect if error is a network/DNS failure (Supabase unreachable)
function isSupabaseUnreachable(error: any): boolean {
  const message = error?.message || "";
  const details = error?.details || "";
  const combined = `${message} ${details}`.toLowerCase();

  return (
    combined.includes("enotfound") || // DNS resolution failed
    combined.includes("getaddrinfo") || // DNS lookup error
    combined.includes("fetch failed") || // Generic fetch failure
    combined.includes("failed to fetch") || // Another fetch variant
    combined.includes("network error") ||
    combined.includes("connection refused") ||
    combined.includes("unable to reach") ||
    error?.code === "ENOTFOUND" ||
    error?.code === "ECONNREFUSED" ||
    error?.code === "ETIMEDOUT"
  );
}

// Normalize network errors to a typed error object
function createSupabaseUnreachableError(originalError: any): Error {
  const err = new Error(
    "SUPABASE_UNREACHABLE: Unable to connect to service. Please try again.",
  );
  (err as any).code = "SUPABASE_UNREACHABLE";
  (err as any).originalError = originalError;
  return err;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;

    // Detect SERVICE_UNAVAILABLE (server-side Supabase failure)
    if (res.status === 503 && text.includes("SERVICE_UNAVAILABLE")) {
      const err = createSupabaseUnreachableError(
        new Error("Service temporarily unavailable"),
      );
      if (onSupabaseUnreachable) {
        onSupabaseUnreachable(err);
      }
      throw err;
    }

    // Detect SESSION_INVALID error (user deleted while authenticated)
    if (res.status === 403 && text.includes("SESSION_INVALID")) {
      if (onSessionInvalid) {
        onSessionInvalid();
      }
      throw new Error("SESSION_INVALID");
    }

    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data
    ? { "Content-Type": "application/json" }
    : {};
  try {
    const session = await supabase.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch (_) {
    // ignore if supabase not configured
  }


  const fullUrl =
    url.startsWith("http") || url.startsWith("/")
      ? url.startsWith("http")
        ? url
        : window.location.origin + url
      : window.location.origin + "/" + url;

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    await throwIfResNotOk(res);
    return res;
  } catch (err: any) {
    // Detect network-level failures
    if (isSupabaseUnreachable(err)) {
      const unreachableErr = createSupabaseUnreachableError(err);
      if (onSupabaseUnreachable) {
        onSupabaseUnreachable(unreachableErr);
      }
      throw unreachableErr;
    }
    throw err;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } catch (_) {
      // ignore
    }

    const raw = Array.isArray(queryKey) ? queryKey.join("/") : String(queryKey);
    const path =
      raw.startsWith("http") || raw.startsWith("/") ? raw : "/" + raw;
    const fullUrl = path.startsWith("http")
      ? path
      : window.location.origin + path;

    try {
      const res = await fetch(fullUrl, {
        headers,
      });

      // Detect SERVICE_UNAVAILABLE (server-side Supabase failure)
      if (res.status === 503) {
        const text = await res.text();
        if (text.includes("SERVICE_UNAVAILABLE")) {
          const err = createSupabaseUnreachableError(
            new Error("Service temporarily unavailable"),
          );
          if (onSupabaseUnreachable) {
            onSupabaseUnreachable(err);
          }
          throw err;
        }
      }

      // Detect SESSION_INVALID error (user deleted while authenticated)
      if (res.status === 403 || res.status === 401) {
        const text = await res.text();
        if (
          text.includes("SESSION_INVALID") ||
          text.includes("sessionInvalid")
        ) {
          if (onSessionInvalid) {
            onSessionInvalid();
          }
          throw new Error("SESSION_INVALID");
        }
      }

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (err: any) {
      // Detect network-level failures
      if (isSupabaseUnreachable(err)) {
        const unreachableErr = createSupabaseUnreachableError(err);
        if (onSupabaseUnreachable) {
          onSupabaseUnreachable(unreachableErr);
        }
        throw unreachableErr;
      }
      throw err;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
