import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UserProfile } from "@shared/schema";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { validateUsername } from "@/lib/validators";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";

export default function ProfileComplete() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/profile");
      return res.json();
    },
    enabled: !!user,
  });

  const form = useForm<any>({
    defaultValues: { username: "", displayName: "", bio: "", avatarUrl: "" },
  });
  const watchedUsername = form.watch("username");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

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
      if (reason === "length")
        setUsernameMessage("Username must be 3–20 characters");
      else if (reason === "reserved")
        setUsernameMessage("This username is reserved");
      else
        setUsernameMessage(
          "Only lowercase letters, numbers, . and _ allowed; cannot start or end with . or _",
        );
      return;
    }

    setUsernameValid(true);
    setUsernameChecking(true);
    setUsernameMessage("Checking availability...");
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
          setUsernameMessage("Username available ✅");
        } else {
          setUsernameAvailable(false);
          if (data.reason === "taken")
            setUsernameMessage("Username already taken ❌");
          else if (data.reason === "reserved")
            setUsernameMessage("This username is reserved ❌");
          else setUsernameMessage("Username not available ❌");
        }
      } catch (e) {
        if (!isActive) return;
        setUsernameAvailable(false);
        setUsernameMessage("Error checking username");
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
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="relative">
          <div className="absolute inset-x-0 flex justify-center pointer-events-none">
            <a
              href="/"
              className="pointer-events-auto font-serif text-xl font-bold"
            >
              Cafnote
            </a>
          </div>
          <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
            <div />
            <div className="flex items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <h2 className="text-xl font-semibold mb-4">Complete your profile</h2>
        <p className="mb-4">
          Please choose a username and complete your profile.
        </p>
        <div className="space-y-3">
          <div>
            <Input {...form.register("username")} placeholder="Username" />
            <div className="text-xs mt-1 text-muted-foreground">
              {usernameMessage || "e.g. brew.john or john_coffee"}
            </div>
          </div>

          <div>
            <Input
              {...form.register("displayName")}
              placeholder={t("profile.displayNamePlaceholder")}
            />
          </div>

          <div>
            <div className="text-sm font-medium mb-2">
              {t("profile.avatarLabel")}
            </div>

            <input
              ref={avatarInputRef}
              id="avatar-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const result = reader.result as string;
                    form.setValue("avatarUrl", result);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              data-testid="input-avatar-form"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
                onClick={() => avatarInputRef.current?.click()}
              >
                {t("common.changePhoto")}
              </button>
              {form.watch("avatarUrl") && (
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
                  onClick={() => form.setValue("avatarUrl", "")}
                >
                  {t("common.remove")}
                </button>
              )}
            </div>
          </div>

          <Textarea
            {...form.register("bio")}
            placeholder={t("profile.bioPlaceholder")}
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
              {usernameChecking ? "Checking..." : t("common.save")}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
