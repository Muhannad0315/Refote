import { storage } from "../storage";

const CACHE_TTL_MS = 120_000;

type CachedValue = {
  expiresAt: number;
  value: CafeDetail;
};

type TopDrink = {
  drinkId: string;
  drinkName: string;
  avgRating: number;
  count: number;
};

export type CafeDetail = {
  id: string;
  placeId?: string | null;
  nameEn?: string | null;
  nameAr?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  reviews?: number | null;
  topDrinks?: TopDrink[];
  [key: string]: any;
};

const cafeCache = new Map<string, CachedValue>();

function getCache(key: string): CafeDetail | null {
  const entry = cafeCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cafeCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key: string, value: CafeDetail) {
  cafeCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  });
}

async function createSupabaseClient() {
  const { createServerSupabaseClient } = await import("../supabaseClient");
  return createServerSupabaseClient();
}

async function fetchTopDrinks(placeId: string): Promise<TopDrink[]> {
  try {
    const supabase = await createSupabaseClient();
    const { data: aggData, error: aggErr } = await supabase.rpc(
      "get_top_drinks_for_cafe",
      {
        p_place_id: placeId,
        min_check_ins: 1,
        max_results: 3,
      },
    );

    if (!aggErr && aggData) {
      return aggData.map((row: any) => ({
        drinkId: row.drink_id,
        drinkName: row.drink_name,
        avgRating: parseFloat(row.avg_rating),
        count: parseInt(row.check_in_count, 10),
      }));
    }
  } catch (e) {
    console.error("Failed to compute top drinks:", e);
  }

  return [];
}

export async function getCafeById(
  id: string,
  lang: string,
): Promise<CafeDetail> {
  const normalizedLang = lang === "ar" ? "ar" : "en";
  const cacheKey = `${id}:${normalizedLang}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const cafe = await storage.getCafe(id);
  if (cafe) {
    const topDrinks = await fetchTopDrinks(cafe.id);

    let dbRow: any = null;
    try {
      const supabase = await createSupabaseClient();
      const { data: rows, error } = await supabase
        .from("coffee_places")
        .select("rating, reviews")
        .eq("id", cafe.id)
        .limit(1);
      if (!error) dbRow = Array.isArray(rows) ? rows[0] : rows;
    } catch (_) {
      // ignore DB read failures and fall back to in-memory `cafe` fields
    }

    const rating =
      dbRow && typeof dbRow.rating === "number"
        ? dbRow.rating
        : cafe.rating ?? null;
    const reviews =
      dbRow && typeof dbRow.reviews === "number"
        ? dbRow.reviews
        : cafe.reviews ?? null;

    const result = { ...cafe, rating, reviews, topDrinks };
    setCache(cacheKey, result);
    return result;
  }

  // Not a local cafe id — treat `id` as a Google Place ID. Before calling
  // Google Place Details, check local storage (Supabase) for an existing
  // cafe that references this place ID and whether the detail fields are
  // present. Place Details must be fetched only when detail fields are
  // missing; Discover must never call Place Details.
  const localCafesAll = await storage.getCafes();
  const localByPlace = localCafesAll.find(
    (c: any) => c.placeId === id || (c as any).google_place_id === id,
  );

  let dbRow: any = null;
  if (localByPlace) {
    try {
      console.log("[supabase] read coffee_places for detail check", {
        google_place_id: id,
      });
    } catch (_) {}
    const supabase = await createSupabaseClient();
    const { data: dbRows, error: dbErr } = await supabase
      .from("coffee_places")
      .select(
        "address_en, address_ar, phone_number, website, opening_hours, types, price_level, last_fetched_at, name_en, name_ar, lat, lng, photo_reference, rating, reviews",
      )
      .eq("google_place_id", id)
      .limit(1);
    if (dbErr) console.error("[supabase] read error", dbErr);
    dbRow = Array.isArray(dbRows) ? dbRows[0] : dbRows;
  }

  const detailFieldsToCheck = [
    "address_en",
    "phone_number",
    "website",
    "opening_hours",
    "types",
    "price_level",
  ];
  const missingDetail =
    dbRow == null || detailFieldsToCheck.some((k) => !(dbRow as any)[k]);

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  if (localByPlace && !missingDetail) {
    const lastFetched = (dbRow as any)?.last_fetched_at as number | null;
    if (lastFetched && Date.now() - lastFetched < THIRTY_DAYS_MS) {
      const topDrinks = await fetchTopDrinks(localByPlace.id);

      const nameEn =
        (dbRow && (dbRow.name_en ?? dbRow.name_ar)) ??
        (localByPlace &&
          ((localByPlace as any).nameEn ?? (localByPlace as any).nameAr)) ??
        null;
      const nameAr =
        (dbRow && (dbRow.name_ar ?? dbRow.name_en)) ??
        (localByPlace &&
          ((localByPlace as any).nameAr ?? (localByPlace as any).nameEn)) ??
        null;
      const imageUrl =
        dbRow && dbRow.photo_reference
          ? `/api/photo?photoRef=${encodeURIComponent(
              dbRow.photo_reference,
            )}&maxWidth=1000`
          : localByPlace && (localByPlace as any).photoReference
          ? `/api/photo?photoRef=${encodeURIComponent(
              (localByPlace as any).photoReference,
            )}&maxWidth=1000`
          : (localByPlace && (localByPlace as any).imageUrl) ?? null;
      const rating =
        typeof (dbRow && (dbRow as any).rating) === "number"
          ? (dbRow as any).rating
          : typeof (localByPlace && (localByPlace as any).rating) === "number"
          ? (localByPlace as any).rating
          : null;
      const reviews =
        typeof (dbRow && (dbRow as any).reviews) === "number"
          ? (dbRow as any).reviews
          : typeof (localByPlace && (localByPlace as any).reviews) === "number"
          ? (localByPlace as any).reviews
          : null;

      const result = {
        id: localByPlace?.placeId ?? id,
        placeId: localByPlace?.placeId ?? id,
        nameEn,
        nameAr,
        imageUrl,
        rating,
        reviews,
        topDrinks,
      };
      setCache(cacheKey, result);
      return result;
    }
  }

  // Place Details calls removed: rely on local/cache data only.
  try {
    const localCafesAll = await storage.getCafes();
    const localByPlace = localCafesAll.find(
      (c: any) => c.placeId === id || (c as any).google_place_id === id,
    );

    let dbRow: any = null;
    if (localByPlace) {
      try {
        const supabase = await createSupabaseClient();
        const { data: dbRows, error: dbErr } = await supabase
          .from("coffee_places")
          .select("name_en, name_ar, photo_reference, rating, reviews")
          .eq("google_place_id", id)
          .limit(1);
        if (dbErr) console.error("[supabase] read error", dbErr);
        dbRow = Array.isArray(dbRows) ? dbRows[0] : dbRows;
      } catch (e) {
        console.error("[supabase] read failed", e);
      }
    }

    const topDrinks = localByPlace ? await fetchTopDrinks(localByPlace.id) : [];

    const nameEn =
      (dbRow && (dbRow.name_en ?? dbRow.name_ar)) ??
      (localByPlace &&
        ((localByPlace as any).nameEn ?? (localByPlace as any).nameAr)) ??
      null;
    const nameAr =
      (dbRow && (dbRow.name_ar ?? dbRow.name_en)) ??
      (localByPlace &&
        ((localByPlace as any).nameAr ?? (localByPlace as any).nameEn)) ??
      null;
    const imageUrl =
      dbRow && dbRow.photo_reference
        ? `/api/photo?photoRef=${encodeURIComponent(
            dbRow.photo_reference,
          )}&maxWidth=1000`
        : localByPlace && (localByPlace as any).photoReference
        ? `/api/photo?photoRef=${encodeURIComponent(
            (localByPlace as any).photoReference,
          )}&maxWidth=1000`
        : (localByPlace && (localByPlace as any).imageUrl) ?? null;
    const rating =
      typeof (dbRow && dbRow.rating) === "number"
        ? dbRow.rating
        : typeof (localByPlace && (localByPlace as any).rating) === "number"
        ? (localByPlace as any).rating
        : null;
    const reviews =
      typeof (dbRow && dbRow.reviews) === "number"
        ? dbRow.reviews
        : typeof (localByPlace && (localByPlace as any).reviews) === "number"
        ? (localByPlace as any).reviews
        : null;

    const result = {
      id: localByPlace?.placeId ?? id,
      placeId: localByPlace?.placeId ?? id,
      nameEn,
      nameAr,
      imageUrl,
      rating,
      reviews,
      topDrinks,
    };

    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error("Cafe detail local fetch failed:", err);
    throw err;
  }
}
