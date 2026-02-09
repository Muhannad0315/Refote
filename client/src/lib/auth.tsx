import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import supabase from "./supabaseClient";

type AuthContextType = {
  user: any | null;
  session: any | null;
  authResolved: boolean;
  signUp: (
    email: string,
    password: string,
    termsAccepted?: boolean,
    privacyAccepted?: boolean,
  ) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
  sessionInvalid?: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [sessionInvalid, setSessionInvalid] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let mounted = true;

    // Check current session on load
    supabase.auth
      .getSession()
      .then((res: any) => {
        if (!mounted) return;
        const s = res?.data?.session ?? null;
        setSession(s);
        setUser(s?.user ?? null);
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        if (!mounted) return;
        setAuthResolved(true);
      });

    // Subscribe to auth state changes so session persists across refresh
    const { data: listener } = supabase.auth.onAuthStateChange((_, s) => {
      const sess = (s as any) ?? null;
      setSession(sess);
      setUser(sess?.user ?? null);
    });

    return () => {
      mounted = false;
      try {
        (listener as any)?.subscription?.unsubscribe?.();
      } catch (_) {
        // noop
      }
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    termsAccepted = false,
    privacyAccepted = false,
  ) => {
    // Pass acceptance as user metadata so server-side signup / triggers can read it.
    const res = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          terms_accepted: termsAccepted === true,
          privacy_accepted: privacyAccepted === true,
        },
      },
    } as any);
    // Profile creation is handled by a DB trigger on signup.

    return res;
  };

  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = () => supabase.auth.signOut();

  // Handle SESSION_INVALID: expose method to invalidate session when user is deleted
  const invalidateSession = async () => {
    setSessionInvalid(true);
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        authResolved,
        signUp,
        signIn,
        signOut,
        sessionInvalid,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
