import { useQuery } from "@tanstack/react-query";
import { CheckInCard } from "@/components/check-in-card";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import type { Cafe } from "@shared/schema";
import { Star, Coffee } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function CafeDetail() {
  const { language, isRTL, t } = useI18n();
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

  if (isLoading) return <div className="min-h-screen p-4">Loading...</div>;
  if (!cafe) return <div className="min-h-screen p-4">Cafe not found</div>;

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
          <div className="px-4 h-14 max-w-2xl mx-auto flex items-center">
            <Link href="/" className="text-primary">
              {t("common.back")}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <h1 className="font-serif text-2xl font-medium mb-1">{name}</h1>
        <div className="text-sm text-muted-foreground">{city}</div>

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
                <h3 className="font-serif text-lg font-medium truncate">
                  {name}
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
                        <span className="text-xs text-muted-foreground">
                          {language === "ar" ? "بدون تقييمات" : "No ratings"}
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground">·</span>

                    <span className="text-xs text-muted-foreground">
                      {language === "ar"
                        ? "مقدم من Google"
                        : "Provided by Google"}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2">
                  {(cafe as any).specialty && (
                    <Badge variant="outline" className="text-xs">
                      {(cafe as any).specialty}
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
            {language === "ar" ? "أفضل المشروبات" : "Top Drinks"}
          </h2>
          {(cafe as any).topDrinks && (cafe as any).topDrinks.length > 0 ? (
            <div className="flex flex-col gap-2">
              {(cafe as any).topDrinks.map((d: any, idx: number) => {
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                return (
                  <div
                    key={d.drinkId}
                    className="p-3 border rounded flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{medal}</span>
                      <div>{t(`drink.${d.drinkId}`) || d.name}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {d.count} {language === "ar" ? "تسجيل" : "check-ins"}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {language === "ar"
                ? "لا توجد تقييمات للمشروبات بعد!"
                : "No drinks ratings yet!"}
            </div>
          )}
        </div>

        <div className="px-3 pb-3 mt-3">
          <Link
            href={`/check-in?cafeId=${
              (cafe as any).placeId || (cafe as any).id
            }`}
          >
            <Button className="w-full" size="sm">
              {language === "ar" ? "سجّل هنا" : "Check In Here"}
            </Button>
          </Link>
        </div>

        {/* Cafe recent check-ins */}
        <div className="mt-4">
          <h2 className="font-medium mb-2">
            {language === "ar" ? "أحدث التسجيلات" : "Recent Check-ins"}
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
