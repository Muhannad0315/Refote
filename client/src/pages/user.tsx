import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { UserProfileHeader } from "@/components/user-profile-header";
import type { UserProfile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function UserPage() {
  const { t, isRTL } = useI18n();
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const username = path.split("/").pop() || "";

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: [`/api/users/username/${username}`],
  });

  const { data: relation } = useQuery<{
    isFollowing?: boolean;
    friendRequest?: any;
  }>({
    queryKey: [`/api/users/username/${username}/relationship`],
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const targetId = profile?.id ?? username;
      const res = await apiRequest("POST", `/api/users/${targetId}/follow`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${profile?.id ?? username}`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  const friendRequestMutation = useMutation({
    mutationFn: async () => {
      const targetId = profile?.id ?? username;
      const res = await apiRequest(
        "POST",
        `/api/users/${targetId}/friend-request`,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${profile?.id ?? username}/relationship`],
      });
    },
  });

  if (isLoading) return <div className="min-h-screen p-4">Loading...</div>;
  if (!profile) return <div className="min-h-screen p-4">User not found</div>;

  const isFollowing = relation?.isFollowing;
  const friendRequest = relation?.friendRequest;

  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border p-4">
        <Link href="/" className="text-primary">
          Back
        </Link>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <UserProfileHeader
          user={profile}
          isOwnProfile={false}
          isFollowing={isFollowing}
          onFollow={() => followMutation.mutate()}
        />

        <div className="p-4">
          {friendRequest ? (
            <div className="mb-4">
              <div className="text-sm text-muted-foreground">
                {t("activity.followedYou")}
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white"
                onClick={() => friendRequestMutation.mutate()}
                data-testid="button-friend-request"
              >
                {t("common.follow")}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
