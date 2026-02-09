import { UserProfileHeader } from "@/components/user-profile-header";
import { Link } from "wouter";
import { CheckInCard } from "@/components/check-in-card";
import { CafeCard } from "@/components/cafe-card";
import {
  ProfileHeaderSkeleton,
  CheckInCardSkeleton,
} from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import TopHeader from "@/components/top-header";
import { useI18n } from "@/lib/i18n";
import LocalizedText, {
  localizedClassForText,
} from "@/components/LocalizedText";
import AuthForm from "@/components/auth-form";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coffee, Store, User } from "lucide-react";
import type { UserProfile, CheckInWithDetails } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "@/components/photo-upload.canonical";
import { validateUsername } from "@/lib/validators";

export default function Profile() {
  const { t, isRTL, language } = useI18n();
  const [activeTab, setActiveTab] = useState("checkins");
  const { user, authResolved } = useAuth();
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
          // If the username is taken but it matches the current user's username,
          // consider it available (user is keeping their own username).
          if (data.reason === "taken" && profile?.username === lower) {
            setUsernameAvailable(true);
            setUsernameMessage("");
          } else {
            setUsernameAvailable(false);
            if (data.reason === "taken")
              setUsernameMessage(t("signup.username.taken"));
            else if (data.reason === "reserved")
              setUsernameMessage(t("signup.username.reserved"));
            else setUsernameMessage(t("signup.username.notAvailable"));
          }
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

  // Avatar input is handled by the shared PhotoUpload component

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
    // Only fetch profile check-ins when auth has resolved and a user is authenticated.
    enabled: authResolved && !!user,
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
      <TopHeader
        titleKey="nav.profile"
        leftIcon={<User className="h-4 w-4 text-primary" />}
      />

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
                      placeholder={t("profile.usernamePlaceholder")}
                      className={localizedClassForText(
                        t("profile.usernamePlaceholder"),
                      )}
                    />
                    <div className="text-xs mt-1 text-muted-foreground">
                      <LocalizedText>{usernameMessage}</LocalizedText>
                    </div>
                  </div>

                  <Input
                    {...form.register("displayName")}
                    placeholder={t("profile.displayNamePlaceholder")}
                    className={localizedClassForText(
                      t("profile.displayNamePlaceholder"),
                    )}
                  />
                  <div>
                    <div className="text-sm font-medium mb-2">
                      <LocalizedText>{t("profile.avatarLabel")}</LocalizedText>
                    </div>
                    <div>
                      <PhotoUpload
                        photoUrl={form.watch("avatarUrl")}
                        onPhotoChange={(url) => form.setValue("avatarUrl", url)}
                        title={t("profile.avatarLabel")}
                        hint={t("photo.dragDrop")}
                      />
                    </div>
                  </div>

                  {/* Cover removed — uploading covers is no longer supported. */}

                  <Textarea
                    {...form.register("bio")}
                    placeholder={t("profile.bioPlaceholder")}
                    className={localizedClassForText(
                      t("profile.bioPlaceholder"),
                    )}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white"
                      onClick={() => updateProfile.mutate(form.getValues())}
                      disabled={
                        form.getValues().username !==
                          (profile?.username ?? "") &&
                        (!usernameValid || usernameAvailable !== true)
                      }
                    >
                      {usernameChecking ? (
                        <LocalizedText>{t("signup.checking")}</LocalizedText>
                      ) : (
                        <LocalizedText>{t("common.save")}</LocalizedText>
                      )}
                    </button>
                    <button
                      type="button"
                      className="flex-1 flex items-center justify-center rounded-md border px-3 py-2 text-sm"
                      onClick={() => setEditing(false)}
                    >
                      <LocalizedText>{t("common.cancel")}</LocalizedText>
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
                <LocalizedText>{t("profile.myCheckIns")}</LocalizedText>
              </TabsTrigger>
              <TabsTrigger
                value="cafes"
                className="flex-1"
                data-testid="tab-cafes"
              >
                <Store className="h-4 w-4 me-2" />
                <LocalizedText>{t("profile.uniqueDrinks")}</LocalizedText>
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
