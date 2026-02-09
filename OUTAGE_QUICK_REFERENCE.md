# Quick Reference: Supabase Outage Handling

## What Was Implemented

A **4-layer resilience system** that prevents crashes when Supabase is unreachable and provides automatic recovery.

## How It Works (User Experience)

### Normal Operation

- App works as expected
- Requests succeed, data loads normally

### During Supabase Outage

1. User attempts action (login, check-in, load profile, etc.)
2. **See blocking message:** "Service Temporarily Unavailable"
3. **Options:**
   - Click "Try Again" button → page refreshes immediately
   - Wait for auto-retry countdown (12 seconds) → app tries again automatically
4. **When service recovers:**
   - Next retry succeeds
   - App returns to normal operation
   - Session still active (not invalidated)

### During Auth Operations (Login/Signup)

- See: "We're having trouble connecting right now..."
- NOT: "Sign up failed" or auth error messages
- Same retry options (manual or automatic)

## How It Works (Technical Overview)

```
Server                          Client
├─ Route gets request
├─ Calls getUserIdFromToken()
├─ Network fails                 ├─ fetch() fails (DNS, connection, etc.)
│  (DNS, connection, timeout)    │
├─ isSupabaseUnreachable() true  ├─ isSupabaseUnreachable() true
├─ Throw error code:             ├─ Create normalized error
│  "SUPABASE_UNREACHABLE"        │  code: "SUPABASE_UNREACHABLE"
├─ Route catches error           ├─ Call global handler
├─ Return HTTP 503 response      ├─ SupabaseUnreachableBoundary
│  with "SERVICE_UNAVAILABLE"    │  sets isUnreachable = true
│                                ├─ Render blocking error UI
                                 ├─ Show "Try Again" button
                                 ├─ Show auto-retry timer
```

## Files Changed

### Server-Side (`server/routes.ts`)

- Added `isSupabaseUnreachable(error)` helper function (lines 38-56)
- Updated `getUserIdFromToken()` to catch network errors (lines 68-200)
- Added error handling to **17+ protected routes**:
  - POST /api/check-ins
  - POST /api/check-ins/:id/like
  - GET /api/check-ins/:id
  - PUT /api/check-ins/:id
  - DELETE /api/check-ins/:id
  - GET /api/profile
  - PUT /api/profile
  - GET /api/profile/check-ins
  - POST /api/users/:id/follow
  - POST /api/users/:id/friend-request
  - GET /api/friend-requests
  - POST /api/friend-requests/:id/accept
  - POST /api/friend-requests/:id/decline
  - GET /api/users/:id/relationship
  - GET /api/activity
  - GET /api/users/:id/check-ins
  - GET /api/demo-profile

### Client-Side (`client/src/`)

1. **`lib/queryClient.ts`** (~65 lines added)

   - `setSupabaseUnreachableHandler()` - Register global handler
   - `isSupabaseUnreachable()` - Detect network failures
   - `createSupabaseUnreachableError()` - Normalize errors
   - Updated `throwIfResNotOk()` - Detect 503 responses
   - Updated `apiRequest()` - Catch fetch errors
   - Updated `getQueryFn()` - Detect React Query fetch failures

2. **`components/supabase-unreachable-boundary.tsx`** (NEW - 82 lines)

   - React component that displays blocking error UI
   - Registers global handler
   - Shows "Service Temporarily Unavailable" message
   - Provides "Try Again" button
   - Auto-retry every 12 seconds

3. **`App.tsx`** (2 lines changed)

   - Added import for boundary component
   - Wrapped `QueryClientProvider` with `SupabaseUnreachableBoundary`

4. **`components/auth-form.tsx`** (Line 142)
   - Detects SUPABASE_UNREACHABLE in catch block
   - Shows network message instead of auth error

## Error Detection Patterns

### Server-Side Detects

- DNS resolution failures: ENOTFOUND
- DNS lookup errors: GETADDRINFO
- Connection refused: ECONNREFUSED
- Connection timeout: ETIMEDOUT
- Generic fetch failures

### Client-Side Detects

- Same network patterns as server
- HTTP 503 SERVICE_UNAVAILABLE responses
- Network error messages

All detected errors are normalized to:

```typescript
{
  code: "SUPABASE_UNREACHABLE",
  message: "SUPABASE_UNREACHABLE: Unable to connect to service..."
}
```

## Key Features

| Feature                     | Benefit                                          |
| --------------------------- | ------------------------------------------------ |
| **Network error detection** | Catches DNS, connection, and timeout failures    |
| **Error normalization**     | Single error code for all service unavailability |
| **Global handler**          | One UI update point, prevents redundant messages |
| **Blocking UI**             | Severity clear to user (not missed in toast)     |
| **Auto-retry**              | Non-aggressive recovery every 12 seconds         |
| **Manual retry**            | User control with "Try Again" button             |
| **Session preservation**    | User stays authenticated, seamless recovery      |
| **No retry loops**          | React Query retry: false prevents spam           |
| **Auth handling**           | Network errors don't show auth-specific messages |

## Testing

### Simulate DNS Failure

```bash
# Add to hosts file:
# 127.0.0.1 hsilaefxkclfarvcnqkm.supabase.co

# Or use browser DevTools:
# Throttling: Offline
```

### Simulate Network Failure

```bash
# Disable network adapter or VPN
# Try any authenticated action
# Should see "Service Temporarily Unavailable"
```

### Simulate 503 Response

- Mock fetch/Supabase to return 503 SERVICE_UNAVAILABLE
- Same error UI should appear

### Verify Session Preservation

```typescript
// In browser console during outage:
const { data } = await supabase.auth.getSession();
console.log(data.session); // Should still exist
```

## Status

✅ **PRODUCTION READY**

All layers implemented and tested:

- ✅ Server-side detection (17+ routes)
- ✅ Client-side detection (fetch + React Query)
- ✅ UI error boundary (blocking message + retry)
- ✅ Auth form integration
- ✅ Session preservation
- ✅ No TypeScript errors
- ✅ No infinite retries
- ✅ No log spam

## Recovery Timeline

1. **0-12 seconds**: User sees error message with "Try Again" button
2. **12 seconds**: Auto-retry attempts (shown in countdown)
3. **If recovered**: Request succeeds, app resumes normal operation
4. **If still down**: Error reappears, countdown starts again

## Session Behavior During Outage

- ✅ Session remains valid (not cleared)
- ✅ User stays "logged in" locally
- ✅ No logout/login required after recovery
- ✅ Seamless return to previous state

## What's NOT Implemented (By Design)

- Offline mode (queue mutations, sync later)
- Partial functionality display
- Push notifications on recovery
- Circuit breaker (stop after N failures)
- Graceful degradation to cached data

These can be added later if needed without breaking current implementation.
