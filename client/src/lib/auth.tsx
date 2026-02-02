import React, { createContext, useContext, useEffect, useState } from "react";
import supabase from "./supabaseClient";

type AuthContextType = {
  user: any | null;
  session: any | null;
  signUp: (email: string, password: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);

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

  const signUp = async (email: string, password: string) => {
    const res = await supabase.auth.signUp({ email, password });
    // Profile creation is handled by a DB trigger on signup.

    return res;
  };

  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut }}>
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
