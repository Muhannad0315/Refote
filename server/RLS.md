RLS guidance for Brew-Discover

Purpose

- Document runtime expectations about Row Level Security (RLS) policies for tables the server reads/writes.

Key rules

- When server code uses `.insert().select()` the PostgREST flow performs both an INSERT and a subsequent SELECT to return the inserted row(s). If INSERT is allowed by RLS but SELECT is not, the overall call will fail. Therefore, any table written by application code that uses `.insert().select()` must have an appropriate `FOR SELECT` policy.

- For user-owned rows (e.g., `check_ins`, `profiles`, `likes`), create RLS policies that permit SELECT for the owner and deny others, for example:

  CREATE POLICY "allow_select_own_checkins" ON public.check_ins
  FOR SELECT USING (auth.uid() = user_id);

  and an INSERT policy such as:

  CREATE POLICY "allow_insert_checkins" ON public.check_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

- When the server performs privileged reads/writes (e.g., validating `is_complete` using the service role), ensure those operations use the service role key (not the anon key) and are only executed server-side.

- Always derive `user_id` from the verified access token on the server; do not accept `user_id` from client request body or query parameters. This prevents privilege escalation by manipulating client payloads.

Verification checklist

- For every table your server writes with `.insert().select()`:

  - Confirm a `FOR SELECT` policy exists that allows the relevant authenticated user to read the row.
  - Confirm `FOR INSERT` policy allows the authenticated user to insert with `WITH CHECK (auth.uid() = user_id)` when appropriate.

- Test write flows locally with an authenticated token and verify the returned JSON (the `.select()` result) is returned as expected.

Notes

- RLS policies depend on the Supabase project's JWT signing keys. If you see JWT cryptographic errors (`PGRST301`), confirm the server's Supabase keys (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) match the project that issued the tokens.

- If you change auth strategies (e.g., replace Supabase auth), update this document and the server code paths that validate tokens.
