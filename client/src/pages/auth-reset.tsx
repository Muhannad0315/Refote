import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import supabase from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import { getUserFriendlyErrorMessage } from "@/lib/errorUtils";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { Link } from "wouter";
import TopHeader from "@/components/top-header";
import BackButton from "@/components/back-button";
import { localizedClassForText } from "@/components/LocalizedText";

export default function AuthReset() {
  const [, setLocation] = useLocation();
  const { user, authResolved } = useAuth();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if user is authenticated (should be redirected here from reset email)
  useEffect(() => {
    if (!authResolved) return;

    if (!user) {
      // Not authenticated - redirect to login
      setLocation("/signup");
    }
  }, [user, authResolved, setLocation]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    if (!password || !confirmPassword) {
      setError("Please enter your new password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const strong = /(?=.{8,})(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/.test(password);
    if (!strong) {
      setError(
        "Password must be at least 8 characters and include upper/lowercase and a number",
      );
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(getUserFriendlyErrorMessage(updateError));
      } else {
        setSuccess(true);
        // User must explicitly navigate - do NOT auto-redirect
      }
    } catch (err: any) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!authResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LocalizedText>{t("common.loading")}</LocalizedText>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopHeader titleKey="auth.resetTitle" />
      <BackButton href="/signup" />

      <main className="max-w-md mx-auto p-4 mt-8">
        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h2 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                <LocalizedText>{t("settings.passwordUpdated")}</LocalizedText>
              </h2>
              <p className="text-sm text-green-800 dark:text-green-200">
                <LocalizedText>
                  {t("auth.passwordChangedDescription")}
                </LocalizedText>
              </p>
            </div>

            <Button onClick={() => setLocation("/signup")} className="w-full">
              <LocalizedText>{t("auth.goToLogin")}</LocalizedText>
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4">
              <LocalizedText>{t("auth.resetTitle")}</LocalizedText>
            </h2>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <input
                  type="password"
                  placeholder={t("settings.newPasswordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white ${localizedClassForText(
                    t("settings.newPasswordPlaceholder"),
                  )}`}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  <LocalizedText>
                    {t("settings.passwordRequirements")}
                  </LocalizedText>
                </p>
              </div>

              <input
                type="password"
                placeholder={t("settings.confirmNewPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white ${localizedClassForText(
                  t("settings.confirmNewPasswordPlaceholder"),
                )}`}
                required
              />

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                <LocalizedText>
                  {loading
                    ? t("settings.updating")
                    : t("settings.updatePassword")}
                </LocalizedText>
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setLocation("/signup")}
              >
                <LocalizedText>{t("auth.backToSignup")}</LocalizedText>
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
