import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "wouter";

export default function UserFollowing() {
  const { isRTL, t } = useI18n();
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const username = path.split("/")[2] || "";
  const { data: following, isLoading } = useQuery<any[]>({
    queryKey: [`/api/users/username/${username}/following`],
  });
  const [, setLocation] = useLocation();

  if (isLoading) return <div className="min-h-screen p-4">Loading...</div>;
  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border p-4">
        <Link href="/profile" className="text-primary">
          Back
        </Link>
      </header>
      <main className="max-w-2xl mx-auto p-4">
        <h2 className="font-serif text-xl font-bold mb-4">
          {t("profile.following")}
        </h2>
        <div className="space-y-3">
          {following && following.length > 0 ? (
            following.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div>
                  <div className="font-medium">{u.displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    @{u.username}
                  </div>
                </div>
                <div>
                  <button
                    className="text-primary"
                    onClick={() => setLocation(`/users/${u.id}`)}
                  >
                    View
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">
              Not following anyone yet
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
