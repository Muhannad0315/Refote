// Accept raw Google API results (various shapes) and return a strict
// canonical shape suitable for persistence. This function never returns
// Google-native objects; it only returns simplified canonical entries.

type CanonicalPlaceOut = {
  google_place_id: string;
  lat: number;
  lng: number;
  name_en?: string | null;
  name_ar?: string | null;
  rating?: number | null;
  reviews?: number | null;
  photo_reference?: string | null;
  city_en?: string | null;
  city_ar?: string | null;
};

function extractId(p: any): string | null {
  // For Nearby Search REST prefer `place_id` (the canonical Places id).
  // Only fall back to `placeId` when `place_id` is absent. Do NOT use `id`.
  return (p?.place_id ?? p?.placeId ?? null) as string | null;
}

function extractLat(p: any): number | null {
  // Preferred extraction order for lat:
  // 1) p.latitude
  // 2) p.raw?.geometry?.location?.lat
  if (!p) return null;
  const fromTop = p.latitude;
  if (typeof fromTop === "number") return fromTop;
  const fromRaw = p.raw?.geometry?.location?.lat;
  if (typeof fromRaw === "number") return fromRaw;
  return null;
}

function extractLng(p: any): number | null {
  // Preferred extraction order for lng:
  // 1) p.longitude
  // 2) p.raw?.geometry?.location?.lng
  if (!p) return null;
  const fromTop = p.longitude;
  if (typeof fromTop === "number") return fromTop;
  const fromRaw = p.raw?.geometry?.location?.lng;
  if (typeof fromRaw === "number") return fromRaw;
  return null;
}

function pickCityFromRaw(raw: any): string | null {
  try {
    const comps = raw?.address_components || raw?.addressComponents || [];
    const findType = (types: string[]) => {
      for (const c of comps) {
        for (const t of types)
          if ((c.types || c.type || []).includes(t))
            return c.long_name ?? c.text ?? null;
      }
      return null;
    };
    return (
      findType(["locality"]) ||
      findType(["administrative_area_level_2"]) ||
      findType(["administrative_area_level_1"]) ||
      null
    );
  } catch (_) {
    return null;
  }
}

// Validate raw place: must have google_place_id and lat/lng (not null/undefined).
function extractCanonicalFromRaw(p: any) {
  const id = extractId(p);
  const lat = extractLat(p);
  const lng = extractLng(p);
  const valid = !!id && lat !== null && lng !== null;
  return { id, lat, lng, valid };
}

export function mergePlaces(
  enResults: any[] = [],
  arResults: any[] = [],
): CanonicalPlaceOut[] {
  const map = new Map<string, CanonicalPlaceOut>();

  // STEP 3H logging: input counts and samples (MANDATORY)
  try {
    console.log("mergePlaces input counts", {
      en: (enResults || []).length,
      ar: (arResults || []).length,
    });
    try {
      if (enResults && enResults.length > 0)
        console.log(
          "mergePlaces EN sample",
          JSON.stringify(enResults[0], null, 2),
        );
    } catch (_) {}
    try {
      if (arResults && arResults.length > 0)
        console.log(
          "mergePlaces AR sample",
          JSON.stringify(arResults[0], null, 2),
        );
    } catch (_) {}
  } catch (_) {}

  // First pass: anchor on English results — populate canonical fields
  for (const p of enResults || []) {
    if (!p) continue;
    const { id, lat, lng, valid } = extractCanonicalFromRaw(p);
    if (!valid) {
      try {
        const reason = !id ? "missing_id" : "missing_coords";
        console.log("mergePlaces skip", {
          reason,
          place_id: id ?? null,
          lat: lat ?? null,
          lng: lng ?? null,
        });
      } catch (_) {}
      continue;
    }

    const nameEn =
      (p.name || p.displayName || p.display_name || p.name_en) ?? null;
    const photoRef =
      (p.photo_reference ||
        p.photoResource ||
        p.photos?.[0]?.photo_reference ||
        p.photos?.[0]?.photo?.name) ??
      null;
    const raw = p.raw ?? (p || {});
    const city = pickCityFromRaw(raw);

    const entry: CanonicalPlaceOut = {
      google_place_id: String(id),
      lat: Number(lat),
      lng: Number(lng),
      name_en: nameEn ?? null,
      photo_reference: photoRef ?? null,
      city_en: city ?? null,
    };
    map.set(String(id), entry);
  }

  // Second pass: merge Arabic results — attach Arabic fields to existing
  // English anchors without requiring coords; create AR-only anchors
  // only when coords are present.
  for (const p of arResults || []) {
    if (!p) continue;

    const id = extractId(p);
    if (!id) {
      try {
        console.log("mergePlaces skip", {
          reason: "missing_id",
          place_id: null,
        });
      } catch (_) {}
      continue;
    }

    const existing = map.get(String(id));

    if (existing) {
      // Attach Arabic name and optional fields without requiring coords
      try {
        const nameAr =
          (p.name || p.displayName || p.display_name || p.name_ar) ?? null;
        if (!existing.name_ar && nameAr) existing.name_ar = nameAr;
        const photoRef =
          (p.photo_reference ||
            p.photoResource ||
            p.photos?.[0]?.photo_reference ||
            p.photos?.[0]?.photo?.name) ??
          null;
        if (!existing.photo_reference && photoRef)
          existing.photo_reference = photoRef;
        const raw = p.raw ?? (p || {});
        const cityAr = pickCityFromRaw(raw);
        if (!existing.city_ar && cityAr) existing.city_ar = cityAr;
        // If existing lacks coords and AR provides them, fill them in
        const lat = extractLat(p);
        const lng = extractLng(p);
        if (
          (existing.lat === undefined || existing.lat === null) &&
          lat !== null
        )
          existing.lat = Number(lat);
        if (
          (existing.lng === undefined || existing.lng === null) &&
          lng !== null
        )
          existing.lng = Number(lng);
      } catch (_) {}
      continue;
    }

    // No existing EN anchor — create AR-only anchor only if coords present
    const lat = extractLat(p);
    const lng = extractLng(p);
    if (lat === null || lng === null) {
      try {
        console.log("mergePlaces skip", {
          reason: "missing_coords",
          place_id: id,
          lat: lat ?? null,
          lng: lng ?? null,
        });
      } catch (_) {}
      continue;
    }

    const nameAr =
      (p.name || p.displayName || p.display_name || p.name_ar) ?? null;
    const photoRef =
      (p.photo_reference ||
        p.photoResource ||
        p.photos?.[0]?.photo_reference ||
        p.photos?.[0]?.photo?.name) ??
      null;
    const raw = p.raw ?? (p || {});
    const cityAr = pickCityFromRaw(raw);

    const entry: CanonicalPlaceOut = {
      google_place_id: String(id),
      lat: Number(lat),
      lng: Number(lng),
      name_ar: nameAr ?? null,
      photo_reference: photoRef ?? null,
      city_ar: cityAr ?? null,
    };
    map.set(String(id), entry);
  }

  // Final: return only entries that strictly have required fields
  const out: CanonicalPlaceOut[] = [];
  for (const v of map.values()) {
    if (!v.google_place_id) continue;
    if (v.lat === undefined || v.lat === null) continue;
    if (v.lng === undefined || v.lng === null) continue;
    out.push(v);
  }

  try {
    console.log(`[mergePlaces] returning ${out.length} canonical places`);
  } catch (_) {}
  try {
    console.log("mergePlaces output count", out.length);
  } catch (_) {}

  return out;
}

export default mergePlaces;
