import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

export default function AuthForm({
  allowCollapse = true,
  initialMode = "login",
  hideModeSwitch = false,
  open,
  onOpenChange,
}: {
  initialMode?: "login" | "signup";
  hideModeSwitch?: boolean;
  allowCollapse?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { user, signUp, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(true);

  // if parent controls `open`, derive initial collapsed state from it
  useEffect(() => {
    if (open === undefined) return;
    setCollapsed(!open);
  }, [open]);

  // helper to update collapsed state and notify parent about `open`
  function setCollapsedNotify(v: boolean) {
    setCollapsed(v);
    if (onOpenChange) onOpenChange(!v);
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const strong = /(?=.{8,})(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/.test(password);
        if (!strong) {
          setError(
            "Password must be at least 8 characters and include upper/lowercase and a number",
          );
          return;
        }
        const res = await signUp(email, password);
        if (res.error) {
          setError(res.error.message || "Sign up failed");
        } else {
          await queryClient.fetchQuery({
            queryKey: ["/api/profile"],
            queryFn: async () => {
              const r = await apiRequest("GET", "/api/profile");
              return r.json();
            },
          });
          // Add a small cache-bust token so image consumers can force-refresh
          try {
            queryClient.setQueryData(["/api/profile"], (old: any) => ({
              ...(old || {}),
              __cacheBust: Date.now(),
            }));
          } catch (_) {
            // noop
          }
          setCollapsedNotify(true);
        }
      } else {
        const res = await signIn(email, password);
        if (res.error) {
          setError(res.error.message || "Sign in failed");
        } else {
          await queryClient.fetchQuery({
            queryKey: ["/api/profile"],
            queryFn: async () => {
              const r = await apiRequest("GET", "/api/profile");
              return r.json();
            },
          });
          try {
            queryClient.setQueryData(["/api/profile"], (old: any) => ({
              ...(old || {}),
              __cacheBust: Date.now(),
            }));
          } catch (_) {
            // noop
          }
          setCollapsedNotify(true);
        }
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const profile = queryClient.getQueryData(["/api/profile"]) as any | undefined;
  const displayName =
    profile?.username ||
    profile?.name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split("@")[0] : null) ||
    user?.email ||
    "";

  // collapse on outside click
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!allowCollapse) return;
    function handleClick(e: MouseEvent) {
      if (collapsed) return;
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setCollapsedNotify(true);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [allowCollapse, collapsed]);

  const controlled = open !== undefined;
  if (controlled && !open) {
    return <div ref={rootRef} />;
  }

  return (
    <div ref={rootRef}>
      {!controlled && allowCollapse && collapsed ? (
        <div className="p-1 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMode("login");
              setCollapsedNotify(false);
            }}
            title={user ? `Signed in as ${displayName}` : "Open login"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.63 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-sm">{user ? displayName : "Login"}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMode("signup");
              setCollapsedNotify(false);
            }}
            title="Sign up"
            aria-label="Sign up"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </Button>
        </div>
      ) : (
        <div className="p-4 border rounded bg-gray-100 dark:bg-background min-w-[360px]">
          <div className="flex items-center justify-between">
            <h3 className="mb-2 text-lg font-medium">
              {mode === "login" ? "Login" : "Sign up"}
            </h3>
            {allowCollapse && !controlled ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsedNotify(true)}
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            ) : null}
          </div>

          {user ? (
            <div>
              <p className="mb-2">Signed in as {displayName}</p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => signOut()}
                >
                  Sign out
                </Button>
                {allowCollapse && !controlled ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCollapsedNotify(true)}
                    aria-label="Hide"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                required
                className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                required
                className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
              />

              {allowCollapse && !controlled ? (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCollapsedNotify(true)}
                    aria-label="Hide"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </Button>
                </div>
              ) : null}

              {error && <div className="text-red-600">{error}</div>}

              <div className="flex gap-2">
                <Button disabled={loading} type="submit">
                  {mode === "login" ? "Login" : "Sign up"}
                </Button>

                {!hideModeSwitch && (
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() =>
                      setMode(mode === "login" ? "signup" : "login")
                    }
                  >
                    Switch to {mode === "login" ? "Sign up" : "Login"}
                  </Button>
                )}

                {allowCollapse && !controlled ? (
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setCollapsedNotify(true)}
                    aria-label="Collapse"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 12H4"
                      />
                    </svg>
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
