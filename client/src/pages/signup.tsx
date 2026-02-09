import AuthForm from "@/components/auth-form";
import TopHeader from "@/components/top-header";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "@/components/photo-upload.canonical";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { localizedClassForText } from "@/components/LocalizedText";
import { validateUsername } from "@/lib/validators";
import { LocalizedText } from "@/components/LocalizedText";

export default function SignupPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  // Call hooks unconditionally so hook order stays stable between renders.
  const { data: profile } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/profile");
      return res.json();
    },
    enabled: !!user,
  });

  const form = useForm<any>({
    defaultValues: {
      username: "",
      displayName: "",
      avatarUrl: "",
      bio: "",
    },
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
      return; // wait for next effect with lowercased value
    }

    const { valid, reason } = validateUsername(lower);
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

  useEffect(() => {
    if (profile) {
      form.reset({
        username: profile.username || "",
        displayName: profile.displayName || "",
        avatarUrl: profile.avatarUrl || "",
        bio: profile.bio || "",
      });
    }
  }, [profile]);

  // If an authenticated user navigates to /signup, redirect them away.
  // If their profile exists but `isComplete === false` send to /profile/complete,
  // otherwise send to /discover.
  useEffect(() => {
    if (!user) return;
    // If profile is undefined, the query is still loading; wait.
    if (profile === undefined) return;
    try {
      if ((profile as any).isComplete === false) {
        setLocation("/profile/complete");
      } else {
        setLocation("/discover");
      }
    } catch (e) {
      // ignore
    }
  }, [user, profile, setLocation]);

  const updateProfile = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("PUT", "/api/profile", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setLocation("/profile");
    },
  });

  // If unauthenticated, show the simple AuthForm signup flow
  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopHeader titleKey="auth.signup.title" />

        <main className="max-w-2xl mx-auto p-4">
          <h2 className="text-xl font-semibold mb-4">
            <LocalizedText>{t("auth.signup.create")}</LocalizedText>
          </h2>
          <AuthForm
            initialMode="signup"
            allowCollapse={false}
            hideModeSwitch={true}
          />
        </main>
      </div>
    );
  }

  // Authenticated: profile completion form (hooks declared above)

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopHeader titleKey="signup.completeProfile" />

      <main className="max-w-2xl mx-auto p-4">
        <h2 className="text-xl font-semibold mb-4">
          <LocalizedText>{t("signup.completeProfile")}</LocalizedText>
        </h2>

        <div className="space-y-3">
          <div>
            <Input
              {...form.register("username", { required: true })}
              placeholder={t("signup.usernamePlaceholder")}
              className={localizedClassForText(t("signup.usernamePlaceholder"))}
            />
            <div className="text-xs mt-1 text-muted-foreground">
              <LocalizedText>
                {usernameMessage || t("profile.usernameExample")}
              </LocalizedText>
            </div>
          </div>

          <Input
            {...form.register("displayName")}
            placeholder={t("signup.displayNamePlaceholder")}
            className={localizedClassForText(
              t("signup.displayNamePlaceholder"),
            )}
          />

          <div>
            <div className="text-sm font-medium mb-2">
              <LocalizedText>{t("profile.avatarLabel")}</LocalizedText>
            </div>
            <PhotoUpload
              value={form.getValues().avatarUrl}
              onChange={(v: string) => form.setValue("avatarUrl", v)}
              title={t("signup.avatar.add")}
              hint={t("signup.avatar.hint")}
            />
          </div>

          <Textarea
            {...form.register("bio")}
            placeholder={t("signup.bioPlaceholder")}
            className={localizedClassForText(t("signup.bioPlaceholder"))}
          />

          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white"
              onClick={() => {
                const vals = form.getValues();
                if (!vals.username || String(vals.username).trim() === "")
                  return;
                updateProfile.mutate({
                  username: vals.username,
                  displayName: vals.displayName,
                  avatarUrl: vals.avatarUrl,
                  bio: vals.bio,
                });
              }}
              disabled={!usernameValid || usernameAvailable !== true}
            >
              {usernameChecking ? (
                <LocalizedText>{t("signup.checking")}</LocalizedText>
              ) : (
                <LocalizedText>{t("signup.save")}</LocalizedText>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
