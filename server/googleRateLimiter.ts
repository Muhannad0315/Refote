/**
 * Simple in-memory rate limiter for outgoing Google API calls.
 *
 * Purpose:
 * - Provide an absolute last line of defense against excessive Google API
 *   usage (protects quota and costs).
 * - Soft limit: allow up to `MAX_CALLS_PER_WINDOW` calls per `WINDOW_MS`.
 * - If the limit is exceeded, callers receive `null` instead of a Response
 *   so the caller can fall back to cached/local data. We intentionally do
 *   not return errors to clients from the limiter.
 */

const MAX_CALLS_PER_WINDOW = 30; // soft limit
const WINDOW_MS = 60 * 1000; // 1 minute window

// timestamps (epoch ms) of recent Google calls
const timestamps: number[] = [];

function prune() {
  const cutoff = Date.now() - WINDOW_MS;
  while (timestamps.length > 0 && timestamps[0] < cutoff) {
    timestamps.shift();
  }
}

/**
 * Attempt to fetch a Google URL within the rate limit.
 * - If under limit: performs `fetch(url, opts)` and returns the Response.
 * - If over limit: returns `null` (caller should fallback to cached data).
 */
export async function attemptFetch(
  url: string,
  opts?: RequestInit,
  // optional tag for logging: 'Nearby' | 'Details' | 'Photos' | 'SearchText'
  tag?: string,
): Promise<Response | null> {
  prune();
  const now = new Date();
  if (timestamps.length >= MAX_CALLS_PER_WINDOW) {
    console.warn(
      `[${now.toISOString()}] Google rate limiter: limit exceeded — serving cached data when available. endpoint=${
        tag ?? "unknown"
      }`,
    );
    return null;
  }

  // record this call and perform the fetch
  timestamps.push(Date.now());
  try {
    // console.log(
    //   `[${now.toISOString()}] Google API call: endpoint=${
    //     tag ?? "unknown"
    //   } url=${url}`,
    // );
    const res = await fetch(url, opts as any);
    return res;
  } catch (err) {
    // network errors are bubbled to caller to handle; do not mask them here
    throw err;
  }
}

/**
 * For observability/testing: get current usage count in window.
 */
export function getCurrentWindowCount(): number {
  prune();
  return timestamps.length;
}
