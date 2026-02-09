import { useQuery } from "@tanstack/react-query";
import { CheckInCard } from "@/components/check-in-card";
import { Link } from "wouter";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useI18n } from "@/lib/i18n";
import type { Cafe } from "@shared/schema";
import { Star, Coffee, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import TopHeader from "@/components/top-header";
import BackButton from "@/components/back-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocalizedText } from "@/components/LocalizedText";

export default function CafeDetail() {
  const { language, isRTL, t } = useI18n();
  const requireAuth = useRequireAuth();
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const id = path.split("/").pop() || "";

  const { data: cafe, isLoading } = useQuery<Cafe>({
    queryKey: ["/api/cafes", id, language],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("lang", language === "ar" ? "ar" : "en");
      const res = await fetch(
        `/api/cafes/${encodeURIComponent(id)}?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to fetch cafe");
      return res.json();
    },
    refetchOnMount: "always",
  });

  const { data: allCheckIns } = useQuery<any[]>({
    queryKey: ["/api/check-ins"],
  });

  if (isLoading)
    return (
      <div className="min-h-screen p-4">
        <LocalizedText>{t("error.loading")}</LocalizedText>
      </div>
    );
  if (!cafe)
    return (
      <div className="min-h-screen p-4">
        <LocalizedText>{t("error.cafeNotFound")}</LocalizedText>
      </div>
    );

  const name =
    language === "ar" ? cafe.nameAr || cafe.nameEn : cafe.nameEn || cafe.nameAr;
  const city = language === "ar" ? cafe.cityAr : cafe.cityEn;

  if (typeof window !== "undefined" && cafe.imageUrl) {
    try {
      console.log(`[cafe-detail] fetching photo_reference for cafe: ${name}`);
    } catch (_) {}
  }

  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <TopHeader
        titleKey="nav.cafe"
        leftIcon={<Coffee className="h-4 w-4 text-primary" />}
      />
      <BackButton href="/discover" testId="button-back" />

      <main className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-medium mb-1">
          <LocalizedText>{name}</LocalizedText>
        </h1>
        <div className="text-sm text-muted-foreground">
          <LocalizedText>{city}</LocalizedText>
        </div>

        <Card className="overflow-hidden border-card-border">
          <div className="flex gap-3 p-3">
            <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
              {cafe.imageUrl ? (
                <img
                  src={
                    cafe.imageUrl.includes("maps.googleapis.com")
                      ? `/api/proxy?url=${encodeURIComponent(cafe.imageUrl)}`
                      : cafe.imageUrl
                  }
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <Coffee className="h-8 w-8 text-primary/40" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-medium truncate">
                  <LocalizedText>{name}</LocalizedText>
                </h3>
              </div>

              <div className="mt-1">
                {(cafe as any).placeId && (
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {cafe.rating ? (
                        <>
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-medium">
                            {(cafe.rating as number).toFixed(1)}
                          </span>
                          {typeof (cafe as any).reviews === "number" && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({(cafe as any).reviews})
                            </span>
                          )}
                        </>
                      ) : (
                        <LocalizedText className="text-xs text-muted-foreground">
                          {t("cafe.noRatings")}
                        </LocalizedText>
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground">·</span>

                    <LocalizedText className="text-xs text-muted-foreground">
                      {t("cafe.providedByGoogle")}
                    </LocalizedText>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2">
                  {(cafe as any).specialty && (
                    <Badge variant="outline" className="text-xs">
                      <LocalizedText>{(cafe as any).specialty}</LocalizedText>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Top drinks */}
        <div className="mt-4">
          <h2 className="font-medium mb-2">
            <span className={isRTL ? "ml-2" : "mr-2"}>🔥</span>
            <LocalizedText>{t("cafe.topDrinks")}</LocalizedText>
          </h2>
          {(cafe as any).topDrinks?.length > 0 ? (
            <div className="flex flex-col gap-2">
              {(cafe as any).topDrinks.map((d: any, idx: number) => {
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                return (
                  <div
                    key={d.drinkId}
                    className="p-3 border border-border rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{medal}</span>
                      <div>
                        <div className="font-medium">
                          <LocalizedText>
                            {d.drinkName || t(`drink.${d.drinkId}`) || d.name}
                          </LocalizedText>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-medium">
                            {d.avgRating?.toFixed(1)}
                          </span>
                          <LocalizedText className="text-xs text-muted-foreground ml-1">
                            {`(${d.count} ${t("cafe.ratings")})`}
                          </LocalizedText>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              <LocalizedText>{t("cafe.noDrinksRatings")}</LocalizedText>
            </div>
          )}

          <div className="px-3 pb-3 mt-3">
            <Link
              href={`/check-in?cafeId=${
                (cafe as any).placeId || (cafe as any).id
              }`}
            >
              <Button
                className="w-full"
                size="sm"
                onClick={async (e) => {
                  const ok = await requireAuth();
                  if (!ok) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                <LocalizedText>{t("cafe.checkInHere")}</LocalizedText>
              </Button>
            </Link>
          </div>
        </div>

        {/* Cafe recent check-ins */}
        <div className="mt-4">
          <h2 className="font-medium mb-2">
            <LocalizedText>{t("cafe.recentCheckIns")}</LocalizedText>
          </h2>
          <div className="space-y-4">
            {(allCheckIns || [])
              .filter((c) => c.cafe)
              .filter((c) => {
                const cafeRef = c.cafe as any;
                // match by local cafe id or by placeId when viewing a Google Place
                return (
                  cafeRef.id === id ||
                  cafeRef.placeId === id ||
                  cafeRef.placeId === (cafe as any).placeId
                );
              })
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .slice(0, 6)
              .map((checkIn) => (
                <CheckInCard key={checkIn.id} checkIn={checkIn} />
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}
