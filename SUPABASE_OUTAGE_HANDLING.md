# Supabase Outage Resilience Implementation

## Overview

This document describes the comprehensive system implemented to handle Supabase service outages and network failures gracefully. The system prevents app crashes, displays clear user messaging, and enables automatic recovery when the service returns.

## Problem Statement

When Supabase becomes unreachable (DNS resolution failures, network errors, 503 responses), the app previously:

- Crashed or hung indefinitely
- Showed confusing error messages
- Invalidated sessions unnecessarily
- Had no recovery mechanism

## Solution Architecture

The implementation consists of **four layers**:

1. **Server-side error detection** - Catches network failures from Supabase
2. **Server-side error response** - Returns HTTP 503 SERVICE_UNAVAILABLE
3. **Client-side error detection** - Identifies network failures and 503 responses
4. **UI error boundary** - Displays blocking message with retry options

---

## Implementation Details

### Layer 1: Server-Side Error Detection

**File:** `server/routes.ts`

#### Helper Function: `isSupabaseUnreachable(error)`

Located at lines 38-56, detects network-level failures:

```typescript
function isSupabaseUnreachable(error: any): boolean {
  // Checks for DNS/connection patterns:
  // - ENOTFOUND: DNS resolution failed
  // - GETADDRINFO: DNS lookup error
  // - ECONNREFUSED: Connection refused
  // - ETIMEDOUT: Connection timeout
  // - "fetch failed" or "network error" messages
}
```

#### Modified Function: `getUserIdFromToken(token)`

Lines 68-200 now wrap the Supabase auth call in try-catch:

```typescript
try {
  // Attempt to get user from Supabase
  const { data, error } = await supabase.auth.getUser();
} catch (fetchErr) {
  // Detect if this is a network error
  if (isSupabaseUnreachable(fetchErr)) {
    const err = new Error("SUPABASE_UNREACHABLE");
    (err as any).code = "SUPABASE_UNREACHABLE";
    throw err; // Propagate marked error to routes
  }
  // Re-throw SESSION_INVALID separately
  if (userWasDeleted) {
    throw { sessionInvalid: true };
  }
}
```

#### Updated Protected Routes

All protected routes now follow this pattern:

```typescript
let userId: string | null = null;
try {
  userId = await getUserIdFromToken(token);
} catch (authErr) {
  // Check SUPABASE_UNREACHABLE FIRST (before other error types)
  if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
    return res.status(503).json({
      error: "SERVICE_UNAVAILABLE",
      source: "supabase",
    });
  }
  // Check SESSION_INVALID SECOND
  if ((authErr as any)?.sessionInvalid === true) {
    return res.status(403).json({
      error: "SESSION_INVALID",
      details: "Your session has expired. Please sign in again.",
    });
  }
  // Re-throw unexpected errors
  throw authErr;
}
```

**Routes with error handling:**

- ✅ POST /api/check-ins
- ✅ POST /api/check-ins/:id/like
- ✅ GET /api/check-ins/:id
- ✅ PUT /api/check-ins/:id
- ✅ DELETE /api/check-ins/:id
- ✅ GET /api/profile
- ✅ PUT /api/profile
- ✅ GET /api/profile/check-ins
- ✅ POST /api/users/:id/follow
- ✅ POST /api/users/:id/friend-request
- ✅ GET /api/friend-requests
- ✅ POST /api/friend-requests/:id/accept
- ✅ POST /api/friend-requests/:id/decline
- ✅ GET /api/users/:id/relationship
- ✅ GET /api/activity
- ✅ GET /api/users/:id/check-ins
- ✅ GET /api/demo-profile (graceful: serves demo when unreachable)

---

### Layer 2: Server HTTP Responses

**File:** `server/routes.ts`

When a protected route encounters `code === "SUPABASE_UNREACHABLE"`, it returns:

```json
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "error": "SERVICE_UNAVAILABLE",
  "source": "supabase"
}
```

This signals to the client that the failure is **not** an authentication issue but a **service availability** issue.

---

### Layer 3: Client-Side Error Detection

**File:** `client/src/lib/queryClient.ts`

#### Handler Registration

```typescript
let onSupabaseUnreachable: ((error: Error) => void) | null = null;

export function setSupabaseUnreachableHandler(handler: (error: Error) => void) {
  onSupabaseUnreachable = handler;
}
```

#### Detection Functions

**`isSupabaseUnreachable(error)`** - Detects network-level failures:

- DNS errors (ENOTFOUND, GETADDRINFO)
- Connection errors (ECONNREFUSED, ETIMEDOUT)
- Fetch failures ("fetch failed", "network error")
- Error codes (ENOTFOUND, ECONNREFUSED, ETIMEDOUT)

**`createSupabaseUnreachableError(originalError)`** - Normalizes to standard format:

```typescript
const err = new Error("SUPABASE_UNREACHABLE: Unable to connect to service...");
(err as any).code = "SUPABASE_UNREACHABLE";
```

#### Updated `apiRequest()` Function

```typescript
try {
  const res = await fetch(fullUrl, { headers });
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
```

#### Updated `getQueryFn()` Function

React Query uses this function for all queries. It now:

1. Detects 503 SERVICE_UNAVAILABLE responses
2. Detects network-level fetch failures
3. Normalizes both to SUPABASE_UNREACHABLE error
4. Calls the global handler

```typescript
if (res.status === 503 && text.includes("SERVICE_UNAVAILABLE")) {
  const err = createSupabaseUnreachableError(...);
  if (onSupabaseUnreachable) {
    onSupabaseUnreachable(err);
  }
  throw err;
}
```

#### Updated `throwIfResNotOk()` Function

Checks for 503 SERVICE_UNAVAILABLE **before** other error types:

```typescript
if (res.status === 503 && text.includes("SERVICE_UNAVAILABLE")) {
  // ... handle as SUPABASE_UNREACHABLE
}

// Then check for SESSION_INVALID
if (res.status === 403 && text.includes("SESSION_INVALID")) {
  // ... handle session invalid
}
```

---

### Layer 4: UI Error Boundary

**File:** `client/src/components/supabase-unreachable-boundary.tsx`

A React component that displays a blocking message when the service is unreachable.

#### Behavior

- **Registers global handler** in useEffect
- **Blocks entire page** when unreachable detected (not just a toast)
- **Shows friendly message**: "We're having trouble connecting right now..."
- **Provides retry button**: Calls `window.location.reload()`
- **Auto-retry timer**: Increments every 12 seconds
- **Styling**: Amber warning colors with dark mode support

#### Template Output

```
┌─────────────────────────────────┐
│ Service Temporarily Unavailable │
├─────────────────────────────────┤
│ We're having trouble connecting │
│ right now. This appears to be   │
│ a temporary service issue.      │
│ Please try again in a moment.   │
│                                 │
│        [Try Again Button]       │
│                                 │
│ Automatic retry in 12s...       │
└─────────────────────────────────┘
```

#### Code Location

- Handler setup: Lines 17-27
- State management: Lines 15-16, 42-47
- UI rendering: Lines 52-82
- Manual retry: `window.location.reload()` (line 48)

---

### Layer 4b: App Integration

**File:** `client/src/App.tsx`

The boundary is wrapped at the provider level to catch all errors:

```tsx
function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SupabaseUnreachableBoundary>
            <TooltipProvider>
              <Router />
              <BottomNav />
            </TooltipProvider>
          </SupabaseUnreachableBoundary>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
```

This ensures that **any error** from React Query or API requests is caught and handled.

---

### Layer 4c: Auth Form Integration

**File:** `client/src/components/auth-form.tsx` (Line 142)

The auth form catches SUPABASE_UNREACHABLE and shows friendly messaging:

```typescript
catch (err: any) {
  if ((err as any)?.code === "SUPABASE_UNREACHABLE") {
    setError("We're having trouble connecting right now. Please check your connection and try again.");
  } else {
    setError(err?.message ?? String(err));
  }
}
```

**Effect:** Users see network message, not confusing auth errors like "Sign up failed".

---

## Error Flow Diagram

```
┌─── Supabase Becomes Unreachable (DNS failure, connection refused, etc.)
│
├─► Server: getUserIdFromToken() fails with network error
│   └─► isSupabaseUnreachable(error) returns true
│       └─► throw error with code: "SUPABASE_UNREACHABLE"
│
├─► Route catches error, checks error.code === "SUPABASE_UNREACHABLE"
│   └─► return 503 { error: "SERVICE_UNAVAILABLE", source: "supabase" }
│
├─► Client: fetch() receives 503 response
│   └─► getQueryFn() or apiRequest() detects 503 SERVICE_UNAVAILABLE
│       └─► createSupabaseUnreachableError() normalizes to standard error
│           └─► onSupabaseUnreachable() handler called
│
├─► SupabaseUnreachableBoundary: handler fires, sets isUnreachable = true
│   └─► Component re-renders, blocks page with error UI
│       └─► Shows: "Service Temporarily Unavailable"
│           Shows: "Try Again" button + auto-retry timer
│
└─► User clicks "Try Again" or waits for auto-retry
    └─► window.location.reload() → page refreshes
        └─► If Supabase recovered: normal flow resumes
            If still down: error cycle repeats
```

---

## Key Design Decisions

### 1. Error Code Normalization

All network failures are normalized to a single error code: `"SUPABASE_UNREACHABLE"`

- Makes detection consistent across client/server
- Distinguishes from auth errors (SESSION_INVALID)
- Prevents redundant error handling

### 2. 503 HTTP Response

Server returns HTTP 503 SERVICE_UNAVAILABLE

- Standard HTTP convention for service issues
- Prevents client-side retry logic (since we handle it at app level)
- Clear signal that this is NOT an auth failure

### 3. Blocking UI, Not Toast

Error UI blocks entire page

- Service outage affects entire app
- Toast would be missed/dismissed too easily
- Blocking UI makes severity clear to user

### 4. Automatic Retry with Manual Override

- Auto-retry every 12 seconds (non-aggressive)
- Manual "Try Again" button for immediate retry (page reload)
- Reload clears all error state

### 5. Session Preservation

Network errors do NOT invalidate session

- User remains authenticated locally
- Session only cleared if SESSION_INVALID error
- Allows seamless recovery when service returns

### 6. Centralized Handler

Global `setSupabaseUnreachableHandler()` for all errors

- Single point of UI update
- Prevents multiple error messages
- Decouples error detection from UI logic

### 7. React Query Configuration

Already configured with `retry: false` for unreachable errors

- Prevents infinite retry loops
- Works with global handler to show one error per outage

---

## Testing the Implementation

### Scenario 1: DNS Failure

1. Block Supabase domain in hosts file
2. Try any authenticated action
3. Expected: See "Service Temporarily Unavailable" message
4. Expected: Auto-retry timer counts down
5. Expected: Unblock domain, click "Try Again", app recovers

### Scenario 2: Network Disconnection

1. Disable network adapter or VPN
2. Try to create a check-in or load profile
3. Expected: See "Service Temporarily Unavailable" message
4. Expected: No session invalidation (user still "logged in" locally)
5. Expected: Reconnect to network, click "Try Again", app recovers

### Scenario 3: Server 503 Response

1. Simulate Supabase returning 503 from server
2. Try any authenticated action
3. Expected: See "Service Temporarily Unavailable" message
4. Expected: Similar recovery flow

### Scenario 4: Auth Form During Outage

1. Network unreachable during login/signup
2. Expected: See "We're having trouble connecting right now..."
3. Expected: NO "Sign up failed" or auth error message
4. Expected: No attempts to show "email already exists" message

---

## Future Enhancements

### Optional Improvements (Not Implemented)

1. **Offline Mode** - Queue mutations when offline, sync when online
2. **Partial Functionality** - Show available features while service down
3. **Push Notifications** - Notify user when service recovers
4. **Error Analytics** - Track outage duration/frequency
5. **Circuit Breaker** - Stop retrying after N consecutive failures
6. **Graceful Degradation** - Show cached data while offline

---

## Files Modified

1. ✅ `server/routes.ts` - Added error detection to 17+ protected routes
2. ✅ `client/src/lib/queryClient.ts` - Added handler system and detection
3. ✅ `client/src/components/supabase-unreachable-boundary.tsx` - New UI component
4. ✅ `client/src/App.tsx` - Wrapped with boundary
5. ✅ `client/src/components/auth-form.tsx` - Added network error messaging

---

## Error Codes Reference

| Error Code             | HTTP Status | Meaning                          | Action                       |
| ---------------------- | ----------- | -------------------------------- | ---------------------------- |
| `SUPABASE_UNREACHABLE` | 503         | Service unavailable              | Show blocking UI, auto-retry |
| `SESSION_INVALID`      | 403         | User deleted while authenticated | Sign out, redirect to login  |
| Auth errors            | 401/400     | Invalid credentials              | Show auth-specific error     |
| Other errors           | 500         | Unexpected error                 | Show generic error           |

---

## Monitoring & Debugging

### Check Error Detection

In browser console:

```typescript
// Global handler fires when unreachable
window.setSupabaseUnreachableHandler = (err) =>
  console.log("Unreachable!", err);
```

### Check React Query Config

```typescript
import { queryClient } from "@/lib/queryClient";
console.log(queryClient.getDefaultOptions());
// Should show: retry: false in query options
```

### Check Session Persistence

```typescript
// Session should NOT be invalidated on network errors
const { data } = await supabase.auth.getSession();
console.log(data.session); // Should still exist during outage
```

---

## Production Readiness Checklist

- ✅ Error detection on client and server
- ✅ Automatic recovery mechanism
- ✅ User-friendly messaging
- ✅ Session preservation during outage
- ✅ No infinite retry loops
- ✅ No log spam from repeated errors
- ✅ All protected routes updated
- ✅ Auth forms handle network errors
- ✅ Demo endpoint gracefully degrades
- ✅ No TypeScript errors

**Status: PRODUCTION READY**

---

## Summary

The app now handles Supabase outages gracefully with:

1. **Server-side detection** of network failures
2. **503 responses** to signal service issues
3. **Client-side error boundary** with retry UI
4. **Automatic recovery** every 12 seconds
5. **Session preservation** for seamless resumption
6. **Clear user messaging** throughout the process

When Supabase becomes unreachable, users will see a clear, friendly message with recovery options instead of app crashes or confusing error messages.
