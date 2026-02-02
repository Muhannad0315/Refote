import { UserProfileHeader } from "@/components/user-profile-header";
import { CheckInCard } from "@/components/check-in-card";
import { CafeCard } from "@/components/cafe-card";
import {
  ProfileHeaderSkeleton,
  CheckInCardSkeleton,
} from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useI18n } from "@/lib/i18n";
import AuthForm from "@/components/auth-form";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coffee, Store } from "lucide-react";
import type { UserProfile, CheckInWithDetails } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "@/components/photo-upload";
import { validateUsername } from "@/lib/validators";

export default function Profile() {
  const { t, isRTL, language } = useI18n();
  const [activeTab, setActiveTab] = useState("checkins");
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Enforce: profile page only exists for authenticated users.
  // If no user is authenticated, redirect to `/discover`.
  useEffect(() => {
    if (!user) {
      setLocation("/discover");
    }
  }, [user, setLocation]);

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/profile");
      return res.json();
    },
    enabled: !!user,
  });

  // Demo profile for unauthenticated viewers
  const { data: demoProfile, isLoading: demoLoading } = useQuery<UserProfile>({
    queryKey: ["/api/demo-profile"],
    enabled: !user,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/demo-profile");
      return res.json();
    },
  });

  const [editing, setEditing] = useState(false);

  const form = useForm<any>({
    defaultValues: {
      username: profile?.username || "",
      displayName: profile?.displayName || "",
      bio: profile?.bio || "",
      avatarUrl: profile?.avatarUrl || "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        username: profile.username || "",
        displayName: profile.displayName,
        bio: profile.bio || "",
        avatarUrl: profile.avatarUrl || "",
      });
    }
  }, [profile]);

  // Username validation + availability (for edit flow)
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
          // If the username is taken but it matches the current user's username,
          // consider it available (user is keeping their own username).
          if (data.reason === "taken" && profile?.username === lower) {
            setUsernameAvailable(true);
            setUsernameMessage("");
          } else {
            setUsernameAvailable(false);
            if (data.reason === "taken")
              setUsernameMessage("Username already taken ❌");
            else if (data.reason === "reserved")
              setUsernameMessage("This username is reserved ❌");
            else setUsernameMessage("Username not available ❌");
          }
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
  }, [watchedUsername, profile?.username]);

  // Completion flow: require username if profile.isComplete === false
  const [usernameRequired, setUsernameRequired] = useState(false);
  useEffect(() => {
    if (profile && (profile as any).isComplete === false) {
      setUsernameRequired(true);
    } else {
      setUsernameRequired(false);
    }
  }, [profile]);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const updateProfile = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("PUT", "/api/profile", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setEditing(false);
    },
  });

  // add-friend flow removed — friend/follow UI is not available

  const { data: checkIns, isLoading: checkInsLoading } = useQuery<
    CheckInWithDetails[]
  >({
    queryKey: ["/api/profile/check-ins"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/profile/check-ins");
      return res.json();
    },
  });

  const uniqueCafes = (checkIns || [])
    .map((c) => c.cafe as any)
    .reduce((acc: any[], cafe: any) => {
      const key = cafe.placeId || cafe.id;
      if (!acc.find((x) => (x.placeId || x.id) === key)) acc.push(cafe);
      return acc;
    }, [] as any[]);

  // Badges temporarily hidden.

  // Remove server-side fallback; show demo profile when unauthenticated
  const displayedProfile = user ? profile : demoProfile;

  // If profile exists but onboarding incomplete, redirect to dedicated onboarding route
  useEffect(() => {
    if (user && profile && (profile as any).isComplete === false) {
      setLocation("/profile/complete");
    }
  }, [user, profile, setLocation]);
  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
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

      <main className="max-w-2xl mx-auto">
        {profileLoading || demoLoading ? (
          <ProfileHeaderSkeleton />
        ) : displayedProfile ? (
          <>
            <UserProfileHeader
              user={displayedProfile}
              isOwnProfile={!!user}
              onEdit={() => setEditing(true)}
            />

            {editing && user && (
              <div className="p-4">
                <div className="space-y-3">
                  <div>
                    <Input
                      {...form.register("username")}
                      placeholder="Username"
                    />
                    <div className="text-xs mt-1 text-muted-foreground">
                      {usernameMessage}
                    </div>
                  </div>

                  <Input
                    {...form.register("displayName")}
                    placeholder={t("profile.displayNamePlaceholder")}
                  />
                  <div>
                    <div className="text-sm font-medium mb-2">
                      {t("profile.avatarLabel")}
                    </div>
                    <div>
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
                  </div>

                  {/* Cover removed — uploading covers is no longer supported. */}

                  <Textarea
                    {...form.register("bio")}
                    placeholder={t("profile.bioPlaceholder")}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white"
                      onClick={() => updateProfile.mutate(form.getValues())}
                      disabled={
                        form.getValues().username !==
                          (profile?.username ?? "") &&
                        (!usernameValid || usernameAvailable !== true)
                      }
                    >
                      {usernameChecking ? "Checking..." : t("common.save")}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
                      onClick={() => setEditing(false)}
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <ProfileHeaderSkeleton />
        )}

        <div className="px-4 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList
              className={`w-full mb-4 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <TabsTrigger
                value="checkins"
                className="flex-1"
                data-testid="tab-checkins"
              >
                <Coffee className="h-4 w-4 me-2" />
                {t("profile.myCheckIns")}
              </TabsTrigger>
              <TabsTrigger
                value="cafes"
                className="flex-1"
                data-testid="tab-cafes"
              >
                <Store className="h-4 w-4 me-2" />
                {t("profile.uniqueDrinks")}
              </TabsTrigger>
              {/* Badges and Wishlist tabs removed temporarily */}
            </TabsList>

            <TabsContent value="checkins">
              {checkInsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <CheckInCardSkeleton key={i} />
                  ))}
                </div>
              ) : checkIns && checkIns.length > 0 ? (
                <div className="space-y-4">
                  {checkIns.map((checkIn) => (
                    <CheckInCard key={checkIn.id} checkIn={checkIn} />
                  ))}
                </div>
              ) : (
                <EmptyState type="profile" />
              )}
            </TabsContent>

            {/* Badges and Wishlist content removed temporarily */}
            <TabsContent value="cafes">
              {uniqueCafes.length > 0 ? (
                <div className="space-y-4 px-1">
                  {uniqueCafes.map((cafe) => (
                    <CafeCard
                      key={(cafe as any).id || (cafe as any).placeId}
                      cafe={cafe}
                      language={language}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState type="profile" />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
