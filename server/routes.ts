import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertCheckInSchema,
  insertDrinkSchema,
  insertCafeSchema,
  insertUserSchema,
} from "@shared/schema";
// Use the server-side helper to query Places for the TEMP test location
import { getCafesAtLocation } from "../cafes";
import { mergePlaces } from "./mergePlaces";
// Note: Do NOT import getTestLocation here. We must not read temp_location.json
// at server startup. Dev overrides are evaluated per-request via
// `applyLocationOverride` which reads `temp_location.json` on demand.
import { getLocationCell } from "../shared/locationCell";
import {
  getCachedNearbySearch,
  setCachedNearbySearch,
} from "./nearbySearchCache";
import { SEARCH_RADIUS_METERS, SEARCH_RADIUS_SOURCE } from "./searchConstants";
import { CAFE_DISCOVER_SELECT, CAFE_DETAIL_SELECT } from "./db/selects";
import {
  loadDiscoverConfig,
  logDiscoverConfig,
  normalizeCountry,
} from "./discoverConfig";
import { applyLocationOverride } from "./devLocationOverride";
import { randomUUID } from "crypto";

// Haversine distance calculator (returns distance in meters)
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Canonical place shape used for Normalize/Insert operations
type CanonicalPlace = {
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
  country?: string | null; // ISO-2 country code
};

// Detect if error is a network/DNS failure (Supabase unreachable)
function isSupabaseUnreachable(error: any): boolean {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  const code = String(error?.code || "").toUpperCase();
  const combined = `${message} ${details} ${code}`;

  return (
    combined.includes("ENOTFOUND") || // DNS resolution failed
    combined.includes("GETADDRINFO") || // DNS lookup error
    combined.includes("FETCH FAILED") || // Generic fetch failure
    combined.includes("FAILED TO FETCH") || // Another fetch variant
    combined.includes("NETWORK ERROR") ||
    combined.includes("CONNECTION REFUSED") ||
    combined.includes("UNABLE TO REACH") ||
    combined.includes("ECONNREFUSED") ||
    combined.includes("ETIMEDOUT") ||
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT"
  );
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // For persistence we'll require a Supabase auth token on protected routes.
  // Do NOT invent a user id when no authenticated user exists. Protected
  // endpoints will return 401 when an auth token is missing or invalid.

  async function getUserIdFromToken(token?: string) {
    if (!token) return null;
    // sanitize token if caller accidentally passed the full Authorization header
    try {
      token = String(token)
        .replace(/^Bearer\s+/i, "")
        .trim();
    } catch (_) {}
    try {
      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient(token);
      // token preview logging removed to reduce dev noise
      // Pass the token explicitly to getUser to ensure auth-js uses it
      const { data, error } = await (supabase.auth as any).getUser({
        access_token: token,
      });
      if (!error && data && data.user) return data.user.id ?? null;

      // If auth-js refused the token (some environments), try the REST
      // endpoint directly as a fallback. This avoids failing when
      // auth-js cannot parse/forward the header but the auth REST API
      // still accepts the Bearer token.
      try {
        if (process.env.SUPABASE_URL) {
          try {
            const url = `${process.env.SUPABASE_URL.replace(
              /\/+$/,
              "",
            )}/auth/v1/user`;
            const resp = await fetch(url, {
              headers: {
                Authorization: `Bearer ${token}`,
                // Prefer the anon/public key for auth REST calls; the
                // service role key can cause JWT verification issues.
                apikey:
                  process.env.SUPABASE_ANON_KEY ||
                  process.env.SUPABASE_SERVICE_KEY ||
                  "",
                "Content-Type": "application/json",
              },
            });
            if (resp.ok) {
              const body = await resp.json();
              // REST returns user object shape; prefer `id` or `user.id`.
              return body.id ?? body.user?.id ?? null;
            } else {
              const text = await resp.text().catch(() => "<unreadable>");

              // 403 user_not_found means the user was deleted while token was valid
              // This is a hard session invalidation, not retryable
              if (resp.status === 403 && text.includes("user_not_found")) {
                try {
                  if (process.env.NODE_ENV !== "production")
                    console.warn(
                      "getUserIdFromToken: User deleted (403 user_not_found), session invalid",
                    );
                } catch (_e) {}
                // Return special marker for client to clear session
                const err = new Error("SESSION_INVALID");
                (err as any).sessionInvalid = true;
                throw err;
              }

              try {
                if (process.env.NODE_ENV !== "production")
                  console.warn(
                    "getUserIdFromToken: auth REST fallback non-ok",
                    {
                      status: resp.status,
                      body: text,
                    },
                  );
              } catch (_e) {}
            }
          } catch (fetchErr) {
            // Check if this is a network/DNS error
            if (isSupabaseUnreachable(fetchErr)) {
              // Re-throw as special error so routes can return 503
              const err = new Error("SUPABASE_UNREACHABLE");
              (err as any).code = "SUPABASE_UNREACHABLE";
              throw err;
            }
            // Re-throw SESSION_INVALID errors
            if ((fetchErr as any)?.sessionInvalid === true) {
              throw fetchErr;
            }
            // Other errors - log and continue
            try {
              if (process.env.NODE_ENV !== "production")
                console.warn(
                  "getUserIdFromToken: auth REST fetch error",
                  fetchErr,
                );
            } catch (_e) {}
          }
        }
      } catch (restErr) {
        // Re-throw SESSION_INVALID errors so they propagate to caller
        if ((restErr as any)?.sessionInvalid === true) {
          throw restErr;
        }

        try {
          if (process.env.NODE_ENV !== "production")
            console.warn(
              "getUserIdFromToken: auth REST fallback error",
              restErr,
            );
        } catch (_) {}

        // No insecure fallback here. If both auth-js and the REST endpoint
        // failed to validate the token, return null. We intentionally avoid
        // decoding JWTs without verification in any environment.
        try {
          if (process.env.NODE_ENV !== "production")
            console.warn(
              "getUserIdFromToken: supabase.auth.getUser error",
              error,
            );
        } catch (_) {}
        return null;
      }
    } catch (err) {
      // SESSION_INVALID errors should propagate (user deleted)
      if ((err as any)?.sessionInvalid === true) {
        throw err;
      }
      try {
        if (process.env.NODE_ENV !== "production")
          console.error("getUserIdFromToken: exception", err);
      } catch (_) {}
      return null;
    }
  }

  // Helper: format errors for client responses. In development include
  // structured details; in production return a safe default message.
  function formatErrorForResponse(error: any, defaultMsg: string) {
    try {
      if (process.env.NODE_ENV === "production") return defaultMsg;
      if (error instanceof Error) return error.message;
      try {
        return JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch (_) {
        try {
          return String(error);
        } catch (_2) {
          return defaultMsg;
        }
      }
    } catch (_e) {
      return defaultMsg;
    }
  }

  // Lookup an existing auth user by email. Returns the user object if found,
  // null otherwise. Used during signup to detect duplicate/unconfirmed accounts.
  async function lookupAuthUserByEmail(
    email: string,
  ): Promise<any | null> {
    try {
      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient();
      const { data: users, error } = await supabase.auth.admin.listUsers();
      if (error) {
        return null;
      }
      const found = (users?.users || []).find(
        (u: any) =>
          String(u.email || "").toLowerCase() ===
          String(email || "").toLowerCase(),
      );
      return found || null;
    } catch (e) {
      return null;
    }
  }

  // Create a new check-in
  app.post("/api/check-ins", async (req, res) => {
    try {
      const token = req.headers.authorization || undefined;
      let userId: string | null = null;
      try {
        userId = await getUserIdFromToken(token);
      } catch (authErr) {
        // SUPABASE_UNREACHABLE: network/DNS failure
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        // SESSION_INVALID: user was deleted while token was valid
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }

      if (!userId) {
        if (token) return res.status(401).json({ error: "Invalid auth token" });
        return res.status(401).json({ error: "Missing auth token" });
      }

      // Defensive guard: ensure the user's profile is marked complete before
      // allowing check-in creation. Use the service role to read the
      // `profiles` table regardless of RLS state.
      try {
        const { createServerSupabaseClient } = await import("./supabaseClient");
        const supabase = createServerSupabaseClient();
        const { data: profRow, error: profErr } = await supabase
          .from("profiles")
          .select("is_complete")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();
        if (profErr) {
          console.error("/api/check-ins: failed to fetch profile", profErr);
          return res.status(500).json({ error: "Failed to validate profile" });
        }
        if (!profRow) {
          throw new Error(
            "Invariant violation: authenticated user has no profile",
          );
        }
        if (!profRow.is_complete) {
          return res.status(403).json({ error: "Profile incomplete" });
        }
      } catch (e) {
        console.error("/api/check-ins: profile validation error", e);
        return res.status(500).json({ error: "Failed to validate profile" });
      }

      // Build payload and validate expected check-in fields so extra client
      // fields don't cause zod to reject the body. Defaults userId to the
      // server fallback; we'll override with the authenticated user id.
      const payload = {
        drinkId: req.body.drinkId,
        rating: req.body.rating,
        notes: req.body.notes,
        tastingNotes: req.body.tastingNotes,
        photoUrl: req.body.photoUrl,
        cafeId: req.body.cafeId ?? null,
        roasterId: req.body.roasterId ?? null,
        temperature: req.body.temperature,
        userId: userId,
      };
      try {
        console.info("/api/check-ins POST payload:", {
          drinkId: payload.drinkId,
          temperature: payload.temperature,
          rating: payload.rating,
        });
      } catch (_) {}
      const validatedData = insertCheckInSchema.parse(payload);

      // attach token so storage.createCheckIn can use it for Supabase insert
      (validatedData as any)._supabaseToken = token;
      validatedData.userId = userId;

      // If the client provided a cafeId that refers to a Google Place (the
      // Places `place_id`) we need to ensure there's a local Cafe record
      // so enrichment can resolve it later. The client may also include a
      // lightweight `cafe` object with display fields to persist.
      if (validatedData.cafeId) {
        // See if we already have a local cafe with this placeId
        const existing = (await storage.getCafes()).find(
          (c) => c.placeId === validatedData.cafeId,
        );
        if (existing) {
          validatedData.cafeId = existing.id;
        } else if (req.body.cafe) {
          try {
            const cafePayload = insertCafeSchema.parse(req.body.cafe);
            // Ensure the placeId from the client is preserved
            cafePayload.placeId = req.body.cafe.placeId ?? validatedData.cafeId;
            const created = await storage.createCafe(cafePayload as any);
            validatedData.cafeId = created.id;
          } catch (err) {
            // If cafe payload is invalid, continue without creating a local
            // cafe — the check-in will still be created but will not be
            // enriched with a cafe until one exists.
            console.warn("Failed to create cafe from payload", err);
          }
        }
      }

      const checkIn = await storage.createCheckIn(validatedData);
      res.status(201).json(checkIn);
    } catch (error) {
      console.error("/api/check-ins: create error", error);
      const msg = formatErrorForResponse(error, "Invalid check-in data");
      res.status(400).json({ error: msg });
    }
  });

  // NOTE: profile creation is handled by a DB trigger on auth.users.
  // The application no longer listens for auth webhooks to create profiles.

  // Toggle like on a check-in
  app.post("/api/check-ins/:id/like", async (req, res) => {
    try {
      const token = req.headers.authorization || undefined;
      let userId: string | null = null;
      try {
        userId = await getUserIdFromToken(token);
      } catch (authErr) {
        // SUPABASE_UNREACHABLE: network/DNS failure
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        // SESSION_INVALID: user was deleted while token was valid
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }
      if (!userId) {
        if (token) return res.status(401).json({ error: "Invalid auth token" });
        return res.status(401).json({ error: "Missing auth token" });
      }
      const isLiked = await storage.toggleLike(userId, req.params.id);
      res.json({ isLiked });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // Get a specific check-in (with details)
  app.get("/api/check-ins/:id", async (req, res) => {
    try {
      const token = req.headers.authorization || undefined;
      let userId: string | null = null;
      try {
        userId = await getUserIdFromToken(token);
      } catch (authErr) {
        // SUPABASE_UNREACHABLE: network/DNS failure
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        // SESSION_INVALID: user was deleted while token was valid
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }
      if (!userId) return res.status(401).json({ error: "Missing auth token" });
      try {
        console.info("/api/check-ins/:id - auth user", {
          userId,
          id: req.params.id,
        });
      } catch (_) {}
      const checkIn = await storage.getCheckInWithDetails(req.params.id, token);
      if (!checkIn)
        return res.status(404).json({ error: "Check-in not found" });
      if (checkIn.userId !== userId)
        return res.status(403).json({ error: "Not allowed" });
      res.json(checkIn);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch check-in" });
    }
  });

  // Update a check-in
  app.put("/api/check-ins/:id", async (req, res) => {
    try {
      const token = req.headers.authorization || undefined;
      let userId: string | null = null;
      try {
        userId = await getUserIdFromToken(token);
      } catch (authErr) {
        // SUPABASE_UNREACHABLE: network/DNS failure
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        // SESSION_INVALID: user was deleted while token was valid
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }
      if (!userId) return res.status(401).json({ error: "Missing auth token" });
      const existing = await storage.getCheckIn(req.params.id, token);
      if (!existing)
        return res.status(404).json({ error: "Check-in not found" });
      if (existing.userId !== userId)
        return res.status(403).json({ error: "Not allowed" });

      // Validate only the expected check-in fields so we allow clients to
      // include an optional `cafe` object for persisting a Places result.
      const payload = {
        drinkId: req.body.drinkId,
        rating: req.body.rating,
        notes: req.body.notes,
        tastingNotes: req.body.tastingNotes,
        photoUrl: req.body.photoUrl,
        cafeId: req.body.cafeId ?? existing.cafeId,
        roasterId: req.body.roasterId ?? existing.roasterId,
        temperature: req.body.temperature,
        userId: userId,
      };
      try {
        console.info("/api/check-ins PUT payload:", {
          drinkId: payload.drinkId,
          temperature: payload.temperature,
          rating: payload.rating,
        });
      } catch (_) {}

      const validatedData = insertCheckInSchema.parse(payload);

      // Similar logic as create: if the incoming cafeId is a Place ID and a
      // local cafe doesn't exist, persist it when the client supplied
      // a `cafe` payload.
      (validatedData as any)._supabaseToken = token;
      if (validatedData.cafeId) {
        const existingLocal = (await storage.getCafes()).find(
          (c) => c.placeId === validatedData.cafeId,
        );
        if (existingLocal) {
          validatedData.cafeId = existingLocal.id;
        } else if (req.body.cafe) {
          try {
            const cafePayload = insertCafeSchema.parse(req.body.cafe);
            cafePayload.placeId = req.body.cafe.placeId ?? validatedData.cafeId;
            const created = await storage.createCafe(cafePayload as any);
            validatedData.cafeId = created.id;
          } catch (err) {
            console.warn("Failed to create cafe from payload", err);
          }
        }
      }

      const updated = await storage.updateCheckIn(
        req.params.id,
        validatedData as any,
      );
      if (!updated)
        return res.status(500).json({ error: "Failed to update check-in" });
      res.json(updated);
    } catch (error) {
      console.error(`/api/check-ins/${req.params.id}: update error`, error);
      const msg = formatErrorForResponse(error, "Invalid check-in data");
      res.status(400).json({ error: msg });
    }
  });

  // Delete a check-in
  app.delete("/api/check-ins/:id", async (req, res) => {
    try {
      const token =
        (req.headers.authorization || "").replace(/^Bearer\s+/i, "") ||
        undefined;
      let userId: string | null = null;
      try {
        userId = await getUserIdFromToken(token);
      } catch (authErr) {
        // SUPABASE_UNREACHABLE: network/DNS failure
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        // SESSION_INVALID: user was deleted while token was valid
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }
      if (!userId) return res.status(401).json({ error: "Missing auth token" });
      const existing = await storage.getCheckIn(req.params.id, token);
      if (!existing)
        return res.status(404).json({ error: "Check-in not found" });
      if (existing.userId !== userId)
        return res.status(403).json({ error: "Not allowed" });

      const ok = await storage.deleteCheckIn(req.params.id);
      if (!ok)
        return res.status(500).json({ error: "Failed to delete check-in" });
      res.status(204).send();
    } catch (error) {
      console.error(`/api/check-ins/${req.params.id}: delete error`, error);
      const msg = formatErrorForResponse(error, "Failed to delete check-in");
      res.status(500).json({ error: msg });
    }
  });

  // Get all check-ins (feed)
  app.get("/api/check-ins", async (req, res) => {
    try {
      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient();

      // Fetch last 100 check-ins
      const { data: rows, error } = await supabase
        .from("check_ins")
        .select(
          "id, user_id, place_id, drink_name, rating, notes, photo_url, tasting_notes, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch all related users, profiles, and cafes in bulk
      const userIds = Array.from(
        new Set((rows || []).map((r: any) => r.user_id).filter(Boolean)),
      );
      const placeIds = Array.from(
        new Set((rows || []).map((r: any) => r.place_id).filter(Boolean)),
      );

      let usersMap: Record<string, any> = {};
      let profilesMap: Record<string, any> = {};
      let cafesMap: Record<string, any> = {};

      // Fetch users
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", userIds as any[]);
        (users || []).forEach((u: any) => {
          profilesMap[u.user_id] = u;
        });
      }

      // Fetch cafes
      if (placeIds.length > 0) {
        const { data: cafes } = await supabase
          .from("coffee_places")
          .select(
            "id, google_place_id, name_en, name_ar, city_en, city_ar, photo_reference, rating, reviews",
          )
          .in("id", placeIds as any[]);
        (cafes || []).forEach((c: any) => {
          cafesMap[c.id] = c;
        });
      }

      // Map rows to CheckInWithDetails objects
      const mapped = (rows || []).map((r: any) => {
        const profile = profilesMap[r.user_id];
        const cafe = r.place_id ? cafesMap[r.place_id] : null;

        const user = {
          id: r.user_id,
          username: profile?.username || "",
          displayName: profile?.display_name || "",
          avatarUrl: profile?.avatar_url || null,
        };

        const cafeObj = cafe
          ? {
              id: cafe.id,
              placeId: cafe.google_place_id ?? null,
              nameEn: cafe.name_en ?? null,
              nameAr: cafe.name_ar ?? null,
              cityEn: cafe.city_en ?? null,
              cityAr: cafe.city_ar ?? null,
              photoReference: cafe.photo_reference ?? null,
              rating: cafe.rating ?? null,
              reviews: cafe.reviews ?? null,
            }
          : null;

        return {
          id: r.id,
          userId: r.user_id,
          drinkId: r.drink_name || "",
          drink: {
            id: r.drink_name || "",
            name: r.drink_name || "",
            type: null,
            style: null,
            description: null,
          },
          cafeId: r.place_id ?? null,
          cafe: cafeObj,
          roasterId: null,
          roaster: null,
          rating: r.rating ?? 0,
          notes: r.notes ?? null,
          photoUrl: r.photo_url ?? null,
          tastingNotes: Array.isArray(r.tasting_notes)
            ? r.tasting_notes
            : r.tasting_notes
            ? (() => {
                try {
                  const parsed =
                    typeof r.tasting_notes === "string"
                      ? JSON.parse(r.tasting_notes)
                      : r.tasting_notes;
                  return Array.isArray(parsed) ? parsed : [];
                } catch {
                  return [];
                }
              })()
            : [],
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
          user,
          likesCount: 0,
          isLiked: false,
        };
      });

      res.json(mapped);
    } catch (error) {
      console.error("/api/check-ins: fetch error", error);
      res.status(500).json({ error: "Failed to fetch check-ins" });
    }
  });

  // Get all cafes (with optional city filter)
  app.get("/api/cafes", async (req, res) => {
    try {
      const city = req.query.city as string | undefined;
      const searchText = city ? `cafes in ${city}` : "cafes";

      try {
        const apiKey = process.env.GOOGLE_API_KEY as string;

        // Observability: unique id for this request
        const requestId =
          typeof randomUUID === "function"
            ? randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        // Load country configuration
        const config = loadDiscoverConfig();
        logDiscoverConfig(config, requestId);

        // Determine search location: prefer explicit client-provided coords.
        // Dev override is applied only when `temp_location.json.enabled === true`.
        // If the client did not provide coords and no override is active, return
        // a 400 so callers must supply lat/lng (prevents silent test fallbacks).
        let providedLatLng = false;
        let requestLat: number | undefined = undefined;
        let requestLng: number | undefined = undefined;
        if (
          typeof req.query.lat !== "undefined" &&
          typeof req.query.lng !== "undefined"
        ) {
          providedLatLng = true;
          requestLat = Number(req.query.lat);
          requestLng = Number(req.query.lng);
        }

        // Apply dev location override per-request. This will only return an
        // overridden location when `temp_location.json.enabled === true`.
        const { lat, lng, overridden } = applyLocationOverride(
          requestLat,
          requestLng,
          requestId,
        );

        if (!overridden && !providedLatLng) {
          return res.status(400).json({
            error: "Missing lat/lng. Provide coords or enable dev override",
          });
        }

        if (overridden) {
          try {
            console.log(
              `[discover][${requestId}] effectiveLatLng=(${lat}, ${lng}) (overridden)`,
            );
          } catch (_) {}
        }

        const lang = (req.query.lang as string) === "ar" ? "ar" : "en";

        // Accept radius_m (or radius for backward compat) from query parameter (in meters)
        let radiusMeters = Number(req.query.radius_m || req.query.radius);
        if (isNaN(radiusMeters) || radiusMeters <= 0) {
          radiusMeters = SEARCH_RADIUS_METERS;
        }

        let googleCallsMade = 0;
        let dataSource: "supabase" | "google" = "supabase";
        let coverageHit = false;
        let coverageMaxRadius = 0;

        // Always query Supabase first using location + radius. If we have
        // results, return them immediately. Otherwise call Google, persist
        // results to Supabase, re-query Supabase, and return Supabase rows.
        try {
          const { createServerSupabaseClient } = await import(
            "./supabaseClient"
          );
          const supabase = createServerSupabaseClient();

          // COVERAGE CHECK: Query discover_coverage to see if we have sufficient coverage
          try {
            const { data: coverageRows, error: coverageError } = await supabase
              .from("discover_coverage")
              .select("*");

            if (!coverageError && coverageRows && coverageRows.length > 0) {
              // Check if any existing coverage is nearby (within 200m) and sufficient
              const COVERAGE_MOVEMENT_THRESHOLD = 200; // meters

              for (const row of coverageRows) {
                const distance = haversineDistance(
                  lat,
                  lng,
                  row.center_lat,
                  row.center_lng,
                );

                if (
                  distance <= COVERAGE_MOVEMENT_THRESHOLD &&
                  row.max_radius_m >= radiusMeters
                ) {
                  coverageHit = true;
                  coverageMaxRadius = row.max_radius_m;
                  console.log(
                    `[discover] requestId=${requestId} coverageHit=true distance=${Math.round(
                      distance,
                    )}m maxRadius=${
                      row.max_radius_m
                    }m requestedRadius=${radiusMeters}m`,
                  );
                  break;
                }
              }
            }
          } catch (coverageCheckError) {
            console.warn(
              `[discover] requestId=${requestId} coverageCheckError: could not query discover_coverage`,
              coverageCheckError,
            );
          }

          // Compute rough degree bounds for the requested radius (meters).
          const meters = radiusMeters;
          const latDelta = meters / 111000; // ~111km per degree latitude
          const lngDelta =
            meters /
            (111000 * Math.max(0.000001, Math.cos((lat * Math.PI) / 180)));
          const minLat = lat - latDelta;
          const maxLat = lat + latDelta;
          const minLng = lng - lngDelta;
          const maxLng = lng + lngDelta;

          // Discover which coffee_places columns exist so we can select
          // optional address/city fields only when present.
          const { data: cols } = await supabase
            .from("information_schema.columns")
            .select("column_name")
            .eq("table_name", "coffee_places")
            .eq("table_schema", "public");
          const avail = new Set<string>(
            (cols || []).map((c: any) => c.column_name),
          );
          const baseSelect = [...CAFE_DISCOVER_SELECT];
          if (avail.has("address_en")) baseSelect.push("address_en");
          if (avail.has("address_ar")) baseSelect.push("address_ar");
          if (avail.has("city_en")) baseSelect.push("city_en");
          if (avail.has("city_ar")) baseSelect.push("city_ar");

          // Query Supabase for nearby coffee_places first
          const { data: sbRows, error: sbErr } = await supabase
            .from("coffee_places")
            .select(baseSelect.join(", "))
            .gte("lat", minLat)
            .lte("lat", maxLat)
            .gte("lng", minLng)
            .lte("lng", maxLng);
          if (sbErr) {
            console.error("Failed to query Supabase for nearby cafes", sbErr);
            return res.status(500).json({ error: "Failed to query cafes" });
          }

          if (Array.isArray(sbRows) && sbRows.length > 0) {
            // Coverage-aware: if we have Supabase results AND coverage is sufficient, return them
            // Otherwise, still call Google to expand coverage
            if (coverageHit) {
              // Apply distance filtering to ensure all cafes are within radiusMeters
              const rowsWithinRadius = sbRows.filter((r: any) => {
                const cafeLat = r.lat;
                const cafeLng = r.lng;
                if (
                  typeof cafeLat !== "number" ||
                  typeof cafeLng !== "number"
                ) {
                  return false;
                }
                const distance = haversineDistance(lat, lng, cafeLat, cafeLng);
                return distance <= radiusMeters;
              });

              const mapped = rowsWithinRadius.map((r: any) => {
                const nameEn = r.name_en ?? r.name_ar ?? null;
                const nameAr = r.name_ar ?? r.name_en ?? null;
                const addressEn = r.address_en ?? null;
                const addressAr = r.address_ar ?? null;
                const cityEn = r.city_en ?? null;
                const cityAr = r.city_ar ?? null;
                const displayName =
                  lang === "ar" ? nameAr ?? nameEn : nameEn ?? nameAr;
                const displayAddress =
                  lang === "ar"
                    ? addressAr ?? addressEn
                    : addressEn ?? addressAr;
                const displayCity =
                  lang === "ar" ? cityAr ?? cityEn : cityEn ?? cityAr;
                const distMeters = haversineDistance(lat, lng, r.lat, r.lng);
                return {
                  id: r.id ?? null,
                  placeId: r.google_place_id ?? null,
                  nameEn,
                  name: displayName,
                  nameAr,
                  addressEn,
                  address: displayAddress,
                  addressAr,
                  cityEn,
                  city: displayCity,
                  cityAr,
                  latitude: r.lat ?? null,
                  longitude: r.lng ?? null,
                  rating: r.rating ?? null,
                  reviews: r.reviews ?? null,
                  // Do not return proxied photo URLs in the Discover list —
                  // photos are fetched lazily on the cafe detail page.
                  photoUrl: r.photo_reference
                    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${r.photo_reference}&key=${apiKey}`
                    : null,
                  distance: distMeters,
                };
              });

              // Temporary per-request debug log: sample distance in meters
              try {
                const sample = mapped[0]?.distance ?? null;
                console.log(`[discover][debug] sampleDistanceMeters=${sample}`);
              } catch (_) {}

              try {
                dataSource = "supabase";
                console.log(
                  `[discover][${requestId}] dataSource=${dataSource} effectiveLatLng=(${lat}, ${lng}) radiusRequested=${radiusMeters} boundedCount=${sbRows.length} distanceFiltered=${mapped.length} googleCalls=0 coverageHit=true`,
                );
              } catch (_) {}

              return res.json(mapped);
            }
            // If coverage miss but we have Supabase results, fall through to Google to expand coverage
          }

          // No Supabase rows — call Google Places (both 'en' and 'ar'), persist results, then re-query Supabase
          let places: any[] = [];
          try {
            const { getCurrentWindowCount } = await import(
              "./googleRateLimiter"
            );
            const beforeCalls = getCurrentWindowCount();

            // Google fallback: calling Places API to backfill nearby cafes

            let enPlaces: any[] = [];
            let arPlaces: any[] = [];

            // Attempt English Nearby Search
            try {
              enPlaces =
                (await getCafesAtLocation(
                  apiKey,
                  lat,
                  lng,
                  radiusMeters,
                  "en",
                  config.allowedCountries,
                  requestId,
                )) || [];
            } catch (errEn: any) {
              if (errEn && errEn.message === "RateLimitExceeded") {
                console.warn(
                  "Google API soft-rate-limit hit during English fallback",
                );
              } else {
                throw errEn;
              }
            }

            // Attempt Arabic Nearby Search (always attempt both)
            try {
              arPlaces =
                (await getCafesAtLocation(
                  apiKey,
                  lat,
                  lng,
                  radiusMeters,
                  "ar",
                  config.allowedCountries,
                  requestId,
                )) || [];
            } catch (errAr: any) {
              if (errAr && errAr.message === "RateLimitExceeded") {
                console.warn(
                  "Google API soft-rate-limit hit during Arabic fallback",
                );
              } else {
                throw errAr;
              }
            }

            // Merge English + Arabic results into a single unified set
            places = mergePlaces(enPlaces, arPlaces);

            const afterCalls = getCurrentWindowCount();
            const callsMade = afterCalls - beforeCalls;
            googleCallsMade = callsMade;
          } catch (e: any) {
            if (e && e.message === "RateLimitExceeded") {
              console.warn(
                "Google API soft-rate-limit hit while backfilling; returning empty results",
              );
              try {
                dataSource = "google";
                googleCallsMade = 0;
                console.log(
                  `[discover] requestId=${requestId} dataSource=${dataSource} lang=${lang} radius=${radiusMeters} placesFetched=0 googleRequestsMade=${googleCallsMade}`,
                );
              } catch (_) {}
              return res.json([]);
            }
            throw e;
          }

          // Persist each Google Places result into Supabase `coffee_places`.
          // Persistence instrumentation: track how many canonical places
          // we attempted to persist and record per-row results.
          const persistCandidatesCount = (places || []).length;
          const persistResults: Array<{
            google_place_id: string | null;
            op: "insert" | "update" | "upsert";
            success: boolean;
            error?: string | null;
          }> = [];

          try {
            // Discover which coffee_places columns exist so we only write
            // allowed Nearby Search fields and avoid SQL errors on deployments
            // without all optional migrations applied.
            const { data: colsData } = await supabase
              .from("information_schema.columns")
              .select("column_name")
              .eq("table_name", "coffee_places")
              .eq("table_schema", "public");
            const availCols = new Set<string>(
              (colsData || []).map((c: any) => c.column_name),
            );

            // TEMPORARY: Duplicate detection
            const processedPlaceIds = new Set<string>();

            for (const p of places) {
              const google_place_id =
                (p as any).google_place_id ??
                (p as any).place_id ??
                (p as any).placeId ??
                (p as any).id ??
                null;
              const plat =
                p.lat ?? p.latitude ?? (p.location && p.location.lat) ?? null;
              const plng =
                p.lng ?? p.longitude ?? (p.location && p.location.lng) ?? null;
              if (!google_place_id) continue;

              processedPlaceIds.add(google_place_id);

              try {
                const { data: existingData, error: selErr } = await supabase
                  .from("coffee_places")
                  .select(
                    "id, google_place_id, name_en, name_ar, address_en, address_ar, city_en, city_ar, lat, lng, rating, reviews, photo_reference, phone_number, website, opening_hours, types, price_level, last_fetched_at",
                  )
                  .eq("google_place_id", google_place_id)
                  .limit(1);
                if (selErr) {
                  console.error(
                    "Failed to query coffee_places",
                    google_place_id,
                    selErr,
                  );
                  continue;
                }
                const existing = Array.isArray(existingData)
                  ? existingData[0]
                  : existingData;

                // Build a candidate object from Nearby+merge results
                const detailsFromNearby: any = {
                  google_place_id,
                  name_en: p.name_en ?? undefined,
                  name_ar: p.name_ar ?? undefined,
                  address_en: p.address_en ?? undefined,
                  address_ar: p.address_ar ?? undefined,
                  city_en: p.city_en ?? undefined,
                  city_ar: p.city_ar ?? undefined,
                  lat: plat ?? undefined,
                  lng: plng ?? undefined,
                  photo_reference:
                    p.photo_reference ?? p.photoResource ?? undefined,
                  // CRITICAL FIX: Extract rating and reviews from mergePlaces output
                  rating: p.rating !== undefined ? p.rating : undefined,
                  reviews: p.reviews !== undefined ? p.reviews : undefined,
                };

                // Build candidate strictly from Nearby Search fields only.
                // Nearby Search is only allowed to provide these fields.
                const candidate: any = {
                  google_place_id: google_place_id,
                  name_en: detailsFromNearby.name_en ?? undefined,
                  name_ar: detailsFromNearby.name_ar ?? undefined,
                  lat: detailsFromNearby.lat ?? undefined,
                  lng: detailsFromNearby.lng ?? undefined,
                  rating: detailsFromNearby.rating ?? undefined,
                  reviews: detailsFromNearby.reviews ?? undefined,
                  photo_reference:
                    detailsFromNearby.photo_reference ?? undefined,
                  country: p.country ?? undefined, // Country from getCafesAtLocation
                };

                // Build and enforce a canonical shape before persisting. Only
                // the `CanonicalPlace` shape may reach Supabase. Discover
                // persistence MUST NOT call Place Details or write detail fields.
                const canonical: CanonicalPlace | null = (() => {
                  const gid = candidate.google_place_id ?? null;
                  const latVal =
                    candidate.lat ??
                    (p as any)?.geometry?.location?.lat ??
                    (p as any)?.location?.lat ??
                    null;
                  const lngVal =
                    candidate.lng ??
                    (p as any)?.geometry?.location?.lng ??
                    (p as any)?.location?.lng ??
                    null;
                  if (!gid) return null;
                  // Only skip if both coordinates are truly null everywhere; allow
                  // candidates where at least one source provides coordinates
                  // (e.g. raw.geometry.location).
                  if (latVal === null && lngVal === null) return null;
                  return {
                    google_place_id: String(gid),
                    lat: Number(latVal),
                    lng: Number(lngVal),
                    name_en:
                      candidate.name_en !== undefined
                        ? candidate.name_en
                        : null,
                    name_ar:
                      candidate.name_ar !== undefined
                        ? candidate.name_ar
                        : null,
                    rating:
                      (candidate.rating as any) !== undefined
                        ? candidate.rating
                        : null,
                    reviews:
                      (candidate.reviews as any) !== undefined
                        ? candidate.reviews
                        : null,
                    photo_reference:
                      candidate.photo_reference !== undefined
                        ? candidate.photo_reference
                        : null,
                    city_en:
                      candidate.city_en !== undefined
                        ? candidate.city_en
                        : null,
                    city_ar:
                      candidate.city_ar !== undefined
                        ? candidate.city_ar
                        : null,
                    country:
                      candidate.country !== undefined
                        ? candidate.country
                        : null,
                  } as CanonicalPlace;
                })();

                if (!canonical) {
                  try {
                    console.warn(
                      "Skipping place: does not match canonical shape",
                      {
                        candidate: {
                          google_place_id: candidate.google_place_id,
                          lat: candidate.lat,
                          lng: candidate.lng,
                        },
                        sourceNearby: p,
                      },
                    );
                  } catch (_) {}
                  continue;
                }

                // canonical object built; do not emit per-place TRACE logs here.

                // Phase 1: ALWAYS upsert the canonical object into Supabase.
                try {
                  // Always include required columns (attempt insert even if
                  // optional migrations haven't run). Optional columns will
                  // only be added if present in `availCols`.
                  const upsertObj: any = {};
                  // Required core columns — ensure presence so we can
                  // detect missing IDs instead of having an empty object.
                  upsertObj.google_place_id =
                    (canonical as any).google_place_id ?? null;
                  upsertObj.lat = (canonical as any).lat ?? null;
                  upsertObj.lng = (canonical as any).lng ?? null;

                  for (const k of Object.keys(canonical)) {
                    if (k === "google_place_id" || k === "lat" || k === "lng")
                      continue;
                    if (!availCols.has(k)) continue;
                    upsertObj[k] =
                      (canonical as any)[k] !== undefined
                        ? (canonical as any)[k]
                        : null;
                  }

                  // Ensure google_place_id is present before upsert (schema requires it)
                  if (!upsertObj.google_place_id) {
                    try {
                      console.error(
                        "[discover] skipping insert: missing google_place_id",
                        { upsertObj, canonical },
                      );
                    } catch (_) {}
                    persistResults.push({
                      google_place_id: null,
                      op: "upsert",
                      success: false,
                      error: "missing_google_place_id",
                    });
                  } else {
                    // Use a single explicit upsert: validate inputs, call upsert(.select()),
                    // and always log before/after including Supabase error objects.
                    try {
                      const insertObj: any = {
                        google_place_id: String(canonical.google_place_id),
                        lat: Number(canonical.lat),
                        lng: Number(canonical.lng),
                        name_en:
                          (canonical as any).name_en !== undefined
                            ? (canonical as any).name_en
                            : null,
                        name_ar:
                          (canonical as any).name_ar !== undefined
                            ? (canonical as any).name_ar
                            : null,
                        photo_reference:
                          (canonical as any).photo_reference !== undefined
                            ? (canonical as any).photo_reference
                            : null,
                        city_en:
                          (canonical as any).city_en !== undefined
                            ? (canonical as any).city_en
                            : null,
                        city_ar:
                          (canonical as any).city_ar !== undefined
                            ? (canonical as any).city_ar
                            : null,
                        country:
                          (canonical as any).country !== undefined &&
                          (canonical as any).country !== null
                            ? normalizeCountry((canonical as any).country)
                            : null,

                        // Do not set last_fetched_at during Discover — this field
                        // is reserved for Place Details fetches on the cafe detail
                        // endpoint.
                        last_fetched_at_ts: new Date().toISOString(),
                      };

                      // CRITICAL FIX: Always include rating/reviews from canonical in the upsert payload.
                      // Check if the fields EXIST in canonical (using 'in' operator), not if they're undefined.
                      // If Google provided them, they'll be included. If not provided, the field won't be in canonical
                      // and existing DB values will be preserved.
                      if ("rating" in canonical) {
                        insertObj.rating = (canonical as any).rating;
                      }
                      if ("reviews" in canonical) {
                        insertObj.reviews = (canonical as any).reviews;
                      }

                      // DB payload prepared; suppress per-place dbPayload logs.

                      // Validate presence of id and numeric coords
                      if (!insertObj.google_place_id) {
                        try {
                          console.error(
                            "[discover] skipping insert: missing google_place_id",
                            { insertObj, canonical },
                          );
                        } catch (_) {}
                        persistResults.push({
                          google_place_id: null,
                          op: "upsert",
                          success: false,
                          error: "missing_google_place_id",
                        });
                        continue;
                      }

                      if (
                        !Number.isFinite(insertObj.lat) ||
                        !Number.isFinite(insertObj.lng)
                      ) {
                        try {
                          console.error(
                            "[discover] skipping insert: invalid lat/lng",
                            { insertObj, canonical },
                          );
                        } catch (_) {}
                        persistResults.push({
                          google_place_id: insertObj.google_place_id ?? null,
                          op: "upsert",
                          success: false,
                          error: "invalid_lat_lng",
                        });
                        continue;
                      }

                      const { data: upData, error: upErr } = await supabase
                        .from("coffee_places")
                        .upsert(insertObj as any, {
                          onConflict: "google_place_id",
                        })
                        .select();

                      if (upErr) {
                        console.error(
                          "[discover] insert error",
                          insertObj.google_place_id,
                          upErr,
                        );
                        persistResults.push({
                          google_place_id: insertObj.google_place_id ?? null,
                          op: "upsert",
                          success: false,
                          error: upErr?.message ?? JSON.stringify(upErr),
                        });
                      } else {
                        // Persist succeeded for this row; per-place persisted logs suppressed.
                        persistResults.push({
                          google_place_id: insertObj.google_place_id ?? null,
                          op: "upsert",
                          success: true,
                        });
                      }
                    } catch (uEx: any) {
                      console.error(
                        "[discover] insert error",
                        (canonical as any)?.google_place_id ?? null,
                        uEx?.message ?? uEx,
                      );
                      persistResults.push({
                        google_place_id: canonical.google_place_id ?? null,
                        op: "upsert",
                        success: false,
                        error: uEx?.message ?? String(uEx),
                      });
                    }
                  }
                } catch (err) {
                  console.error(
                    "Persist upsert exception",
                    canonical.google_place_id,
                    err,
                  );
                  persistResults.push({
                    google_place_id: canonical?.google_place_id ?? null,
                    op: "upsert",
                    success: false,
                    error: String(err),
                  });
                }
              } catch (err) {
                console.error(
                  "Multilingual persist error for",
                  google_place_id,
                  err,
                );
              }
            }
          } catch (e) {
            console.error("Failed to persist coffee_places batch:", e);
          }

          // Log persistence summary
          try {
            const successCount = persistResults.filter((r) => r.success).length;
            const failCount = persistResults.filter((r) => !r.success).length;
            if (successCount > 0 || failCount > 0) {
              console.log(
                `[discover] persist summary: ${successCount} success, ${failCount} failed`,
              );
            }
          } catch (_) {}

          // COVERAGE UPSERT: Insert or update discover_coverage record
          try {
            const COVERAGE_MOVEMENT_THRESHOLD = 200; // meters

            // Check if a nearby coverage row already exists
            const { data: existingCoverage } = await supabase
              .from("discover_coverage")
              .select("*");

            let nearestRow: any = null;
            let nearestDistance = Infinity;

            if (existingCoverage && existingCoverage.length > 0) {
              for (const row of existingCoverage) {
                const dist = haversineDistance(
                  lat,
                  lng,
                  row.center_lat,
                  row.center_lng,
                );
                if (dist < nearestDistance) {
                  nearestDistance = dist;
                  nearestRow = row;
                }
              }
            }

            if (nearestRow && nearestDistance <= COVERAGE_MOVEMENT_THRESHOLD) {
              // Update existing nearby coverage if requested radius is larger
              if (radiusMeters > nearestRow.max_radius_m) {
                const { error: updateErr } = await supabase
                  .from("discover_coverage")
                  .update({
                    max_radius_m: radiusMeters,
                    last_fetched_at: new Date().toISOString(),
                  })
                  .eq("id", nearestRow.id);

                if (updateErr) {
                  console.warn(
                    `[discover] requestId=${requestId} coverageUpdate failed:`,
                    updateErr,
                  );
                } else {
                  console.log(
                    `[discover] requestId=${requestId} coverageUpdate id=${nearestRow.id} expandedRadius ${nearestRow.max_radius_m}→${radiusMeters}`,
                  );
                }
              }
            } else {
              // Insert new coverage row
              const { error: insertErr } = await supabase
                .from("discover_coverage")
                .insert({
                  center_lat: lat,
                  center_lng: lng,
                  max_radius_m: radiusMeters,
                  last_fetched_at: new Date().toISOString(),
                });

              if (insertErr) {
                console.warn(
                  `[discover] requestId=${requestId} coverageInsert failed:`,
                  insertErr,
                );
              } else {
                console.log(
                  `[discover] requestId=${requestId} coverageInsert center=${lat.toFixed(
                    4,
                  )},${lng.toFixed(4)} maxRadius=${radiusMeters}m`,
                );
              }
            }
          } catch (coverageUpsertError) {
            console.warn(
              `[discover] requestId=${requestId} coverageUpsertError:`,
              coverageUpsertError,
            );
          }

          // Re-query Supabase and return those rows (never return Google objects)
          // Include optional address/city columns when present.
          const { data: cols2 } = await supabase
            .from("information_schema.columns")
            .select("column_name")
            .eq("table_name", "coffee_places")
            .eq("table_schema", "public");
          const avail2 = new Set<string>(
            (cols2 || []).map((c: any) => c.column_name),
          );
          const finalSelect = [...CAFE_DISCOVER_SELECT].slice(0);
          if (avail2.has("address_en")) finalSelect.push("address_en");
          if (avail2.has("address_ar")) finalSelect.push("address_ar");
          if (avail2.has("city_en")) finalSelect.push("city_en");
          if (avail2.has("city_ar")) finalSelect.push("city_ar");

          // Debug bounding box and re-query behavior: log bounds and try
          // a full-table query in case the bounded query returns zero rows
          try {
            console.log("[discover] requery bounds", {
              minLat,
              maxLat,
              minLng,
              maxLng,
            });
          } catch (_) {}

          // If we persisted candidates, try to log lat/lng of one inserted row
          try {
            const firstPersisted = (persistResults || []).find(
              (x: any) => x.success && x.google_place_id,
            );
            if (firstPersisted && firstPersisted.google_place_id) {
              const { data: oneRow } = await supabase
                .from("coffee_places")
                .select(finalSelect.join(", "))
                .eq("google_place_id", firstPersisted.google_place_id)
                .limit(1);
              const one = Array.isArray(oneRow) ? oneRow[0] : oneRow;
              try {
                console.log("[discover] samplePersistedRow", {
                  google_place_id: firstPersisted.google_place_id,
                  lat: (one as any)?.lat ?? null,
                  lng: (one as any)?.lng ?? null,
                });
              } catch (_) {}
            }
          } catch (e) {
            console.warn("[discover] failed to fetch sample persisted row", e);
          }

          // Perform bounded query to get cafes within the bounding box
          const { data: finalRows, error: finalErr } = await supabase
            .from("coffee_places")
            .select(finalSelect.join(", "))
            .gte("lat", minLat)
            .lte("lat", maxLat)
            .gte("lng", minLng)
            .lte("lng", maxLng);
          if (finalErr) {
            console.error(
              "Failed to re-query Supabase after backfill (bounded)",
              finalErr,
            );
            return res.status(500).json({ error: "Failed to query cafes" });
          }

          // Apply distance filtering to ensure all cafes are within radiusMeters
          const rowsWithinRadius = (finalRows || []).filter((r: any) => {
            const cafeLat = r.lat;
            const cafeLng = r.lng;
            if (typeof cafeLat !== "number" || typeof cafeLng !== "number") {
              return false;
            }
            const distance = haversineDistance(lat, lng, cafeLat, cafeLng);
            return distance <= radiusMeters;
          });

          try {
            console.log(
              `[discover][${requestId}] boundedQueryResults=${
                (finalRows || []).length
              } afterDistanceFilter=${
                rowsWithinRadius.length
              } radiusMeters=${radiusMeters}`,
            );
          } catch (_) {}

          // If we persisted cafes but get zero results, this may indicate:
          // 1) Google returned cafes outside the radius (expected for some locations)
          // 2) Insert failures (check persistResults)
          // This is NORMAL for locations with no nearby cafes - return empty array
          if (
            (persistCandidatesCount || 0) > 0 &&
            rowsWithinRadius.length === 0
          ) {
            try {
              console.log(
                `[discover][${requestId}] ZERO_RESULTS after filtering: persisted=${persistCandidatesCount} bounded=${
                  (finalRows || []).length
                } withinRadius=0 — returning empty`,
              );
            } catch (_) {}
          }

          const mapped = (rowsWithinRadius || []).map((r: any) => {
            const nameEn = r.name_en ?? r.name_ar ?? null;
            const nameAr = r.name_ar ?? r.name_en ?? null;
            const addressEn = r.address_en ?? null;
            const addressAr = r.address_ar ?? null;
            const cityEn = r.city_en ?? null;
            const cityAr = r.city_ar ?? null;
            const displayName =
              lang === "ar" ? nameAr ?? nameEn : nameEn ?? nameAr;
            const displayAddress =
              lang === "ar" ? addressAr ?? addressEn : addressEn ?? addressAr;
            const displayCity =
              lang === "ar" ? cityAr ?? cityEn : cityEn ?? cityAr;
            const distMeters = haversineDistance(lat, lng, r.lat, r.lng);
            return {
              id: r.id ?? null,
              placeId: r.google_place_id ?? null,
              nameEn,
              name: displayName,
              nameAr,
              addressEn,
              address: displayAddress,
              addressAr,
              cityEn,
              city: displayCity,
              cityAr,
              latitude: r.lat ?? null,
              longitude: r.lng ?? null,
              rating: r.rating ?? null,
              reviews: r.reviews ?? null,
              // Do not return proxied photo URLs in the Discover list —
              // photos are fetched lazily on the cafe detail page.
              photoUrl: null,
              distance: distMeters,
            };
          });

          // Temporary per-request debug log: sample distance in meters
          try {
            const sample = mapped[0]?.distance ?? null;
            console.log(`[discover][debug] sampleDistanceMeters=${sample}`);
          } catch (_) {}

          try {
            dataSource = "google";
            console.log(
              `[discover][${requestId}] dataSource=${dataSource} effectiveLatLng=(${lat}, ${lng}) radiusRequested=${radiusMeters} googleRadiusUsed=${radiusMeters} placesReturned=${mapped.length} googleCalls=${googleCallsMade} coverageHit=false`,
            );
          } catch (_) {}

          return res.json(mapped);
        } catch (err: any) {
          console.error("Discover flow failed:", err);
          return res.status(502).json({ error: "Failed to fetch cafes" });
        }
      } catch (err: any) {
        console.error("Google Places fetch failed:", err);
        return res
          .status(502)
          .json({ error: "Failed to fetch cafes from Google Places" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cafes" });
    }
  });

  // Get a specific cafe
  app.get("/api/cafes/:id", async (req, res) => {
    try {
      const id = req.params.id;
      // Try local cafe first
      const cafe = await storage.getCafe(id);
      if (cafe) {
        // Compute top drinks using SQL aggregation (avg_rating, min 3 check-ins)
        let topDrinks: Array<{
          drinkId: string;
          drinkName: string;
          avgRating: number;
          count: number;
        }> = [];

        try {
          const { createServerSupabaseClient } = await import(
            "./supabaseClient"
          );
          const supabase = createServerSupabaseClient();

          // Aggregate check_ins by drink_id for this cafe, join with drinks table
          const { data: aggData, error: aggErr } = await supabase.rpc(
            "get_top_drinks_for_cafe",
            {
              p_place_id: cafe.id,
              min_check_ins: 1,
              max_results: 3,
            },
          );

          if (!aggErr && aggData) {
            topDrinks = aggData.map((row: any) => ({
              drinkId: row.drink_id,
              drinkName: row.drink_name,
              avgRating: parseFloat(row.avg_rating),
              count: parseInt(row.check_in_count, 10),
            }));

            try {
              console.log(
                `[cafe-detail] placeId=${cafe.id} topDrinksCount=${topDrinks.length}`,
              );
            } catch (_) {}
          }
        } catch (e) {
          console.error("Failed to compute top drinks:", e);
          topDrinks = [];
        }

        // Ensure we return authoritative rating/reviews from the DB when
        // this is a locally persisted cafe (storage.getCafe returned a row).
        let dbRow: any = null;
        try {
          const { createServerSupabaseClient } = await import(
            "./supabaseClient"
          );
          const supabase = createServerSupabaseClient();
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

        return res.json({ ...cafe, rating, reviews, topDrinks });
      }

      // Not a local cafe id — treat `id` as a Google Place ID. Before calling
      // Google Place Details, check local storage (Supabase) for an existing
      // cafe that references this place ID and whether the detail fields are
      // present. Place Details must be fetched only when detail fields are
      // missing; Discover must never call Place Details.
      const apiKey = process.env.GOOGLE_API_KEY as string;
      const lang = (req.query.lang as string) === "ar" ? "ar" : "en";

      // look for a local cafe that references this Google place id
      const localCafesAll = await storage.getCafes();
      const localByPlace = localCafesAll.find(
        (c: any) => c.placeId === id || (c as any).google_place_id === id,
      );

      // If we have a local record, read authoritative DB row to inspect
      // which detail fields are missing. (Log Supabase reads.)
      let dbRow: any = null;
      if (localByPlace) {
        try {
          console.log("[supabase] read coffee_places for detail check", {
            google_place_id: id,
          });
        } catch (_) {}
        const { createServerSupabaseClient } = await import("./supabaseClient");
        const supabase = createServerSupabaseClient();
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

      // Determine if detail fields are missing — if so, we must call Place Details.
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
          // Use stored data — DO NOT call Google Place Details.
          let topDrinks: Array<{
            drinkId: string;
            drinkName: string;
            avgRating: number;
            count: number;
          }> = [];

          try {
            const { createServerSupabaseClient } = await import(
              "./supabaseClient"
            );
            const supabase = createServerSupabaseClient();

            const { data: aggData, error: aggErr } = await supabase.rpc(
              "get_top_drinks_for_cafe",
              {
                p_place_id: localByPlace.id,
                min_check_ins: 1,
                max_results: 3,
              },
            );

            if (!aggErr && aggData) {
              topDrinks = aggData.map((row: any) => ({
                drinkId: row.drink_id,
                drinkName: row.drink_name,
                avgRating: parseFloat(row.avg_rating),
                count: parseInt(row.check_in_count, 10),
              }));

              try {
                console.log(
                  `[cafe-detail] placeId=${id} topDrinksCount=${topDrinks.length}`,
                );
              } catch (_) {}
            }
          } catch (e) {
            console.error("Failed to compute top drinks:", e);
            topDrinks = [];
          }

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
              : typeof (localByPlace && (localByPlace as any).rating) ===
                "number"
              ? (localByPlace as any).rating
              : null;
          const reviews =
            typeof (dbRow && (dbRow as any).reviews) === "number"
              ? (dbRow as any).reviews
              : typeof (localByPlace && (localByPlace as any).reviews) ===
                "number"
              ? (localByPlace as any).reviews
              : null;

          return res.json({
            id: localByPlace?.placeId ?? id,
            placeId: localByPlace?.placeId ?? id,
            nameEn,
            nameAr,
            imageUrl,
            rating,
            reviews,
            topDrinks,
          });
        }
      }

      // Place Details calls removed: rely on local/cache data only.
      try {
        // look for a local cafe that references this Google place id
        const localCafesAll = await storage.getCafes();
        const localByPlace = localCafesAll.find(
          (c: any) => c.placeId === id || (c as any).google_place_id === id,
        );

        let dbRow: any = null;
        if (localByPlace) {
          try {
            const { createServerSupabaseClient } = await import(
              "./supabaseClient"
            );
            const supabase = createServerSupabaseClient();
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

        // Compute topDrinks from local check-ins referencing this place
        let topDrinks: Array<{
          drinkId: string;
          drinkName: string;
          avgRating: number;
          count: number;
        }> = [];

        if (localByPlace) {
          try {
            const { createServerSupabaseClient } = await import(
              "./supabaseClient"
            );
            const supabase = createServerSupabaseClient();

            const { data: aggData, error: aggErr } = await supabase.rpc(
              "get_top_drinks_for_cafe",
              {
                p_place_id: localByPlace.id,
                min_check_ins: 1,
                max_results: 3,
              },
            );

            if (!aggErr && aggData) {
              topDrinks = aggData.map((row: any) => ({
                drinkId: row.drink_id,
                drinkName: row.drink_name,
                avgRating: parseFloat(row.avg_rating),
                count: parseInt(row.check_in_count, 10),
              }));

              try {
                console.log(
                  `[cafe-detail] placeId=${id} topDrinksCount=${topDrinks.length}`,
                );
              } catch (_) {}
            }
          } catch (e) {
            console.error("Failed to compute top drinks:", e);
            topDrinks = [];
          }
        }

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
            : typeof (localByPlace && (localByPlace as any).reviews) ===
              "number"
            ? (localByPlace as any).reviews
            : null;

        return res.json({
          id: localByPlace?.placeId ?? id,
          placeId: localByPlace?.placeId ?? id,
          nameEn,
          nameAr,
          imageUrl,
          rating,
          reviews,
          topDrinks,
        });
      } catch (err) {
        console.error("Cafe detail local fetch failed:", err);
        return res.status(500).json({ error: "Failed to fetch cafe" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cafe" });
    }
  });

  // Create a new cafe (authenticated)
  app.post("/api/cafes", async (req, res) => {
    try {
      const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "") || undefined;
      if (!token) return res.status(401).json({ error: "Missing auth token" });
      const userId = await getUserIdFromToken(token);
      if (!userId) return res.status(401).json({ error: "Invalid auth token" });
      const validatedData = insertCafeSchema.parse(req.body);
      const cafe = await storage.createCafe(validatedData);
      res.status(201).json(cafe);
    } catch (error) {
      res.status(400).json({ error: "Invalid cafe data" });
    }
  });

  // roasters API removed

  // Get all drinks
  app.get("/api/drinks", async (req, res) => {
    try {
      const drinks = await storage.getDrinks();
      res.json(drinks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch drinks" });
    }
  });

  // Create a new drink (authenticated)
  app.post("/api/drinks", async (req, res) => {
    try {
      const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "") || undefined;
      if (!token) return res.status(401).json({ error: "Missing auth token" });
      const userId = await getUserIdFromToken(token);
      if (!userId) return res.status(401).json({ error: "Invalid auth token" });
      const validatedData = insertDrinkSchema.parse(req.body);
      const drink = await storage.createDrink(validatedData);
      res.status(201).json(drink);
    } catch (error) {
      res.status(400).json({ error: "Invalid drink data" });
    }
  });

  // Get current user profile
  app.get("/api/profile", async (req, res) => {
    try {
      const token =
        (req.headers.authorization || "").replace(/^Bearer\s+/i, "") ||
        undefined;
      if (!token) return res.status(401).json({ error: "Missing auth token" });

      let userId: string | null = null;
      try {
        userId = await getUserIdFromToken(token);
      } catch (authErr) {
        // SUPABASE_UNREACHABLE: network/DNS failure
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        // SESSION_INVALID: user was deleted while token was valid
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }

      if (!userId) return res.status(401).json({ error: "Invalid auth token" });

      // Fetch canonical profile fields from Supabase `profiles` table.
      let profileRow: any = null;
      try {
        const { createServerSupabaseClient } = await import("./supabaseClient");
        const supabase = createServerSupabaseClient(token);
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "user_id, username, display_name, avatar_url, bio, is_complete",
          )
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();
        if (!error && data) profileRow = data;
      } catch (e) {
        // non-fatal: continue with memory-backed profile
      }

      // Invariant: authenticated users MUST have a DB-backed profile row.
      if (!profileRow) {
        throw new Error(
          "Invariant violation: authenticated user has no profile",
        );
      }

      // Compute counts directly from the DB rather than relying on memory-backed
      // storage (which may be empty for authenticated users). This ensures the
      // profile shows accurate numbers even when in-memory maps are unused.
      const profile = (await storage.getUserProfile(userId)) as any;
      let checkInsCount = 0;
      let uniqueDrinksCount = 0;
      try {
        const { createServerSupabaseClient } = await import("./supabaseClient");
        const supabase = createServerSupabaseClient(token);
        const { data: userCheckIns } = await supabase
          .from("check_ins")
          .select("place_id")
          .eq("user_id", userId);
        if (Array.isArray(userCheckIns)) {
          checkInsCount = userCheckIns.length;
          uniqueDrinksCount = new Set(
            userCheckIns.map((r: any) => r.place_id).filter(Boolean),
          ).size;
        }
      } catch (e) {
        // ignore DB count errors and fall back to memory-backed counts
        checkInsCount = profile?.checkInsCount ?? 0;
        uniqueDrinksCount = profile?.uniqueDrinksCount ?? 0;
      }

      // If a DB-backed `profiles` row exists, return canonical fields and DB counts.
      if (profileRow) {
        const merged = {
          id: userId,
          username: profileRow.username ?? null,
          displayName: profileRow.display_name ?? null,
          avatarUrl: profileRow.avatar_url ?? null,
          bio: profileRow.bio ?? null,
          isComplete: Boolean(profileRow.is_complete ?? false),
          checkInsCount: checkInsCount,
          followersCount: profile?.followersCount ?? 0,
          followingCount: profile?.followingCount ?? 0,
          uniqueDrinksCount: uniqueDrinksCount,
        };

        return res.json(merged);
      }

      // No DB row found — do not return static/demo fields. If memory-backed
      // storage has counts we can return them, but indicate the canonical
      // profile is missing so the client can handle onboarding.
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const noDbPayload = {
        id: userId,
        username: null,
        displayName: null,
        avatarUrl: null,
        bio: null,
        isComplete: false,
        checkInsCount: profile?.checkInsCount ?? 0,
        followersCount: profile?.followersCount ?? 0,
        followingCount: profile?.followingCount ?? 0,
        uniqueDrinksCount: profile?.uniqueDrinksCount ?? 0,
      };

      return res.json(noDbPayload);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Public demo profile endpoint for development/demo purposes.
  app.get("/api/demo-profile", async (req, res) => {
    try {
      // Only allow demo data for unauthenticated callers. If a valid
      // Supabase auth token is present, refuse to serve demo data so real
      // users never see or interact with demo users.
      const token =
        (req.headers.authorization || "").replace(/^Bearer\s+/i, "") ||
        undefined;
      let demoViewer: string | null = null;
      try {
        demoViewer = await getUserIdFromToken(token);
      } catch (authErr) {
        // For demo endpoint, if unreachable, just allow demo (don't block with 503)
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          demoViewer = null; // treat as unauthenticated
        } else if ((authErr as any)?.sessionInvalid === true) {
          // Invalid session also means can't auth, so allow demo
          demoViewer = null;
        } else {
          throw authErr;
        }
      }
      if (demoViewer) {
        return res
          .status(403)
          .json({ error: "Demo is only available to unauthenticated users" });
      }

      const demo = {
        id: "demo",
        username: "demo",
        displayName: "Demo User",
        avatarUrl: null,
        bio: "This is a read-only demo profile. Sign in to create your profile.",
        isComplete: false,
        checkInsCount: 0,
        followersCount: 0,
        followingCount: 0,
        uniqueDrinksCount: 0,
      };
      return res.json(demo);
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch demo profile" });
    }
  });

  // Profile rows are now created by the database trigger; no server-side
  // endpoint is necessary to ensure profile rows exist.

  // Server-side signup endpoint: creates auth user and profile atomically
  app.post("/api/signup", async (req, res) => {
    try {
      const { email, password, termsAccepted, privacyAccepted } =
        req.body || {};
      if (!email || !password)
        return res.status(400).json({ error: "missing email or password" });
      if (!termsAccepted || !privacyAccepted)
        return res.status(400).json({ error: "LEGAL_ACCEPTANCE_REQUIRED" });

      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient(); // uses service key
      console.log("signup_attempt", email);
      // Ensure service role key is available (admin operations require it)
      if (!process.env.SUPABASE_SERVICE_KEY) {
        console.error("/api/signup: SUPABASE_SERVICE_KEY not configured");
        return res.status(500).json({ error: "SERVICE_KEY_MISSING" });
      }

      // Pre-check: inspect whether a Supabase auth user for this email exists
      // and whether it is already confirmed. This uses the debug helper which
      // logs details server-side and also returns the found user object.
      try {
        const existingUser = await lookupAuthUserByEmail(email);
        if (existingUser) {
          const isConfirmed = !!existingUser.email_confirmed_at;
          if (isConfirmed) {
            // Confirmed users should not be allowed to sign up again.
            return res.status(409).json({
              error: "email_already_confirmed",
              message:
                "This email is already registered. Please sign in instead.",
            });
          }

          // Unconfirmed user exists: resend confirmation email and return
          try {
            console.log("email_exists_detected", email);
            await supabase.auth.resend({ type: "signup", email } as any);
            console.log("confirmation_resent", email);
            return res.status(200).json({
              message:
                "This email is already registered. We’ve resent your confirmation email.",
              status: "confirmation_resent",
            });
          } catch (resendErr: any) {
            console.error("[signup] resend_failed", resendErr);
            const resendMsg = (resendErr?.message ?? "").toLowerCase();
            if (resendMsg.includes("rate") || resendMsg.includes("too many")) {
              return res.status(429).json({
                message:
                  "Please wait a moment before requesting another confirmation email.",
                status: "rate_limited",
              });
            }
            return res.status(400).json({
              message:
                "Something went wrong while creating your account. Please try again.",
              status: "resend_failed",
            });
          }
        }
      } catch (preCheckErr: any) {
        console.error("/api/signup: pre-check failed", preCheckErr);
        // Continue to normal signup flow if pre-check fails to avoid blocking
        // users due to debug inspection problems.
      }

      // Create the auth user using the service role key. Wrap call to surface
      // library errors clearly and tolerate different return shapes.
      let createdUserId: string | null = null;
      let createdUserObj: any = null;
      try {
        // Use non-admin signUp so Supabase sends the confirmation email
        const createRes: any = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              terms_accepted: termsAccepted === true,
              privacy_accepted: privacyAccepted === true,
            },
          },
        } as any);

        // Supabase admin createUser may either throw or return an object
        // with .error set when the operation failed. Normalize both cases.
        const data = createRes?.data ?? createRes;
        const userObj = data?.user ?? data;
        createdUserId = userObj?.id ?? null;
        createdUserObj = userObj ?? null;

        // If the library returned an error object instead of throwing,
        // map known auth errors to friendly messages and log details.
        const respError = createRes?.error ?? null;
        if (respError) {
          console.error("[signup]", respError);
          const respCode = respError?.code ?? "";
          const respMsg = String(respError?.message ?? "").toLowerCase();

          // Rate limit from Supabase when sending emails
          if (respCode === "over_email_send_rate_limit") {
            return res.status(429).json({
              message:
                "Please wait a moment before requesting another confirmation email.",
              status: "rate_limited",
            });
          }

          if (
            respCode === "email_exists" ||
            respCode === "user_already_exists" ||
            respMsg.includes("already exists") ||
            respMsg.includes("user with email")
          ) {
            try {
              const { data: users, error: fetchErr } =
                await supabase.auth.admin.listUsers();
              const existingUser = users?.users?.find(
                (u: any) => u.email?.toLowerCase() === email.toLowerCase(),
              );

              if (existingUser) {
                await lookupAuthUserByEmail(email);
                const isConfirmed = !!existingUser.email_confirmed_at;
                if (!isConfirmed) {
                  try {
                    console.log("email_exists_detected", email);
                    await supabase.auth.resend({
                      type: "signup",
                      email,
                    } as any);
                    console.log("confirmation_resent", email);
                    return res.status(200).json({
                      message:
                        "This email is already registered. We’ve resent your confirmation email.",
                      status: "confirmation_resent",
                    });
                  } catch (resendErr: any) {
                    console.error("[signup] resend_failed", resendErr);
                    const resendMsg = (resendErr?.message ?? "").toLowerCase();
                    if (
                      resendMsg.includes("rate") ||
                      resendMsg.includes("too many")
                    ) {
                      return res.status(429).json({
                        message:
                          "Please wait a moment before requesting another confirmation email.",
                        status: "rate_limited",
                      });
                    }
                    return res.status(400).json({
                      message:
                        "Something went wrong while creating your account. Please try again.",
                      status: "resend_failed",
                    });
                  }
                } else {
                  return res.status(409).json({
                    message:
                      "An account with this email already exists. Please log in.",
                    status: "email_already_confirmed",
                  });
                }
              }

              return res.status(409).json({
                message: "This email is already registered.",
                status: "email_exists",
              });
            } catch (checkErr: any) {
              console.error("[signup] failed_to_check_user", checkErr);
              return res.status(400).json({
                message:
                  "Something went wrong while creating your account. Please try again.",
                status: "check_failed",
              });
            }
          }

          console.error("[signup] create_user_error", respError);
          return res.status(400).json({
            message:
              "Something went wrong while creating your account. Please try again.",
            status: "auth_error",
          });
        }

        if (!createdUserId) {
          console.error("[signup] createUser_no_id", createRes);
          return res.status(400).json({
            message:
              "Something went wrong while creating your account. Please try again.",
            status: "no_user_id",
          });
        }
      } catch (createErr: any) {
        // auth-js may throw structured errors with __isAuthError
        console.error("[signup]", createErr);
        const code = createErr?.code ?? "unexpected_failure";
        const message = (createErr?.message ?? "").toLowerCase();

        // Map rate limit errors explicitly
        if (code === "over_email_send_rate_limit") {
          return res.status(429).json({
            message:
              "Please wait a moment before requesting another confirmation email.",
            status: "rate_limited",
          });
        }

        if (
          code === "email_exists" ||
          code === "user_already_exists" ||
          message.includes("already exists") ||
          message.includes("user with email")
        ) {
          try {
            const { data: users, error: fetchErr } =
              await supabase.auth.admin.listUsers();
            const existingUser = users?.users?.find(
              (u: any) => u.email?.toLowerCase() === email.toLowerCase(),
            );

            if (existingUser) {
              await lookupAuthUserByEmail(email);
              const isConfirmed = !!existingUser.email_confirmed_at;

              if (!isConfirmed) {
                try {
                  console.log("email_exists_detected", email);
                  await supabase.auth.resend({
                    type: "signup",
                    email,
                  } as any);
                  console.log("confirmation_resent", email);
                  return res.status(200).json({
                    message:
                      "This email is already registered. We’ve resent your confirmation email.",
                    status: "confirmation_resent",
                  });
                } catch (resendErr: any) {
                  console.error("[signup] resend_failed", resendErr);
                  const resendMsg = (resendErr?.message ?? "").toLowerCase();
                  if (
                    resendMsg.includes("rate") ||
                    resendMsg.includes("too many")
                  ) {
                    return res.status(429).json({
                      message:
                        "Please wait a moment before requesting another confirmation email.",
                      status: "rate_limited",
                    });
                  }
                  return res.status(400).json({
                    message:
                      "Something went wrong while creating your account. Please try again.",
                    status: "resend_failed",
                  });
                }
              } else {
                return res.status(409).json({
                  error: "Email already registered. Please log in.",
                  status: "email_already_confirmed",
                });
              }
            }

            return res.status(409).json({
              message: "This email is already registered.",
              status: "email_exists",
            });
          } catch (checkErr: any) {
            console.error(
              "/api/signup: failed to check existing user",
              checkErr,
            );
            return res.status(500).json({
              error: "Failed to process signup. Please try again.",
              status: "check_failed",
            });
          }
        }

        // For other auth errors, return generic failure
        return res.status(500).json({
          error: "Failed to create user",
          details: String(code),
          status: "auth_error",
        });
      }

      // Update the profile row (created by insert trigger or default) with
      // explicit acceptance flags. Use UPDATE instead of INSERT to avoid
      // triggering CHECK constraints during creation.
      await lookupAuthUserByEmail(email);
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          terms_accepted: true,
          privacy_accepted: true,
          legal_accepted: true,
          legal_accepted_at: new Date().toISOString(),
        })
        .eq("user_id", createdUserId);

      if (updateErr) {
        // Rollback: delete the created auth user
        try {
          await supabase.auth.admin.deleteUser(createdUserId as string);
        } catch (delErr) {
          console.error("/api/signup: failed to rollback user", delErr);
        }
        console.error("/api/signup: failed to update profile", updateErr);
        return res.status(500).json({ error: "Failed to update profile" });
      }

      return res.json({ user: createdUserObj ?? { id: createdUserId } });
    } catch (e) {
      console.error("/api/signup error", e);
      return res.status(500).json({ error: "signup_failed" });
    }
  });

  // Update current user's profile
  app.put("/api/profile", async (req, res) => {
    try {
      const token =
        (req.headers.authorization || "").replace(/^Bearer\s+/i, "") ||
        undefined;
      if (!token) return res.status(401).json({ error: "Missing auth token" });

      let userId: string | null = null;
      try {
        userId = (await getUserIdFromToken(token)) ?? null;
      } catch (authErr) {
        // SUPABASE_UNREACHABLE: network/DNS failure
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        // SESSION_INVALID: user was deleted while token was valid
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }

      if (!userId) return res.status(401).json({ error: "Invalid auth token" });

      const payload: any = {};
      if (req.body.username !== undefined) payload.username = req.body.username;
      if (req.body.displayName !== undefined)
        payload.display_name = req.body.displayName;
      if (req.body.avatarUrl !== undefined)
        payload.avatar_url = req.body.avatarUrl;
      if (req.body.bio !== undefined) payload.bio = req.body.bio;

      // Upsert to Supabase and then read the canonical row back
      let profileRow: any = null;
      try {
        const { createServerSupabaseClient } = await import("./supabaseClient");
        const supabase = createServerSupabaseClient(token);

        const upsertObj: any = { user_id: userId };
        if (payload.username !== undefined)
          upsertObj.username = payload.username;
        if (
          payload.username !== undefined &&
          payload.username !== null &&
          String(payload.username).trim() !== ""
        ) {
          upsertObj.is_complete = true;
        }
        if (payload.display_name !== undefined)
          upsertObj.display_name = payload.display_name;
        if (payload.avatar_url !== undefined)
          upsertObj.avatar_url = payload.avatar_url;
        if (payload.bio !== undefined) upsertObj.bio = payload.bio;

        const { error: upErr } = await supabase
          .from("profiles")
          .upsert(upsertObj, { onConflict: "user_id" });
        if (upErr) {
          console.error("/api/profile upsert error", upErr);
          return res.status(500).json({ error: "Failed to update profile" });
        }

        const { data, error: selErr } = await supabase
          .from("profiles")
          .select(
            "user_id, username, display_name, avatar_url, bio, is_complete",
          )
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();
        if (!selErr && data) profileRow = data;
      } catch (e) {
        console.error("/api/profile supabase upsert/read failed", e);
      }

      // Try to update in-memory storage but do not make it fatal
      try {
        const mapped: any = {};
        if (req.body.username !== undefined)
          mapped.username = req.body.username;
        if (req.body.displayName !== undefined)
          mapped.displayName = req.body.displayName;
        if (req.body.avatarUrl !== undefined)
          mapped.avatarUrl = req.body.avatarUrl;
        if (req.body.bio !== undefined) mapped.bio = req.body.bio;
        try {
          await storage.updateUser(userId, mapped);
        } catch (e) {
          console.warn("/api/profile storage.updateUser failed", e);
        }
      } catch (e) {
        console.warn("/api/profile storage mapping failed", e);
      }

      // Build response using canonical DB row when available
      const profile = (await storage.getUserProfile(userId)) as any;
      const merged = {
        id: userId,
        username: profileRow?.username ?? payload.username ?? null,
        displayName: profileRow?.display_name ?? payload.display_name ?? null,
        avatarUrl: profileRow?.avatar_url ?? payload.avatar_url ?? null,
        bio: profileRow?.bio ?? payload.bio ?? null,
        isComplete: Boolean(profileRow?.is_complete ?? false),
        checkInsCount: profile?.checkInsCount ?? 0,
        followersCount: profile?.followersCount ?? 0,
        followingCount: profile?.followingCount ?? 0,
        uniqueDrinksCount: profile?.uniqueDrinksCount ?? 0,
      };

      return res.json(merged);
    } catch (error) {
      res.status(400).json({ error: "Invalid profile data" });
    }
  });

  // Check username availability (public)
  app.get("/api/profiles/check-username", async (req, res) => {
    try {
      const raw = (req.query.username as string) || "";
      const username = String(raw).toLowerCase();
      if (!username) return res.status(400).json({ error: "missing username" });

      const reserved = [
        "admin",
        "support",
        "help",
        "api",
        "auth",
        "login",
        "signup",
        "discover",
        "profile",
        "settings",
        "refote",
      ];

      const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9._]{1,18})[a-z0-9]$/;
      if (username.length < 3 || username.length > 20)
        return res.json({ available: false, reason: "length" });
      if (reserved.includes(username))
        return res.json({ available: false, reason: "reserved" });
      if (!USERNAME_REGEX.test(username))
        return res.json({ available: false, reason: "format" });

      try {
        const { createServerSupabaseClient } = await import("./supabaseClient");
        const supabase = createServerSupabaseClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", username)
          .limit(1)
          .maybeSingle();
        if (error) {
          console.error("/api/profiles/check-username: supabase error", error);
          return res.status(500).json({ available: false, reason: "error" });
        }
        if (data) return res.json({ available: false, reason: "taken" });
        return res.json({ available: true });
      } catch (e) {
        console.error("/api/profiles/check-username error", e);
        return res.status(500).json({ available: false, reason: "error" });
      }
    } catch (err) {
      return res.status(500).json({ available: false, reason: "error" });
    }
  });

  // Get current user's check-ins
  app.get("/api/profile/check-ins", async (req, res) => {
    try {
      const token =
        (req.headers.authorization || "").replace(/^Bearer\s+/i, "") ||
        undefined;
      let userId: string | null = null;
      try {
        userId = await getUserIdFromToken(token);
      } catch (authErr) {
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }
      if (!userId) return res.status(401).json({ error: "Missing auth token" });

      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient(token);

      const { data: rows, error } = await supabase
        .from("check_ins")
        .select(
          "id, user_id, place_id, drink_name, rating, notes, photo_url, tasting_notes, temperature, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch canonical profile row for the user to populate user snapshot
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      // Fetch related cafes in bulk
      const placeIds = Array.from(
        new Set((rows || []).map((r: any) => r.place_id).filter(Boolean)),
      );
      let cafesMap: Record<string, any> = {};
      if (placeIds.length > 0) {
        const { data: cafes } = await supabase
          .from("coffee_places")
          .select(
            "id, google_place_id, name_en, name_ar, city_en, city_ar, photo_reference, rating, reviews",
          )
          .in("id", placeIds as any[]);
        (cafes || []).forEach((c: any) => {
          cafesMap[c.id] = c;
        });
      }

      const mapped = (rows || []).map((r: any) => {
        const cafe = r.place_id
          ? ((): any => {
              const c = cafesMap[r.place_id];
              if (!c) return null;
              return {
                id: c.id,
                placeId: c.google_place_id ?? null,
                nameEn: c.name_en ?? null,
                nameAr: c.name_ar ?? null,
                cityEn: c.city_en ?? null,
                cityAr: c.city_ar ?? null,
                photoReference: c.photo_reference ?? null,
                rating: c.rating ?? null,
                reviews: c.reviews ?? null,
              };
            })()
          : null;

        return {
          id: r.id,
          userId: r.user_id,
          drinkId: r.drink_name || "",
          cafeId: r.place_id ?? null,
          roasterId: null,
          rating: r.rating ?? 0,
          notes: r.notes ?? null,
          photoUrl: r.photo_url ?? null,
          tastingNotes: ((): any[] => {
            const t = r.tasting_notes;
            if (Array.isArray(t)) return t;
            if (t == null) return [];
            try {
              return JSON.parse(t);
            } catch (_) {
              return [];
            }
          })(),
          temperature: r.temperature ?? null,
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
          user: {
            id: userId,
            username: profileRow?.username ?? null,
            displayName: profileRow?.display_name ?? null,
            avatarUrl: profileRow?.avatar_url ?? null,
          },
          drink: {
            id: r.drink_name || "",
            name: r.drink_name || "",
          },
          cafe,
          likesCount: 0,
          isLiked: false,
        };
      });

      res.json(mapped);
    } catch (error) {
      console.error("/api/profile/check-ins error", error);
      res.status(500).json([]);
    }
  });

  // Toggle follow a user
  app.post("/api/users/:id/follow", async (req, res) => {
    try {
      const token = req.headers.authorization || undefined;
      let userId: string | null = null;
      try {
        userId = await getUserIdFromToken(token);
      } catch (authErr) {
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }
      if (!userId) return res.status(401).json({ error: "Missing auth token" });
      const isFollowing = await storage.toggleFollow(userId, req.params.id);
      res.json({ isFollowing });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle follow" });
    }
  });

  // (removed) Toggle follow by username convenience route

  // Send a friend request to a user
  app.post("/api/users/:id/friend-request", async (req, res) => {
    try {
      const token = req.headers.authorization || undefined;
      let userId: string | null = null;
      try {
        userId = await getUserIdFromToken(token);
      } catch (authErr) {
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }
      if (!userId) return res.status(401).json({ error: "Missing auth token" });
      const request = await storage.sendFriendRequest(userId, req.params.id);
      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to send friend request" });
    }
  });

  // Get incoming friend requests for current user
  app.get("/api/friend-requests", async (req, res) => {
    try {
      const token = req.headers.authorization || undefined;
      let userId: string | null = null;
      try {
        userId = await getUserIdFromToken(token);
      } catch (authErr) {
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }
      if (!userId) return res.status(401).json({ error: "Missing auth token" });
      const incoming = await storage.getIncomingFriendRequests(userId);
      res.json(incoming);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch friend requests" });
    }
  });

  // Accept friend request
  app.post("/api/friend-requests/:id/accept", async (req, res) => {
    try {
      const token = req.headers.authorization || undefined;
      let userId: string | null = null;
      try {
        userId = await getUserIdFromToken(token);
      } catch (authErr) {
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }
      if (!userId) return res.status(401).json({ error: "Missing auth token" });
      const accepted = await storage.acceptFriendRequest(req.params.id, userId);
      if (!accepted)
        return res
          .status(404)
          .json({ error: "Request not found or not allowed" });
      res.json(accepted);
    } catch (error) {
      res.status(500).json({ error: "Failed to accept friend request" });
    }
  });

  // Decline friend request
  app.post("/api/friend-requests/:id/decline", async (req, res) => {
    try {
      const token = req.headers.authorization || undefined;
      let userId: string | null = null;
      try {
        userId = await getUserIdFromToken(token);
      } catch (authErr) {
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }
      if (!userId) return res.status(401).json({ error: "Missing auth token" });
      const ok = await storage.declineFriendRequest(req.params.id, userId);
      res.json({ ok });
    } catch (error) {
      res.status(500).json({ error: "Failed to decline friend request" });
    }
  });

  // Get relationship between current user and another user
  app.get("/api/users/:id/relationship", async (req, res) => {
    try {
      const otherId = req.params.id;
      const token = req.headers.authorization || undefined;
      let userId: string | null = null;
      try {
        userId = await getUserIdFromToken(token);
      } catch (authErr) {
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }
      if (!userId) return res.status(401).json({ error: "Missing auth token" });
      const isFollowing = await storage.isFollowing(userId, otherId);
      const friendRequest = await storage.getFriendRequestBetween(
        userId,
        otherId,
      );
      res.json({ isFollowing, friendRequest });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch relationship" });
    }
  });

  // Get a user's profile
  app.get("/api/users/:id", async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Get a user's profile by username
  app.get("/api/users/username/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ error: "User not found" });
      const profile = await storage.getUserProfile(user.id);
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user by username" });
    }
  });

  // Get followers list for a user
  app.get("/api/users/:id/followers", async (req, res) => {
    try {
      const userId = req.params.id;
      const users = await storage.getUsers();
      const followers = [] as any[];
      for (const u of users) {
        const follows = await storage.isFollowing(u.id, userId);
        if (follows) followers.push(u);
      }
      res.json(followers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch followers" });
    }
  });

  // Get following list for a user
  app.get("/api/users/:id/following", async (req, res) => {
    try {
      const userId = req.params.id;
      const users = await storage.getUsers();
      const following = [] as any[];
      for (const u of users) {
        const follows = await storage.isFollowing(userId, u.id);
        if (follows) following.push(u);
      }
      res.json(following);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch following" });
    }
  });

  // Followers by username
  app.get("/api/users/username/:username/followers", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ error: "User not found" });
      const users = await storage.getUsers();
      const followers = [] as any[];
      for (const u of users) {
        const follows = await storage.isFollowing(u.id, user.id);
        if (follows) followers.push(u);
      }
      res.json(followers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch followers by username" });
    }
  });

  // Following by username
  app.get("/api/users/username/:username/following", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ error: "User not found" });
      const users = await storage.getUsers();
      const following = [] as any[];
      for (const u of users) {
        const follows = await storage.isFollowing(user.id, u.id);
        if (follows) following.push(u);
      }
      res.json(following);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch following by username" });
    }
  });

  // Get a user's check-ins
  app.get("/api/users/:id/check-ins", async (req, res) => {
    try {
      // Only allow a user to fetch their own check-ins
      const token = req.headers.authorization || undefined;
      let requesterId: string | null = null;
      try {
        requesterId = await getUserIdFromToken(token);
      } catch (authErr) {
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }
      if (!requesterId)
        return res.status(401).json({ error: "Missing auth token" });
      if (requesterId !== req.params.id) {
        return res.status(403).json({ error: "Not allowed" });
      }
      const checkIns = await storage.getCheckInsByUser(req.params.id, token);
      res.json(checkIns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch check-ins" });
    }
  });

  // Get activity feed (simulated)
  app.get("/api/activity", async (req, res) => {
    try {
      // Return only 'like' activities relevant to the current user:
      // - someone liked the current user's check-in
      // - OR the current user liked someone else's check-in
      const activities = await storage.getActivity();
      const relevant: any[] = [];
      const token = req.headers.authorization || undefined;
      let userId: string | null = null;
      try {
        userId = await getUserIdFromToken(token);
      } catch (authErr) {
        if ((authErr as any)?.code === "SUPABASE_UNREACHABLE") {
          return res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            source: "supabase",
          });
        }
        if ((authErr as any)?.sessionInvalid === true) {
          return res.status(403).json({
            error: "SESSION_INVALID",
            details: "Your session has expired. Please sign in again.",
          });
        }
        throw authErr;
      }
      if (!userId) return res.status(401).json({ error: "Missing auth token" });

      for (const a of activities) {
        if (a.type !== "like") continue; // only likes
        // If the activity was performed by the current user (they liked someone)
        if (a.userId === userId) {
          relevant.push(a);
          continue;
        }

        // Otherwise, check if the like targets a check-in owned by current user
        if (a.targetId) {
          try {
            const targetCheckIn = await storage.getCheckIn(a.targetId);
            if (targetCheckIn && targetCheckIn.userId === userId) {
              relevant.push(a);
            }
          } catch (err) {
            // ignore mapping errors for individual activities
          }
        }
      }

      const mapped = relevant.map((a: any) => ({
        id: a.id,
        type: a.type,
        user: a.userSnapshot,
        target: a.targetText ?? null,
        timestamp: a.createdAt,
      }));
      res.json(mapped);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  // Helper: fetch cafes using Google Places (SearchText)
  async function fetchGooglePlacesCafes(searchText: string, apiKey: string) {
    const endpoint = `https://places.googleapis.com/v1/places:searchText?key=${apiKey}`;

    // bounding rectangle for Saudi Arabia
    const locationRestriction = {
      rectangle: {
        low: { lat: 16.3478, lng: 34.5711 },
        high: { lat: 32.1543, lng: 55.6667 },
      },
    };

    // field mask requested
    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.rating",
      "places.reviews",
      "places.location",
      "places.addressComponents",
      "places.photos",
      "places.businessStatus",
    ].join(",");

    // No dynamic test-location bias here. Do not read temp_location.json
    // at runtime — the Places SearchText endpoint will be called without
    // a locationBias so results are globally relevant for the query.

    // perform two calls: Arabic and English, then merge
    // Use rate-limited fetches for Places v1 calls. If the limiter blocks
    // both calls, signal RateLimitExceeded so callers can fall back to
    // cached results instead of propagating an error to clients.
    const { attemptFetch } = await import("./googleRateLimiter");
    const [arRes, enRes] = await Promise.all([
      attemptFetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-User-Language": "ar",
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify({
          query: searchText,
          locationRestriction,
          includedType: "CAFE",
          pageSize: 50,
        }),
      }),
      attemptFetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-User-Language": "en",
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify({
          query: searchText,
          locationRestriction,
          includedType: "CAFE",
          pageSize: 50,
        }),
      }),
    ]);

    if (!arRes && !enRes) {
      // Both requests were blocked by the rate limiter
      throw new Error("RateLimitExceeded");
    }

    if ((!arRes || !arRes.ok) && (!enRes || !enRes.ok)) {
      throw new Error("Places API requests failed");
    }

    const arJson = arRes && arRes.ok ? await arRes.json() : { results: [] };
    const enJson = enRes && enRes.ok ? await enRes.json() : { results: [] };

    const arPlaces = arJson.results || [];
    const enPlaces = enJson.results || [];

    // Map arabic names by place id
    const arNameById: Record<string, any> = {};
    for (const p of arPlaces) {
      if (p && p.placeId) arNameById[p.placeId] = p.displayName || p;
    }

    const mapped: any[] = [];
    for (const p of enPlaces) {
      try {
        if (!p || !p.placeId) continue;
        // Skip permanently closed
        if (p.businessStatus === "CLOSED_PERMANENTLY") continue;

        const id = p.placeId;

        // Display names
        const nameEn =
          (p.displayName && (p.displayName.text || p.displayName)) || null;
        const arDisplay = arNameById[id];
        const nameAr = (arDisplay && (arDisplay.text || arDisplay)) || null;

        // Rating and reviews
        const rating = typeof p.rating === "number" ? p.rating : null;
        const reviews = Array.isArray(p.reviews)
          ? p.reviews.length
          : typeof p.userRatingsTotal === "number"
          ? p.userRatingsTotal
          : null;

        // Location: flexible access
        let latitude: number | null = null;
        let longitude: number | null = null;
        if (p.location) {
          if (p.location.latLng) {
            latitude =
              p.location.latLng.latitude ?? p.location.latLng.lat ?? null;
            longitude =
              p.location.latLng.longitude ?? p.location.latLng.lng ?? null;
          } else if (
            typeof p.location.lat === "number" &&
            typeof p.location.lng === "number"
          ) {
            latitude = p.location.lat;
            longitude = p.location.lng;
          }
        }

        // Address components: extract city in en/ar if available
        let cityEn: string | null = null;
        let cityAr: string | null = null;
        if (p.addressComponents && Array.isArray(p.addressComponents)) {
          for (const comp of p.addressComponents) {
            if (!comp || !comp.types) continue;
            if (
              comp.types.includes("locality") ||
              comp.types.includes("administrative_area_level_2")
            ) {
              cityEn = cityEn || (comp.text && comp.text);
            }
          }
        }
        if (arPlaces.length) {
          // try to extract Arabic city from corresponding arabic place if present
          const arP = arPlaces.find((x: any) => x.placeId === id);
          if (
            arP &&
            arP.addressComponents &&
            Array.isArray(arP.addressComponents)
          ) {
            for (const comp of arP.addressComponents) {
              if (!comp || !comp.types) continue;
              if (
                comp.types.includes("locality") ||
                comp.types.includes("administrative_area_level_2")
              ) {
                cityAr = cityAr || (comp.text && comp.text);
              }
            }
          }
        }

        // Photos: construct first photo URL using resource name
        let photoUrl: string | null = null;
        if (p.photos && Array.isArray(p.photos) && p.photos.length > 0) {
          const first = p.photos[0];
          const photoName =
            (first && first.photo && first.photo.name) ||
            first.name ||
            first.photoName ||
            null;
          if (photoName) {
            // Expose a server-side media endpoint that accepts the photo resource name
            photoUrl = `/api/places-media?name=${encodeURIComponent(
              photoName,
            )}&maxWidthPx=1000`;
          }
        }

        mapped.push({
          placeId: id,
          nameAr: nameAr ?? null,
          nameEn: nameEn ?? null,
          rating,
          reviews,
          latitude,
          longitude,
          cityAr: cityAr ?? null,
          cityEn: cityEn ?? null,
          photoUrl,
        });
      } catch (err) {
        console.error("Error mapping place", err);
      }
    }

    return mapped;
  }

  // Dev override status endpoint (dev-only): returns whether a server-side
  // temp_location.json override is active and the override coords. This
  // endpoint is intentionally lightweight and only used by the client to
  // decide whether to attempt Discover when the browser has no geolocation.
  app.get("/api/dev-location-status", async (req, res) => {
    try {
      const requestId = `dev-status-${Date.now()}`;
      const { lat, lng, overridden } = applyLocationOverride(
        undefined,
        undefined,
        requestId,
      );
      if (overridden) {
        return res.json({ enabled: true, lat, lng });
      }
      return res.json({ enabled: false });
    } catch (err) {
      return res.json({ enabled: false });
    }
  });

  // Image proxy for allowed remote hosts (prevents exposing API keys / avoids CORS issues)
  app.get("/api/proxy", async (req, res) => {
    try {
      const raw = req.query.url as string | undefined;
      if (!raw) return res.status(400).json({ error: "Missing url" });

      const decoded = decodeURIComponent(raw);
      let u: URL;
      try {
        u = new URL(decoded);
      } catch (err) {
        return res.status(400).json({ error: "Invalid url" });
      }

      const allowedHosts = [
        "maps.googleapis.com",
        "places.googleapis.com",
        "images.unsplash.com",
        "lh3.googleusercontent.com",
      ];
      if (!allowedHosts.includes(u.hostname)) {
        return res.status(400).json({ error: "Host not allowed" });
      }

      const fetched = await fetch(decoded);
      if (!fetched.ok)
        return res.status(502).json({ error: "Failed to fetch image" });
      const contentType = fetched.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await fetched.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader("content-type", contentType);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: "Proxy error" });
    }
  });

  // Proxy to serve Google Place Photos by photo_reference. This endpoint
  // accepts a `photoRef` value (the Places `photo_reference`) and fetches
  // the binary from Google only when requested. The server does NOT persist
  // image binaries; it only streams the response and sets HTTP cache headers
  // so browsers and CDNs can cache the image (reducing repeated requests
  // and Google API usage). This proxy also exists for compliance and to
  // avoid exposing the API key to clients.
  app.get("/api/photo", async (req, res) => {
    try {
      const photoRef = req.query.photoRef as string | undefined;
      const maxWidth = (req.query.maxWidth as string | undefined) || "1000";
      if (!photoRef) return res.status(400).json({ error: "Missing photoRef" });

      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey)
        return res.status(400).json({ error: "Missing server API key" });

      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${encodeURIComponent(
        maxWidth,
      )}&photoreference=${encodeURIComponent(
        photoRef,
      )}&key=${encodeURIComponent(apiKey)}`;

      const { attemptFetch } = await import("./googleRateLimiter");
      const fetched = await attemptFetch(photoUrl);
      if (!fetched) {
        // Rate limited — log and return an empty (204) response so clients
        // don't receive an error. Browsers/CDNs that previously cached the
        // image will still serve it; new requests will simply get no body.
        console.warn("Google API soft-limit reached while fetching photoRef");
        res.setHeader("Cache-Control", "public, max-age=60");
        return res.status(204).send();
      }
      if (!fetched.ok)
        return res.status(502).json({ error: "Failed to fetch photo" });

      const contentType = fetched.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await fetched.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Encourage browsers and CDNs to cache the image for 24 hours to reduce
      // repeated bandwidth and Google API calls.
      res.setHeader("content-type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: "Photo proxy error" });
    }
  });

  // Serve Google Places photo media server-side to avoid exposing API key
  app.get("/api/places-media", async (req, res) => {
    try {
      const name = req.query.name as string | undefined;
      const maxWidth =
        (req.query.maxWidthPx as string | undefined) ||
        (req.query.maxWidth as string | undefined) ||
        "1000";
      if (!name) return res.status(400).json({ error: "Missing name" });
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey)
        return res.status(400).json({ error: "Missing server API key" });

      const decoded = decodeURIComponent(name);
      const mediaUrl = `https://places.googleapis.com/v1/${decoded}/media?key=${apiKey}&maxWidthPx=${encodeURIComponent(
        maxWidth,
      )}`;

      const { attemptFetch } = await import("./googleRateLimiter");
      const fetched = await attemptFetch(mediaUrl);
      if (!fetched) {
        console.warn(
          "Google API soft-limit reached while fetching places media",
        );
        return res.status(204).send();
      }
      if (!fetched.ok)
        return res.status(502).json({ error: "Failed to fetch media" });
      const contentType = fetched.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await fetched.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader("content-type", contentType);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: "Places media proxy error" });
    }
  });

  // Customer feedback endpoint - sends an email to support
  const feedbackLimiter = (await import("express-rate-limit")).default({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Too many feedback submissions. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.post("/api/feedback", feedbackLimiter, async (req, res) => {
    try {
      const { name, email, message } = req.body || {};

      // Server-side validation: all fields required
      if (!name || String(name).trim() === "") {
        return res.status(400).json({ error: "Name is required" });
      }
      if (!email || String(email).trim() === "") {
        return res.status(400).json({ error: "Email is required" });
      }
      if (!message || String(message).trim() === "") {
        return res.status(400).json({ error: "Message is required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(email).trim())) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      const FEEDBACK_FROM_EMAIL =
        process.env.FEEDBACK_FROM_EMAIL || "Refote <no-reply@refote.com>";
      const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@refote.com";

      if (!RESEND_API_KEY) {
        console.error("[feedback] RESEND_API_KEY not configured");
        return res.status(500).json({
          error: "Unable to send feedback right now. Please try again later.",
        });
      }

      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);

      const emailBody = `
Name: ${String(name).trim()}
Email: ${String(email).trim()}

Message:
${String(message).trim()}
      `;

      const result = await resend.emails.send({
        from: FEEDBACK_FROM_EMAIL,
        to: SUPPORT_EMAIL,
        subject: "New Feedback from Refote",
        text: emailBody,
      });

      if (result.error) {
        console.error("[feedback] Resend error", result.error);
        return res.status(500).json({
          error: "Unable to send feedback right now. Please try again later.",
        });
      }

      console.info("[feedback] sent successfully", {
        email: String(email).trim(),
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[feedback] unexpected error", err);
      return res.status(500).json({
        error: "Unable to send feedback right now. Please try again later.",
      });
    }
  });

  return httpServer;
}
