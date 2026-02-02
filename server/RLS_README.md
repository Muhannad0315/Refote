RLS and SUPABASE_SERVICE_KEY

- Keep `SUPABASE_SERVICE_KEY` in `server/.env` only. Do NOT expose it to the client.
- Use the service role key for trusted server-side operations that must bypass RLS (e.g., auth webhooks creating rows).
- When RLS is enabled, ensure per-table policies allow the intended operations for authenticated users (e.g., insert/select/update own profile).

Recommended quick checklist after enabling RLS:

- Add an UPDATE policy for `profiles` allowing `auth.uid() = user_id`.
- Ensure webhook handlers use the server service key to create initial rows.
- Ensure client-side flows send the user token on requests that should run under the user's identity.
- Rotate the service role key if it was exposed accidentally.
