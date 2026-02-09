import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UserProfile } from "@shared/schema";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getUserFriendlyErrorMessage } from "@/lib/errorUtils";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import LocalizedText, {
  localizedClassForText,
} from "@/components/LocalizedText";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Link } from "wouter";
import { PhotoUpload } from "@/components/photo-upload.canonical";
import { validateUsername } from "@/lib/validators";
import TopHeader from "@/components/top-header";
import BackButton from "@/components/back-button";
import supabase from "@/lib/supabaseClient";

export default function ProfileComplete() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/profile");
      return res.json();
    },
    enabled: !!user,
  });

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const form = useForm<any>({
    defaultValues: { username: "", displayName: "", bio: "", avatarUrl: "" },
  });
  const watchedUsername = form.watch("username");

  const [usernameValid, setUsernameValid] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [usernameMessage, setUsernameMessage] = useState<string>("");

  useEffect(() => {
    let isActive = true;
    const raw = String(watchedUsername || "");
    const lower = raw.toLowerCase();
    if (raw !== lower) {
      form.setValue("username", lower, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    const { valid, reason } = validateUsername(lower as string);
    if (!valid) {
      setUsernameValid(false);
      setUsernameAvailable(null);
      setUsernameChecking(false);
      if (reason === "length") setUsernameMessage(t("signup.username.length"));
      else if (reason === "reserved")
        setUsernameMessage(t("signup.username.reserved"));
      else setUsernameMessage(t("signup.username.invalidChars"));
      return;
    }

    setUsernameValid(true);
    setUsernameChecking(true);
    setUsernameMessage(t("signup.username.checking"));
    setUsernameAvailable(null);

    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/profiles/check-username?username=${encodeURIComponent(lower)}`,
        );
        const data = await res.json();
        if (!isActive) return;
        if (data.available) {
          setUsernameAvailable(true);
          setUsernameMessage(t("signup.username.available"));
        } else {
          setUsernameAvailable(false);
          if (data.reason === "taken")
            setUsernameMessage(t("signup.username.taken"));
          else if (data.reason === "reserved")
            setUsernameMessage(t("signup.username.reserved"));
          else setUsernameMessage(t("signup.username.notAvailable"));
        }
      } catch (e) {
        if (!isActive) return;
        setUsernameAvailable(false);
        setUsernameMessage(t("signup.username.errorChecking"));
      } finally {
        if (isActive) setUsernameChecking(false);
      }
    }, 500);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [watchedUsername]);

  const updateProfile = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("PUT", "/api/profile", payload);
      return res.json();
    },
    onSuccess: (data: any) => {
      // Mark canonical profile in cache and redirect to Discover
      try {
        queryClient.setQueryData(["/api/profile"], data);
      } catch (e) {
        // noop
      }
      setLocation("/discover");
    },
  });

  // Handle resend confirmation email with rate-limit handling
  const handleResendConfirmation = async () => {
    setResendLoading(true);
    setResendError(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user?.email || "",
      });

      if (error) {
        // Handle rate-limit errors with friendly message
        if (
          error.message?.includes("rate") ||
          error.message?.includes("too many")
        ) {
          setResendError(t("profile.resendTooMany"));
        } else {
          setResendError(t("profile.resendFailed"));
        }
      } else {
        // Start cooldown after successful resend
        setResendCooldown(60);
        setResendError(null);
      }
    } catch (err: any) {
      setResendError(getUserFriendlyErrorMessage(err));
    } finally {
      setResendLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    setLocation("/login");
  };

  useEffect(() => {
    // Routing & access control:
    // - Not authenticated -> redirect to /discover
    // - Authenticated and already complete -> redirect to /discover
    if (!user) {
      setLocation("/discover");
      return;
    }
    if (!profileLoading && profile && (profile as any).isComplete === true) {
      setLocation("/discover");
      return;
    }
    // Otherwise stay on this page when isComplete === false
  }, [user, profile, profileLoading, setLocation]);

  // populate form when profile loads
  useEffect(() => {
    if (!profile) return;
    form.reset({
      username: profile.username ?? "",
      displayName: profile.displayName ?? "",
      bio: profile.bio ?? "",
      avatarUrl: profile.avatarUrl ?? "",
    });
  }, [profile]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopHeader titleKey="profile.completeTitle" />
      <BackButton href="/discover" />

      <main className="max-w-2xl mx-auto p-4">
        {/* Email Confirmation Blocked Message */}
        {!user?.email_confirmed_at && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              <LocalizedText>{t("profile.confirmEmailTitle")}</LocalizedText>
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              <LocalizedText>{t("profile.confirmEmailBody")}</LocalizedText>
              <span className="font-medium">{user?.email}</span>.
            </p>

            <p className="text-xs text-blue-700 dark:text-blue-300 mb-4">
              <strong>
                <LocalizedText>{t("profile.didntSeeEmail")}</LocalizedText>
              </strong>{" "}
              <LocalizedText>{t("profile.checkSpam")}</LocalizedText>
            </p>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendConfirmation}
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
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full"
              >
                <LocalizedText>{t("auth.signOut")}</LocalizedText>
              </Button>
            </div>

            {resendError && (
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-3 bg-blue-100 dark:bg-blue-950/40 p-2 rounded">
                {resendError}
              </p>
            )}
          </div>
        )}

        <h2 className="text-xl font-semibold mb-4">
          <LocalizedText>{t("profile.completeTitle")}</LocalizedText>
        </h2>
        <p className="mb-4">
          <LocalizedText>{t("profile.completeDescription")}</LocalizedText>
        </p>
        <div className="space-y-3">
          <div>
            <Input
              {...form.register("username")}
              placeholder={t("profile.usernamePlaceholder")}
              className={localizedClassForText(
                t("profile.usernamePlaceholder"),
              )}
            />
            <div className="text-xs mt-1 text-muted-foreground">
              <LocalizedText>
                {usernameMessage || t("profile.usernameExample")}
              </LocalizedText>
            </div>
          </div>

          <div>
            <Input
              {...form.register("displayName")}
              placeholder={t("profile.displayNamePlaceholder")}
              className={localizedClassForText(
                t("profile.displayNamePlaceholder"),
              )}
            />
          </div>

          <div>
            <div className="text-sm font-medium mb-2">
              <LocalizedText>{t("profile.avatarLabel")}</LocalizedText>
            </div>

            <PhotoUpload
              photoUrl={form.watch("avatarUrl")}
              onPhotoChange={(url) => form.setValue("avatarUrl", url)}
              title={t("profile.avatarLabel")}
              hint={t("photo.dragDrop")}
            />
          </div>

          <Textarea
            {...form.register("bio")}
            placeholder={t("profile.bioPlaceholder")}
            className={localizedClassForText(t("profile.bioPlaceholder"))}
          />

          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white"
              onClick={() => {
                const v = form.getValues().username;
                if (!v || String(v).trim() === "") return;
                const payload: any = {
                  username: v,
                  isComplete: true,
                  displayName: form.getValues().displayName,
                  avatarUrl: form.getValues().avatarUrl,
                  bio: form.getValues().bio,
                };
                updateProfile.mutate(payload);
              }}
              disabled={!usernameValid || usernameAvailable !== true}
            >
              <LocalizedText>
                {usernameChecking ? t("common.loading") : t("common.save")}
              </LocalizedText>
            </button>

            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                setLocation("/signup");
              }}
            >
              <LocalizedText>{t("auth.signOut")}</LocalizedText>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
