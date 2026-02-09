-- Fix RLS policies for profiles table to allow users to read, insert, and update their own profile
-- UPSERT requires SELECT, INSERT, and UPDATE policies to all pass

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "select own profile" ON profiles;
DROP POLICY IF EXISTS "insert own profile" ON profiles;
DROP POLICY IF EXISTS "update own profile" ON profiles;

-- SELECT: Users can only read their own profile row
CREATE POLICY "select own profile"
ON profiles
FOR SELECT
TO public
USING (auth.uid() = user_id);

-- INSERT: Users can only insert their own profile row
CREATE POLICY "insert own profile"
ON profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own profile row
CREATE POLICY "update own profile"
ON profiles
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
