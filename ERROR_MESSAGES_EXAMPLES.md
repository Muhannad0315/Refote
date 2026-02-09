# Error Messages & Examples

## User-Facing Messages

### Error Screen (Blocking UI)

```
Service Temporarily Unavailable

We're having trouble connecting right now.
This appears to be a temporary service issue.
Please try again in a moment.

        [Try Again]

Automatic retry in 12s...
```

### Auth Form During Outage

```
Error: We're having trouble connecting right now.
Please check your connection and try again.
```

### Server Response (HTTP 503)

```json
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "error": "SERVICE_UNAVAILABLE",
  "source": "supabase"
}
```

---

## Network Error Examples Detected

### DNS Resolution Failure

```javascript
// Error thrown by fetch() or getUserIdFromToken()
Error: fetch failed
  message: "request to https://hsilaefxkclfarvcnqkm.supabase.co/auth/v1/user failed, reason: getaddrinfo ENOTFOUND hsilaefxkclfarvcnqkm.supabase.co"
  code: "ENOTFOUND"
  hostname: "hsilaefxkclfarvcnqkm.supabase.co"
  syscall: "getaddrinfo"

// DETECTED BY: isSupabaseUnreachable() → matches "enotfound" in message
// ACTION: Throw SUPABASE_UNREACHABLE error
```

### Connection Refused

```javascript
Error: connect ECONNREFUSED 127.0.0.1:5432
  code: "ECONNREFUSED"
  errno: -111
  syscall: "connect"
  address: "127.0.0.1"
  port: 5432

// DETECTED BY: isSupabaseUnreachable() → matches code ECONNREFUSED
// ACTION: Throw SUPABASE_UNREACHABLE error
```

### Connection Timeout

```javascript
Error: connect ETIMEDOUT
  code: "ETIMEDOUT"
  errno: -110
  syscall: "connect"

// DETECTED BY: isSupabaseUnreachable() → matches code ETIMEDOUT
// ACTION: Throw SUPABASE_UNREACHABLE error
```

### Fetch Failed (Browser)

```javascript
TypeError: Failed to fetch
  message: "Failed to fetch"

// DETECTED BY: isSupabaseUnreachable() → matches "fetch failed" or "failed to fetch"
// ACTION: Throw SUPABASE_UNREACHABLE error
```

### Network Error (Browser)

```javascript
TypeError: NetworkError when attempting to fetch resource.
  message: "NetworkError when attempting to fetch resource"

// DETECTED BY: isSupabaseUnreachable() → matches "network error"
// ACTION: Throw SUPABASE_UNREACHABLE error
```

---

## Error Flow Examples

### Example 1: Attempting to Create Check-In During DNS Failure

```
USER ACTION: Click "Create Check-In" button
         ↓
CLIENT: apiRequest("POST", "/api/check-ins", checkInData)
         ↓
SERVER: app.post("/api/check-ins", async (req, res) => {
          try {
            const token = req.headers.authorization;
            try {
              userId = await getUserIdFromToken(token);
            } catch (authErr) {
  ═══════════════════════════════════════════════════════════════

  authErr = {
    message: "fetch failed, reason: getaddrinfo ENOTFOUND supabase.co",
    code: "ENOTFOUND"
  }

  ✓ isSupabaseUnreachable(authErr) → true
  ✓ Throw new Error with code: "SUPABASE_UNREACHABLE"

  ═══════════════════════════════════════════════════════════════
            }
            if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
              return res.status(503).json({
                error: "SERVICE_UNAVAILABLE",
                source: "supabase"
              });
            }
          }
        })
         ↓
CLIENT: Receives 503 response with body containing "SERVICE_UNAVAILABLE"
         ↓
CLIENT: getQueryFn() detects 503 && "SERVICE_UNAVAILABLE"
         ↓
CLIENT: ✓ Create normalized error:
        {
          code: "SUPABASE_UNREACHABLE",
          message: "SUPABASE_UNREACHABLE: Unable to connect to service..."
        }
         ↓
CLIENT: ✓ Call onSupabaseUnreachable() handler
         ↓
UI: SupabaseUnreachableBoundary.setIsUnreachable(true)
         ↓
UI: Render blocking error screen:
    "Service Temporarily Unavailable"
    "We're having trouble connecting right now..."
    [Try Again] [Counting: 12, 11, 10...]
```

### Example 2: Login During Network Disconnection

```
USER ACTION: Enter credentials and click "Sign In"
         ↓
CLIENT: auth-form onSubmit()
    ↓
CLIENT: try {
          await supabase.auth.signInWithPassword({
            email: "user@example.com",
            password: "password123"
          });
        }
         ↓
CLIENT: fetch() throws TypeError: Failed to fetch
    (Device is offline, no network)
         ↓
CLIENT: catch (err) {
          ✓ err.message = "Failed to fetch"
          ✓ isSupabaseUnreachable(err) → true
          ✓ Create normalized error
          ✓ Call onSupabaseUnreachable() handler
        }
         ↓
UI: Handler fires → setIsUnreachable(true)
         ↓
UI: SupabaseUnreachableBoundary renders blocking UI
         ↓
USER SEES:
    "Service Temporarily Unavailable"
    "We're having trouble connecting right now..."
    NOT: "Wrong password" or other auth errors
         ↓
USER ACTION: Reconnect to network
         ↓
USER ACTION: Wait 12 seconds (or click "Try Again")
         ↓
PAGE: window.location.reload() or auto-retry
         ↓
REQUEST: Succeeds (service is now reachable)
         ↓
UI: SupabaseUnreachableBoundary clears error state
         ↓
APP: Returns to normal flow
```

### Example 3: Checking Server Behavior

```
Route: GET /api/profile

INCOMING REQUEST:
    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

ROUTE CODE:
    try {
      userId = await getUserIdFromToken(token);
    } catch (authErr) {
      if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
        return res.status(503).json({
          error: "SERVICE_UNAVAILABLE",
          source: "supabase"
        });
      }
    }

SUPABASE IS UNREACHABLE:
    ✓ getUserIdFromToken() throws error with code: "SUPABASE_UNREACHABLE"
    ✓ Route catches error
    ✓ Detects error.code === "SUPABASE_UNREACHABLE"
    ✓ Returns 503 response

OUTGOING RESPONSE:
    HTTP/1.1 503 Service Unavailable
    Content-Type: application/json

    {
      "error": "SERVICE_UNAVAILABLE",
      "source": "supabase"
    }

CLIENT RECEIVES:
    ✓ Status 503
    ✓ Body contains "SERVICE_UNAVAILABLE"
    ✓ Detects as network error (not auth error)
    ✓ Shows blocking UI (not auth failure message)
```

---

## Error Handling Decision Tree

```
ERROR OCCURS
    ↓
┌─────────────────────────────────┐
│ Is it a network-level error?    │
│ (DNS, connection, timeout, etc) │
└─────────────────────────────────┘
    ↓
    YES: isSupabaseUnreachable() = true
    ├─ Throw error with code: "SUPABASE_UNREACHABLE"
    └─ SERVER: Return 503 SERVICE_UNAVAILABLE
       CLIENT: Show blocking "Service Unavailable" message

    NO: isSupabaseUnreachable() = false
    ├─ Check if error.sessionInvalid === true
    │  ├─ YES: User was deleted
    │  │   └─ SERVER: Return 403 SESSION_INVALID
    │  │      CLIENT: Sign out, redirect to login
    │  │
    │  └─ NO: Other error (auth, validation, etc)
    │      └─ SERVER: Return appropriate error
    │         CLIENT: Show auth or validation message
```

---

## Console Logs During Outage

### Server Logs

```
// During normal operation:
[INFO] GET /api/profile 200 OK

// During outage - FIRST error:
[WARN] Supabase unreachable: code=SUPABASE_UNREACHABLE
[ERROR] getUserIdFromToken: auth REST fetch error {
  message: "fetch failed, reason: getaddrinfo ENOTFOUND supabase.co",
  code: "ENOTFOUND"
}

// During outage - SUBSEQUENT requests:
[WARN] Supabase unreachable: code=SUPABASE_UNREACHABLE
// No error stack traces (already logged above)
```

### Client Console Logs

```
// During normal operation:
[INFO] getQueryFn: Authorization header preview "Bearer eyJhbGci..."

// During outage - FIRST error:
[WARN] Supabase unreachable: code=SUPABASE_UNREACHABLE

// During outage - SUBSEQUENT requests:
// No spam - global handler prevents repeated logs

// Auto-retry timer:
// (silent - just increments counter)

// User clicks "Try Again":
// [INFO] Page reload initiated

// After recovery:
[INFO] getQueryFn: Authorization header preview "Bearer eyJhbGci..."
// Normal operation resumes
```

---

## Testing Scenarios & Expected Outputs

### Test 1: DNS Failure

```bash
# Hosts file:
127.0.0.1 supabase.co

# Expected browser console:
TypeError: Failed to fetch

# Expected error code:
code: "SUPABASE_UNREACHABLE"

# Expected UI:
✓ Blocking message: "Service Temporarily Unavailable"
✓ "Try Again" button clickable
✓ Auto-retry timer shown
```

### Test 2: Offline Mode

```bash
# DevTools: Network → Offline

# Expected browser console:
TypeError: NetworkError when attempting to fetch resource

# Expected error code:
code: "SUPABASE_UNREACHABLE"

# Expected UI:
✓ Blocking message visible
✓ Cannot proceed with normal actions
✓ Auto-retry timer running
```

### Test 3: Slow Network (5G Simulator)

```bash
# DevTools: Network → Slow 4G

# If timeout occurs:
Error: connect ETIMEDOUT

# Expected error code:
code: "SUPABASE_UNREACHABLE"

# Expected UI:
✓ Error message shown
✓ Retry options available
```

### Test 4: Session Persistence

```javascript
// During outage in browser console:
const { data } = await supabase.auth.getSession();
console.log(data.session);

// Expected:
// ✓ Session object exists (NOT null)
// ✓ User info intact
// ✓ Access token still present
```

---

## Transition Points

### From Normal → Outage

```
User action succeeds
    ↓ (seconds later, Supabase fails)
    ↓
Error detected
    ↓
Global handler called
    ↓
SupabaseUnreachableBoundary.setState(true)
    ↓
UI refreshes
    ↓
Blocking error screen appears
```

### From Outage → Normal (Auto-Retry)

```
Error state: isUnreachable = true
Auto-retry timer: 12 seconds
    ↓ (timer expires)
    ↓
retry attempt
    ↓
Request succeeds (service recovered)
    ↓
Response succeeds
    ↓
No error this time
    ↓
Global handler not called
    ↓
SupabaseUnreachableBoundary.setState(false)
    ↓
UI clears blocking screen
    ↓
Normal operation resumes
```

### From Outage → Normal (Manual Retry)

```
Error state: isUnreachable = true
User clicks: "Try Again"
    ↓
window.location.reload()
    ↓
Page reloads from scratch
    ↓
Service now available (or still down)
    ↓
If available: Normal app loads
If still down: Error screen reappears
```

---

## Session Behavior Throughout Outage

```
BEFORE OUTAGE:
├─ Session: Active ✓
├─ User: Authenticated ✓
├─ Token: Valid ✓
└─ Data: Synced ✓

DURING OUTAGE:
├─ Session: Active ✓ (NOT invalidated)
├─ User: Still "logged in" ✓ (locally)
├─ Token: Still valid ✓ (just can't reach server)
└─ Data: Last known state ✓ (cached)

RETRY ATTEMPTS DURING OUTAGE:
├─ Session: Still active ✓
├─ User: Still authenticated ✓
├─ Token: Still valid ✓
└─ Mutations queued: No (React Query retry: false)

AFTER OUTAGE RECOVERY:
├─ Session: Remains active ✓ (continuous)
├─ User: Still authenticated ✓ (no re-login needed)
├─ Token: Still valid ✓ (seamless)
└─ App: Returns to previous state ✓
```

---

## No Other Error Types Are Affected

### These still work normally:

```
Authentication errors (wrong password, user not found)
  → Show auth-specific message
  → Don't trigger SUPABASE_UNREACHABLE path

Validation errors (invalid data)
  → Show validation message
  → Don't trigger SUPABASE_UNREACHABLE path

Authorization errors (no permission)
  → Show "not allowed" message
  → Don't trigger SUPABASE_UNREACHABLE path

Session invalid (user deleted)
  → Show "session expired" message
  → Sign out user
  → Different error code: SESSION_INVALID

Server errors (500 Internal Server Error)
  → Show generic error message
  → Not marked as SUPABASE_UNREACHABLE
```

**Only network-level failures and 503s trigger the outage handling.**
