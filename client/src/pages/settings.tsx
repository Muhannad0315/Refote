import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import supabase from "@/lib/supabaseClient";
import { getUserFriendlyErrorMessage } from "@/lib/errorUtils";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import TopHeader from "@/components/top-header";
import BackButton from "@/components/back-button";
import { Settings as SettingsIcon } from "lucide-react";
import {
  LocalizedText,
  localizedClassForText,
} from "@/components/LocalizedText";

export default function Settings() {
  const { user, authResolved } = useAuth();
  const [, setLocation] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { t } = useI18n();

  // Redirect if not authenticated
  useEffect(() => {
    if (authResolved && !user) {
      setLocation("/signup");
    }
  }, [authResolved, user, setLocation]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate inputs
    if (!newPassword || !confirmPassword) {
      setError(t("settings.enterNewPassword"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("settings.passwordMismatch"));
      return;
    }

    const strong = /(?=.{8,})(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/.test(newPassword);
    if (!strong) {
      setError(t("settings.passwordStrength"));
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(getUserFriendlyErrorMessage(updateError));
      } else {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Reset success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
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
      <TopHeader
        titleKey="settings.title"
        leftIcon={<SettingsIcon className="h-4 w-4 text-primary" />}
      />
      {/* Back button below header */}
      <BackButton
        onClick={() => setLocation("/profile")}
        testId="button-back"
      />

      <main className="max-w-md mx-auto p-4 mt-4">
        <div className="space-y-6">
          {/* Change Password Section */}
          <section>
            <h2 className="text-xl font-bold mb-4">
              <LocalizedText>{t("settings.changePassword")}</LocalizedText>
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-3">
              {/* Note: Current password validation is optional since Supabase 
                  doesn't require it for authenticated users. We include the field 
                  for UX best practices but don't enforce it. */}
              {/*<div>
                <label className="block text-sm font-medium mb-1">
                  Current password (optional)
                </label>
                <input
                  type="password"
                  placeholder="Your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We recommend entering your current password for security
                </p>
              </div>*/}

              <div>
                <label className="block text-sm font-medium mb-1">
                  <LocalizedText>{t("settings.newPassword")}</LocalizedText>
                </label>
                <input
                  type="password"
                  placeholder={t("settings.newPasswordPlaceholder")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

              <div>
                <label className="block text-sm font-medium mb-1">
                  <LocalizedText>
                    {t("settings.confirmNewPassword")}
                  </LocalizedText>
                </label>
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
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-200">
                  <LocalizedText>{t("settings.passwordUpdated")}</LocalizedText>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <LocalizedText>{t("settings.updating")}</LocalizedText>
                ) : (
                  <LocalizedText>{t("settings.updatePassword")}</LocalizedText>
                )}
              </Button>
            </form>
          </section>

          {/* Optional: Other settings can go here */}
        </div>
      </main>
    </div>
  );
}
