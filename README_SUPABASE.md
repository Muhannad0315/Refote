# Supabase initialization (minimal)

This project includes a minimal Supabase client initializer for the frontend.

Files added:

- `client/src/lib/supabaseClient.ts` — creates a Supabase client using Vite env vars.
- `.env.example` — example environment variables to copy to `.env`.

Environment variables (Vite):

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon/public key

Usage:

1. Copy `.env.example` to `.env` and fill values.
2. Install deps: `npm install` (this will install `@supabase/supabase-js`).
3. Run dev server: `npm run dev`.

Notes:

- This setup only initializes a client; it intentionally does not add features.
- Do NOT commit `.env` or secret keys. Use `.env.example` for reference.
