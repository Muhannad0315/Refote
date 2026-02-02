import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchBar } from "@/components/search-bar";
import { CafeCard } from "@/components/cafe-card";
// Roasters removed
import { CafeCardSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  requestUserLocation,
  calculateHaversineDistance,
  type UserLocation,
} from "@/lib/location";
import { getLocationCell } from "../../../shared/locationCell";
import { DEFAULT_SEARCH_RADIUS_METERS } from "../../../shared/searchConstants";
import { Search as SearchIcon, Flame, MapPin, Navigation } from "lucide-react";
import type { Cafe, CafeWithDistance } from "@shared/schema";
// city translations removed — filters not used

export default function Discover() {
  const { t, language, isRTL } = useI18n();
  const [search, setSearch] = useState("");
  // City filters removed — Discover now uses nearby Places only
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >("idle");
  const [activeTab, setActiveTab] = useState<"cafes">("cafes");

  // Compute a coarse location cell for caching/de-duplication. The server
  // uses the same cell logic; including these values in the query key ensures
  // cached results are keyed by location cell and radius.
  const RADIUS_METERS = DEFAULT_SEARCH_RADIUS_METERS;
  const { latCell, lngCell } = userLocation
    ? getLocationCell(userLocation.latitude, userLocation.longitude)
    : { latCell: null as number | null, lngCell: null as number | null };

  const { data: cafes, isLoading: cafesLoading } = useQuery<Cafe[]>({
    // Query key includes location cell + radius so different coarse locations
    // have separate cache entries. Using a stable key prevents refetches when
    // UI interactions (clicks) happen elsewhere on the page.
    queryKey: ["/api/cafes", language, latCell, lngCell, RADIUS_METERS],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("lang", language === "ar" ? "ar" : "en");

      const url = `/api/cafes?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch cafes");
      return res.json();
    },
    // Do not treat data as stale for at least 10 minutes to avoid UI-driven
    // refetches when users click around. Server-side caching (nearbySearchCache)
    // is the primary protection against unnecessary Google API calls; the
    // client keeps data fresh enough for interactive use.
    staleTime: 1000 * 60 * 10, // 10 minutes
    // UI interactions like switching tabs or focusing the window should NOT
    // trigger refetches for Discover — rely on cache and explicit invalidation
    // when user actions genuinely change data.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // roasters removed

  const requestLocation = useCallback(async () => {
    setLocationStatus("requesting");
    try {
      const location = await requestUserLocation();
      setUserLocation(location);
      setLocationStatus("granted");
    } catch {
      setLocationStatus("denied");
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const cafesWithDistance = useMemo((): CafeWithDistance[] => {
    if (!cafes) return [];

    return cafes
      .map((cafe) => {
        let distance: number | undefined;
        if (userLocation && cafe.latitude && cafe.longitude) {
          distance = calculateHaversineDistance(
            userLocation.latitude,
            userLocation.longitude,
            cafe.latitude,
            cafe.longitude,
          );
        }
        return { ...cafe, distance };
      })
      .sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        if (a.distance !== undefined) return -1;
        if (b.distance !== undefined) return 1;
        return 0;
      });
  }, [cafes, userLocation]);

  const safeStr = (v: any) => (typeof v === "string" ? v : "");
  const getCafeName = (cafe: any) => {
    if (language === "ar")
      return safeStr(cafe.nameAr) || safeStr(cafe.name) || safeStr(cafe.nameEn);
    return safeStr(cafe.nameEn) || safeStr(cafe.name) || safeStr(cafe.nameAr);
  };
  const getCafeAddress = (cafe: any) =>
    safeStr(language === "ar" ? cafe.addressAr : cafe.addressEn) ||
    safeStr(cafe.address) ||
    "";
  // city translations left for future use

  const filteredCafes = useMemo(() => {
    if (!search) return cafesWithDistance;
    const searchLower = search.toLowerCase();
    return cafesWithDistance.filter((cafe: any) => {
      const nameAr = safeStr(cafe.nameAr);
      const nameEn = safeStr(cafe.nameEn);
      const name = safeStr(cafe.name);
      const addrAr = safeStr(cafe.addressAr);
      const addrEn = safeStr(cafe.addressEn);
      const addr = safeStr(cafe.address);
      return (
        nameAr.toLowerCase().includes(searchLower) ||
        nameEn.toLowerCase().includes(searchLower) ||
        name.toLowerCase().includes(searchLower) ||
        addrAr.toLowerCase().includes(searchLower) ||
        addrEn.toLowerCase().includes(searchLower) ||
        addr.toLowerCase().includes(searchLower)
      );
    });
  }, [cafesWithDistance, search]);

  // No additional filters applied — use search results only
  const filteredAndFiltered = filteredCafes;

  // roasters removed

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
            <div
              className={
                isRTL
                  ? "order-2 flex items-center gap-2"
                  : "order-1 flex items-center gap-2"
              }
            >
              <SearchIcon className="h-4 w-4 text-primary" />
              <h1 className="font-serif text-lg">{t("nav.discover")}</h1>
            </div>
            <div
              className={
                isRTL
                  ? "order-1 flex items-center gap-1"
                  : "order-2 flex items-center gap-1"
              }
            >
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {locationStatus === "denied" && (
          <div className="mb-4 p-3 rounded-md bg-muted text-muted-foreground text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{t("discover.locationDenied")}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={requestLocation}
              className="ms-auto"
              data-testid="button-retry-location"
            >
              {t("common.retry")}
            </Button>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === "cafes" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setActiveTab("cafes")}
            data-testid="tab-cafes"
          >
            <SearchIcon className="h-4 w-4 me-2" />
            {t("discover.cafes")}
          </Button>
          {/* roasters tab removed */}
        </div>

        <div className="mb-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t("discover.searchPlaceholder")}
          />
        </div>

        {activeTab === "cafes" && (
          <>
            {userLocation && (
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Navigation className="h-4 w-4 text-primary" />
                <span>{t("discover.nearYou")}</span>
              </div>
            )}

            {cafesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <CafeCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredCafes && filteredCafes.length > 0 ? (
              <div className="space-y-3">
                {/*
                  Pagination is purely client-side and works on the already-
                  fetched results only. We intentionally slice the full result
                  set here to avoid additional network requests while the user
                  scrolls or interacts with the UI. Google API calls are only
                  performed at the initial discovery/query step handled by the
                  server; pagination must NOT trigger new Google requests.
                */}
                {filteredCafes.slice(0, 50).map((cafe: any) => (
                  <CafeCard
                    key={
                      cafe.id ??
                      cafe.placeId ??
                      (cafe.placeId ? cafe.placeId : Math.random())
                    }
                    cafe={cafe}
                    displayName={getCafeName(cafe)}
                    displayAddress={getCafeAddress(cafe)}
                    distance={cafe.distance}
                    language={language}
                  />
                ))}
                {filteredCafes.length > 50 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    {language === "ar"
                      ? `عرض 50 من ${filteredCafes.length} مقهى`
                      : `Showing 50 of ${filteredCafes.length} cafes`}
                  </p>
                )}
              </div>
            ) : (
              <EmptyState type="search" />
            )}
          </>
        )}

        {/* roasters UI removed */}
      </main>
    </div>
  );
}
