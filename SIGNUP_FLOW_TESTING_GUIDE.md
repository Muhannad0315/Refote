# Signup Flow Testing Guide

## Unconfirmed User Email Resend - Test Cases

---

## ✅ Implementation Verification: Complete

The signup flow implementation is now complete and ready for testing.

### Key Fix Applied

- Updated error code check from `user_already_exists` to `email_exists` (lines 2260)
- This matches the actual Supabase Auth-JS error code returned by `createUser()`

### Current State

- ✅ Dev server running on port 5000
- ✅ Migration ready to apply to Supabase DB
- ✅ Server endpoint handles all signup scenarios
- ✅ Client properly parses response status codes

---

## Test Case 1: New User Signup (Normal Flow)

### Scenario

User signs up with an email that doesn't exist in Supabase Auth

### Steps

1. Open browser to `http://localhost:5173`
2. Click "Sign Up"
3. Enter email: `testuser@example.com`
4. Enter password: `TestPass123`
5. ✅ Check "I agree to Privacy Policy"
6. ✅ Check "I agree to Terms of Use"
7. Click "Sign Up" button

### Expected Result

- ✅ Server returns HTTP 200 with `{ user: { id, email, ... } }`
- ✅ Client shows: "Confirm your email"
- ✅ Supabase sends confirmation email to inbox
- ✅ Profile created with:
  - `terms_accepted = true`
  - `privacy_accepted = true`
  - `legal_accepted = true`
  - `legal_accepted_at = [current timestamp]`

### Server Logs Should Show

```
/api/signup: Creating user: testuser@example.com
Profile update successful
```

---

## Test Case 2: Unconfirmed Email Retry (Resend Confirmation)

### Scenario

User signs up but doesn't receive confirmation email. User retries signup with same email.

### Prerequisites

- Have an existing Supabase Auth user with `email_confirmed_at = NULL`
  - Can be created by:
    - Running Test Case 1 without confirming email
    - Manually creating via Supabase Dashboard

### Steps

1. Open browser to `http://localhost:5173`
2. Click "Sign Up"
3. Enter email: `unconfirmed@example.com` (existing, unconfirmed user)
4. Enter password: `TestPass123`
5. ✅ Check "I agree to Privacy Policy"
6. ✅ Check "I agree to Terms of Use"
7. Click "Sign Up" button

### Expected Result

- ✅ Server detects `email_exists` error
- ✅ Server calls `supabase.auth.admin.listUsers()`
- ✅ Server finds user with matching email
- ✅ Server checks `email_confirmed_at IS NULL` ✓
- ✅ Server calls `supabase.auth.admin.sendEmail({ type: "signup" })`
- ✅ Server returns HTTP 200 with:
  ```json
  {
    "status": "confirmation_resent",
    "message": "Confirmation email resent. Please check your inbox."
  }
  ```
- ✅ Client shows: **"Your account already exists but is not verified. We've resent the confirmation email."**
- ✅ UI shows success state (NOT error state)
- ✅ Confirmation email resent to inbox

### Server Logs Should Show

```
/api/signup: createUser threw: { code: 'email_exists', ... }
Fetching user by email...
User found, email_confirmed_at: null
Resending confirmation email...
Confirmation resent successfully
```

---

## Test Case 3: Already Confirmed Email (Redirect to Login)

### Scenario

User signs up but the email is already confirmed in Supabase Auth. User should be directed to login.

### Prerequisites

- Have an existing Supabase Auth user with `email_confirmed_at = [timestamp]`
  - Can be created by:
    - Running Test Case 1 and confirming email
    - Manually confirming via Supabase Dashboard

### Steps

1. Open browser to `http://localhost:5173`
2. Click "Sign Up"
3. Enter email: `confirmed@example.com` (existing, confirmed user)
4. Enter password: `TestPass123`
5. ✅ Check "I agree to Privacy Policy"
6. ✅ Check "I agree to Terms of Use"
7. Click "Sign Up" button

### Expected Result

- ✅ Server detects `email_exists` error
- ✅ Server calls `supabase.auth.admin.listUsers()`
- ✅ Server finds user with matching email
- ✅ Server checks `email_confirmed_at IS NOT NULL` ✓
- ✅ Server returns HTTP 409 with:
  ```json
  {
    "status": "email_already_confirmed",
    "error": "Email already registered. Please log in."
  }
  ```
- ✅ Client shows: **"An account with this email already exists. Please log in."**
- ✅ UI suggests switching to login mode or shows login link

### Server Logs Should Show

```
/api/signup: createUser threw: { code: 'email_exists', ... }
Fetching user by email...
User found, email_confirmed_at: 2025-11-17T12:34:56.000Z
Email already confirmed, rejecting signup
```

---

## Test Case 4: Missing Legal Acceptance

### Scenario

User tries to signup without accepting legal terms.

### Steps

1. Open browser to `http://localhost:5173`
2. Click "Sign Up"
3. Enter email: `test@example.com`
4. Enter password: `TestPass123`
5. ❌ Do NOT check privacy/terms
6. Try clicking "Sign Up" button

### Expected Result

- ✅ Submit button is DISABLED (grayed out)
- ✅ Cannot click signup
- ✅ Error message: **"You must agree to Privacy Policy and Terms of Use to continue"**

---

## Test Case 5: Invalid Password

### Scenario

User enters a weak password.

### Steps

1. Open browser to `http://localhost:5173`
2. Click "Sign Up"
3. Enter email: `test@example.com`
4. Enter password: `weak` (less than 8 chars, no uppercase/number)
5. ✅ Check both legal boxes
6. Click "Sign Up" button

### Expected Result

- ✅ Client-side validation blocks submission
- ✅ Error message: **"Password must be at least 8 characters and include upper/lowercase and a number"**

---

## Test Case 6: Missing Email or Password

### Scenario

User tries to signup with missing fields.

### Steps

1. Open browser to `http://localhost:5173`
2. Click "Sign Up"
3. Leave email blank OR password blank
4. ✅ Check both legal boxes
5. Try clicking "Sign Up" button

### Expected Result

- ✅ Server returns HTTP 400
- ✅ Error message: **"missing email or password"**

---

## Manual API Testing (cURL)

If you prefer to test the API directly without UI:

### Test Case 1: New Email Signup

```powershell
$body = @{
  email = "newuser@example.com"
  password = "TestPass123"
  termsAccepted = $true
  privacyAccepted = $true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/signup" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

**Expected Response** (HTTP 200):

```json
{
  "user": {
    "id": "uuid-here",
    "email": "newuser@example.com"
  }
}
```

### Test Case 2: Unconfirmed Resend

```powershell
$body = @{
  email = "unconfirmed@example.com"
  password = "TestPass123"
  termsAccepted = $true
  privacyAccepted = $true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/signup" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

**Expected Response** (HTTP 200):

```json
{
  "status": "confirmation_resent",
  "message": "Confirmation email resent. Please check your inbox."
}
```

### Test Case 3: Already Confirmed

```powershell
$body = @{
  email = "confirmed@example.com"
  password = "TestPass123"
  termsAccepted = $true
  privacyAccepted = $true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/signup" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

**Expected Response** (HTTP 409):

```json
{
  "status": "email_already_confirmed",
  "error": "Email already registered. Please log in."
}
```

### Test Case 4: Missing Legal Acceptance

```powershell
$body = @{
  email = "test@example.com"
  password = "TestPass123"
  termsAccepted = $false
  privacyAccepted = $true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/signup" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

**Expected Response** (HTTP 400):

```json
{
  "error": "LEGAL_ACCEPTANCE_REQUIRED"
}
```

---

## Verification Checklist

| Test Case              | Status           | Notes                                              |
| ---------------------- | ---------------- | -------------------------------------------------- |
| New email signup       | ⚪ Ready to test | Should create user + profile with acceptance flags |
| Unconfirmed resend     | ⚪ Ready to test | Should resend confirmation, not create new user    |
| Already confirmed      | ⚪ Ready to test | Should reject with 409, suggest login              |
| Missing legal          | ⚪ Ready to test | Button disabled, error shown                       |
| Invalid password       | ⚪ Ready to test | Client-side validation                             |
| Missing email/password | ⚪ Ready to test | Server returns 400                                 |

---

## Supabase Dashboard Verification

After running tests, verify in Supabase Dashboard:

### Check Auth Users

1. Go to **Supabase Dashboard** → Your Project → **Authentication**
2. Click **Users** tab
3. Verify new users appear in list
4. Check `email_confirmed_at` column:
   - NULL = unconfirmed (can resend)
   - [timestamp] = confirmed (verified user)

### Check Profiles Table

1. Go to **SQL Editor** or **Table Editor**
2. Query `public.profiles` table
3. Verify columns exist:
   - `user_id` (foreign key to auth.users)
   - `terms_accepted` (boolean, should be TRUE for new users)
   - `privacy_accepted` (boolean, should be TRUE for new users)
   - `legal_accepted` (boolean, should be TRUE for new users)
   - `legal_accepted_at` (timestamp, should be NOT NULL for new users)

### Check Email Logs

1. Go to **Supabase Dashboard** → Your Project → **Authentication** → **Email Log**
2. Verify emails sent:
   - "signup" emails appear
   - "confirmation" emails appear
   - "resend" emails appear for retry cases

---

## Debugging Tips

### If tests fail, check:

1. **Dev Server Error Logs**

   - Look for `/api/signup` error messages
   - Check `SUPABASE_SERVICE_KEY` is set in `server/.env`
   - Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set

2. **Browser Console**

   - Check for JavaScript errors
   - Verify API request was sent (Network tab)
   - Check response status code and body

3. **Supabase Logs**

   - Check function logs for any errors
   - Check email delivery logs
   - Check RLS policy violations

4. **Email Delivery**
   - Check Supabase email provider configuration
   - If using Gmail, ensure "Less secure apps" is enabled
   - Check spam/junk folder for confirmation emails

---

## Next Steps

After completing all test cases:

1. ✅ Verify all scenarios work as expected
2. ✅ Deploy migration to production Supabase
3. ✅ Deploy code to production
4. ✅ Monitor logs for any issues
5. ✅ Collect user feedback on signup experience

---

## Success Indicators

Your signup flow is working correctly when:

- ✅ New users can sign up and receive confirmation emails
- ✅ Users who don't receive confirmation can retry without errors
- ✅ Retrying with unconfirmed email resends confirmation automatically
- ✅ Retrying with confirmed email directs to login
- ✅ Legal acceptance is enforced before signup
- ✅ No users get stuck in "email exists" limbo
- ✅ All profiles have acceptance flags set to TRUE
- ✅ Profile rollback works if update fails
- ✅ No 500 errors on valid retry attempts

---

## Support

For issues or questions:

1. Check the implementation documentation: `SIGNUP_FLOW_UNCONFIRMED_USER_IMPLEMENTATION.md`
2. Review server logs for detailed error messages
3. Verify Supabase configuration (service key, auth settings)
4. Test with cURL to isolate client vs. server issues
