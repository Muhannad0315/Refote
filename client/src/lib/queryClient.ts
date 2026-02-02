import { QueryClient, QueryFunction } from "@tanstack/react-query";
import supabase from "./supabaseClient";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
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

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
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
    const res = await fetch(fullUrl, {
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
