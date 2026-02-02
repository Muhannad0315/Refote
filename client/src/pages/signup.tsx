import AuthForm from "@/components/auth-form";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "@/components/photo-upload";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { validateUsername } from "@/lib/validators";

export default function SignupPage() {
  const { user } = useAuth();
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
          <h2 className="text-xl font-semibold mb-4">Create your account</h2>
          <AuthForm initialMode="signup" allowCollapse={false} />
        </main>
      </div>
    );
  }

  // Authenticated: profile completion form (hooks declared above)

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

        <div className="space-y-3">
          <div>
            <Input
              {...form.register("username", { required: true })}
              placeholder="Username (required)"
            />
            <div className="text-xs mt-1 text-muted-foreground">
              {usernameMessage || "e.g. brew.john or john_coffee"}
            </div>
          </div>

          <Input {...form.register("displayName")} placeholder="Display name" />

          <div>
            <div className="text-sm font-medium mb-2">Avatar</div>
            <PhotoUpload
              value={form.getValues().avatarUrl}
              onChange={(v: string) => form.setValue("avatarUrl", v)}
              title="Add avatar"
              hint="Click to upload your avatar"
            />
          </div>

          <Textarea {...form.register("bio")} placeholder="Bio" />

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
              {usernameChecking ? "Checking..." : "Save"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
