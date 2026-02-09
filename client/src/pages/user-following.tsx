import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import TopHeader from "@/components/top-header";
import BackButton from "@/components/back-button";
import { useLocation } from "wouter";
import { LocalizedText } from "@/components/LocalizedText";

export default function UserFollowing() {
  const { isRTL, t } = useI18n();
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const username = path.split("/")[2] || "";
  const { data: following, isLoading } = useQuery<any[]>({
    queryKey: [`/api/users/username/${username}/following`],
  });
  const [, setLocation] = useLocation();

  if (isLoading)
    return (
      <div className="min-h-screen p-4">
        <LocalizedText>{t("common.loading")}</LocalizedText>
      </div>
    );

  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <TopHeader titleKey="profile.following" />
      <BackButton href={`/users/${username}`} />
      <main className="max-w-2xl mx-auto p-4">
        <h2 className="text-xl font-bold mb-4">
          <LocalizedText>{t("profile.following")}</LocalizedText>
        </h2>
        <div className="space-y-3">
          {following && following.length > 0 ? (
            following.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div>
                  <div className="font-medium">
                    <LocalizedText>{u.displayName}</LocalizedText>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @<LocalizedText>{u.username}</LocalizedText>
                  </div>
                </div>
                <div>
                  <button
                    className="text-primary"
                    onClick={() => setLocation(`/users/${u.id}`)}
                  >
                    <LocalizedText>{t("common.view")}</LocalizedText>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">
              <LocalizedText>{t("user.notFollowingYet")}</LocalizedText>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
