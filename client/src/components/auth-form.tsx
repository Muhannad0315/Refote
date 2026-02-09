import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getUserFriendlyErrorMessage } from "@/lib/errorUtils";
import { useI18n } from "@/lib/i18n";
import { LocalizedText } from "@/components/LocalizedText";
import { Button } from "@/components/ui/button";
import supabase from "@/lib/supabaseClient";
import { localizedClassForText } from "@/components/LocalizedText";

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
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupCase, setSignupCase] = useState<
    "newEmail" | "existingEmail" | null
  >(null);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setEmailNotConfirmed(false);
    setLoading(true);
    try {
      if (mode === "signup") {
        const strong = /(?=.{8,})(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/.test(password);
        if (!strong) {
          setError(t("settings.passwordRequirements"));
          return;
        }
        if (!agreePrivacy || !agreeTerms) {
          setError(t("signup.errors.legalRequired"));
          return;
        }

        // Use server-side signup to ensure profile creation with acceptance is atomic.
        try {
          const r = await apiRequest("POST", "/api/signup", {
            email,
            password,
            termsAccepted: true,
            privacyAccepted: true,
          });
          const data = await r.json();

          // Rate limited by Supabase sending emails — extract cooldown if present
          if (r.status === 429) {
            const msg = String(data?.message || "").toLowerCase();
            const afterMatch = msg.match(/after\s+(\d+)\s*seconds/);
            const secondsMatch = msg.match(/(\d+)\s*seconds/);
            const seconds = afterMatch?.[1]
              ? Number(afterMatch[1])
              : secondsMatch?.[1]
              ? Number(secondsMatch[1])
              : 30;
            const template = t("auth.rateLimit.wait");
            setError(template.replace("{seconds}", String(seconds)));
            setResendCooldown(seconds);
            setLoading(false);
            return;
          }

          // Handle different signup outcomes (server returns friendly messages)
          if (data?.status === "confirmation_resent") {
            // Email already exists but unconfirmed: show success (resent confirmation)
            setSignupSuccess(true);
            setSignupCase("newEmail");
            setResendCooldown(60);
            setSuccessMessage(data?.message ?? null);
          } else if (
            data?.status === "email_already_confirmed" ||
            data?.error === "email_already_confirmed" ||
            r.status === 409
          ) {
            // Email exists and confirmed: direct to login
            setSignupSuccess(true);
            setSignupCase("existingEmail");
            setSuccessMessage(data?.message ?? null);
          } else if (data?.user) {
            // Normal signup success
            setSignupSuccess(true);
            setSignupCase("newEmail");
            setResendCooldown(60);
            setSuccessMessage(null);
          } else {
            // Unexpected response - show friendly server message or fallback
            setError(data?.message || t("common.error"));
          }

          // If the auth context already contains a logged-in user, redirect
          // to profile immediately. This covers cases where signup resulted
          // in an authenticated session (or the user was already logged in).
          if (user) {
            setLocation("/profile");
            setLoading(false);
            return;
          }
        } catch (err: any) {
          // apiRequest throws for non-2xx responses. Inspect the thrown
          // error message which is formatted as `<status>: <body>` and
          // try to parse a JSON body for friendly handling (e.g. 409).
          try {
            const msg = String(err?.message || "");
            const m = msg.match(/^\s*(\d{3}):\s*(.*)$/s);
            if (m) {
              const statusCode = Number(m[1]);
              const bodyText = m[2] || "";
              try {
                const parsed = JSON.parse(bodyText);
                if (
                  parsed?.error === "email_already_confirmed" ||
                  parsed?.status === "email_already_confirmed" ||
                  statusCode === 409
                ) {
                  setSignupSuccess(true);
                  setSignupCase("existingEmail");
                  setSuccessMessage(parsed?.message ?? null);
                  setLoading(false);
                  return;
                }
              } catch (_e) {
                // not JSON, fall through
              }
            }
          } catch (_e) {
            // ignore parsing errors
          }

          // Fallback: network or unknown failure — show a calm, generic message
          setError(t("common.error"));
        }
      } else {
        const res = await signIn(email, password);
        if (res.error) {
          // Check if email is not confirmed
          if (
            res.error.message?.includes("Email not confirmed") ||
            res.error.message?.includes("email_not_confirmed") ||
            res.error.status === 422
          ) {
            // Email not confirmed - show recovery UI
            setEmailNotConfirmed(true);
            setError(null);
          } else {
            // Login errors - intercept the specific Supabase text and show i18n message
            const raw = String(res.error?.message || "").toLowerCase();
            if (
              raw.includes("invalid login credentials") ||
              raw.includes("invalid credentials") ||
              res.error?.status === 401
            ) {
              setError(t("auth.errors.invalidLogin"));
            } else {
              // Fallback to existing mapping for network/other errors
              setError(getUserFriendlyErrorMessage(res.error));
            }
          }
        } else {
          // Login succeeded - check if session/user present and redirect
          const sessionUser = (res as any)?.data?.session?.user;
          if (sessionUser) {
            setLocation("/profile");
            return;
          }

          // If no immediate session object returned, refresh profile cache
          // and close the form; the auth state listener will update `user`.
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
      setError(getUserFriendlyErrorMessage(err));
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

  // Cooldown timer effect for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Handle resend confirmation email with rate-limit handling
  const handleResendEmail = async () => {
    setResendLoading(true);
    setResendError(null);
    try {
      const { error: resendErrorObj } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (resendErrorObj) {
        // Handle rate-limit errors with friendly message
        if (
          resendErrorObj.message?.includes("rate") ||
          resendErrorObj.message?.includes("too many")
        ) {
          setResendError(t("profile.resendTooMany"));
        } else if (resendErrorObj.message?.includes("not found")) {
          setResendError(t("auth.emailNotFound"));
        } else {
          // Use centralized error mapper for network/unknown errors
          setResendError(getUserFriendlyErrorMessage(resendErrorObj));
        }
      } else {
        // Start 60-second cooldown
        setResendCooldown(60);
        setResendError(null);
      }
    } catch (err: any) {
      const friendlyError = getUserFriendlyErrorMessage(err);
      setResendError(
        friendlyError.includes("servers right now")
          ? friendlyError
          : "Failed to resend email. Please try again.",
      );
    } finally {
      setResendLoading(false);
    }
  };

  // Handle password reset request
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetEmail || email,
      );
      if (error) {
        setError(getUserFriendlyErrorMessage(error));
      } else {
        setResetSent(true);
      }
    } catch (err: any) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // collapse on outside click
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!allowCollapse) return;
    function handleClick(e: Event) {
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
            title={
              user
                ? `${t("profile.displayNamePlaceholder")}: ${displayName}`
                : t("auth.goToLogin")
            }
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
            {user ? (
              <LocalizedText className="text-sm">{displayName}</LocalizedText>
            ) : (
              <LocalizedText className="text-sm">
                {t("auth.login.submit")}
              </LocalizedText>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMode("signup");
              setCollapsedNotify(false);
            }}
            title={t("auth.signup.submit")}
            aria-label={t("auth.signup.submit")}
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
              <LocalizedText>
                {t(
                  mode === "login"
                    ? "auth.login.cardTitle"
                    : "auth.signup.cardTitle",
                )}
              </LocalizedText>
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
              <p className="mb-2">
                <LocalizedText>{t("auth.signedInAs")}</LocalizedText>{" "}
                <LocalizedText>{displayName}</LocalizedText>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => signOut()}
                >
                  <LocalizedText>{t("auth.signOut")}</LocalizedText>
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
            <>
              {signupSuccess &&
              mode === "signup" &&
              signupCase === "newEmail" ? (
                // Case 1: Email does NOT exist - show confirmation message
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      <LocalizedText>
                        {t("auth.sentConfirmationTitle")}
                      </LocalizedText>
                    </h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                      {successMessage ? (
                        <span>{successMessage}</span>
                      ) : (
                        <LocalizedText>{t("auth.checkInbox")}</LocalizedText>
                      )}
                    </p>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {email}
                    </p>
                  </div>

                  {resendError && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {resendError}
                    </div>
                  )}

                  <Button
                    onClick={handleResendEmail}
                    disabled={resendCooldown > 0 || resendLoading}
                    className="w-full"
                  >
                    <LocalizedText>
                      {resendCooldown > 0
                        ? `${t("profile.resendIn")} ${resendCooldown}s`
                        : resendLoading
                        ? t("profile.sending")
                        : t("profile.resendConfirmationEmail")}
                    </LocalizedText>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSignupSuccess(false);
                      setSignupCase(null);
                      setEmail("");
                      setPassword("");
                    }}
                    className="w-full"
                  >
                    <LocalizedText>{t("auth.changeEmail")}</LocalizedText>
                  </Button>
                </div>
              ) : signupSuccess &&
                mode === "signup" &&
                signupCase === "existingEmail" ? (
                // Case 2: Email EXISTS - show login redirect message
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      <LocalizedText>
                        {t("auth.emailAlreadyConfirmed.message")}
                      </LocalizedText>
                    </h3>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <LocalizedText>
                        {t("auth.emailAlreadyConfirmed.message")}
                      </LocalizedText>
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      // Navigate to explicit login route per routing requirements
                      setLocation("/login");
                    }}
                    className="w-full font-semibold shadow-md"
                    autoFocus
                  >
                    <LocalizedText>{t("auth.goToLogin")}</LocalizedText>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      // Reuse the existing forgot-password UI from the login flow.
                      // Switch to login mode, clear the signup state, preserve the entered email,
                      // and open the existing reset form (no reset logic changes).
                      setMode("login");
                      setSignupSuccess(false);
                      setSignupCase(null);
                      setResetEmail(email);
                      setShowPasswordReset(true);
                    }}
                    className="w-full"
                  >
                    <LocalizedText>{t("auth.forgotPassword")}</LocalizedText>
                  </Button>
                </div>
              ) : emailNotConfirmed && mode === "login" ? (
                // Login error: Email NOT confirmed
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                      <LocalizedText>
                        {t("profile.confirmEmailTitle")}
                      </LocalizedText>
                    </h3>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      <LocalizedText>{t("auth.confirmExpired")}</LocalizedText>
                    </p>
                  </div>

                  {resendError && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {resendError}
                    </div>
                  )}

                  <Button
                    onClick={handleResendEmail}
                    disabled={resendCooldown > 0 || resendLoading}
                    className="w-full"
                  >
                    <LocalizedText>
                      {resendCooldown > 0
                        ? `${t("profile.resendIn")} ${resendCooldown}s`
                        : resendLoading
                        ? t("profile.sending")
                        : t("profile.resendConfirmationEmail")}
                    </LocalizedText>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setEmailNotConfirmed(false);
                      setEmail("");
                      setPassword("");
                    }}
                    className="w-full"
                  >
                    <LocalizedText>{t("auth.changeEmail")}</LocalizedText>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => setEmailNotConfirmed(false)}
                    className="w-full"
                  >
                    <LocalizedText>{t("auth.backToLogin")}</LocalizedText>
                  </Button>
                </div>
              ) : showPasswordReset ? (
                // Password reset form
                <form
                  onSubmit={handlePasswordReset}
                  className="flex flex-col gap-2"
                >
                  <div className="p-3 bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                    <p className="font-semibold mb-1">
                      <LocalizedText>{t("auth.resetTitle")}</LocalizedText>
                    </p>
                    <p>
                      <LocalizedText>
                        {t("auth.resetInstructions")}
                      </LocalizedText>
                    </p>
                  </div>
                  <input
                    value={resetEmail || email}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder={t("auth.emailPlaceholder")}
                    type="email"
                    required
                    className={`w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white ${localizedClassForText(
                      t("auth.emailPlaceholder"),
                    )}`}
                  />
                  {error && (
                    <div className="text-red-600 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  {resetSent && (
                    <div className="p-3 bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm">
                      <p className="font-semibold mb-1">
                        <LocalizedText>
                          {t("auth.checkYourEmail")}
                        </LocalizedText>
                      </p>
                      <p>
                        <LocalizedText>{t("auth.resetSentBody")}</LocalizedText>{" "}
                        <strong>{resetEmail || email}</strong>.
                      </p>
                      <p className="mt-2">
                        <LocalizedText>
                          {t("auth.resetSentFooter")}
                        </LocalizedText>
                      </p>
                      <p className="text-xs mt-2 opacity-80">
                        <LocalizedText>
                          {t("auth.resetSentCheckSpam")}
                        </LocalizedText>
                      </p>
                    </div>
                  )}
                  <Button type="submit" disabled={loading} className="w-full">
                    <LocalizedText>
                      {loading
                        ? t("profile.sending")
                        : t("auth.sendResetEmail")}
                    </LocalizedText>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowPasswordReset(false);
                      setResetEmail("");
                      setResetSent(false);
                      setError(null);
                    }}
                    className="w-full"
                  >
                    <LocalizedText>{t("auth.backToLogin")}</LocalizedText>
                  </Button>
                </form>
              ) : (
                // Login/signup form
                <form onSubmit={onSubmit} className="flex flex-col gap-2">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.emailPlaceholder")}
                    type="email"
                    required
                    disabled={signupSuccess}
                    className={`w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white disabled:opacity-50 ${localizedClassForText(
                      t("auth.emailPlaceholder"),
                    )}`}
                  />

                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    type="password"
                    required
                    disabled={signupSuccess}
                    className={`w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white disabled:opacity-50 ${localizedClassForText(
                      t("auth.passwordPlaceholder"),
                    )}`}
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

                  {error && (
                    <div className="text-red-600 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  {/* Legal acceptance checkboxes (signup only) */}
                  {mode === "signup" && (
                    <div className="space-y-2 mt-2 text-sm">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={agreePrivacy}
                          onChange={(e) => setAgreePrivacy(e.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          <LocalizedText>
                            {t("signup.legal.privacyPrefix")}
                          </LocalizedText>{" "}
                          <a href="/privacy" className="text-primary">
                            <LocalizedText>
                              {t("signup.legal.privacy")}
                            </LocalizedText>
                          </a>
                        </span>
                      </label>

                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          <LocalizedText>
                            {t("signup.legal.termsPrefix")}
                          </LocalizedText>{" "}
                          <a href="/terms" className="text-primary">
                            <LocalizedText>
                              {t("signup.legal.terms")}
                            </LocalizedText>
                          </a>
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      disabled={
                        loading ||
                        signupSuccess ||
                        resendCooldown > 0 ||
                        (mode === "signup" && (!agreePrivacy || !agreeTerms))
                      }
                      type="submit"
                    >
                      <LocalizedText>
                        {t(
                          mode === "login"
                            ? "auth.login.submit"
                            : "auth.signup.submit",
                        )}
                      </LocalizedText>
                    </Button>

                    {resendCooldown > 0 && (
                      <div className="self-center text-sm text-gray-600 dark:text-gray-300">
                        {t("auth.rateLimit.wait").replace(
                          "{seconds}",
                          String(resendCooldown),
                        )}
                      </div>
                    )}

                    {mode === "login" && (
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setShowPasswordReset(true)}
                      >
                        <LocalizedText>
                          {t("auth.forgotPassword")}
                        </LocalizedText>
                      </Button>
                    )}

                    {!hideModeSwitch && (
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() =>
                          setLocation(mode === "login" ? "/signup" : "/login")
                        }
                      >
                        <LocalizedText>
                          {mode === "login"
                            ? t("auth.switch.toSignup")
                            : t("auth.switch.toLogin")}
                        </LocalizedText>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
