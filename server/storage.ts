import {
  type User,
  type InsertUser,
  type Cafe,
  type InsertCafe,
  type Roaster,
  type InsertRoaster,
  type Drink,
  type InsertDrink,
  type CheckIn,
  type InsertCheckIn,
  type Like,
  type Follow,
  type CheckInWithDetails,
  type UserProfile,
  SUPPORTED_CITIES,
} from "@shared/schema";
import { randomUUID } from "crypto";

// Helper to detect whether a string looks like a Postgres UUID
function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(val || ""),
  );
}
type FriendRequestStatus = "pending" | "accepted" | "declined";
interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: Date;
}

interface Activity {
  id: string;
  type: string; // e.g., 'like' | 'checkin' | 'follow'
  userId: string;
  userSnapshot: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  targetId?: string | null; // e.g., checkIn id
  targetText?: string | null; // human readable target
  createdAt: string;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  getUserProfile(id: string): Promise<UserProfile | undefined>;
  updateUser(
    id: string,
    update: Partial<InsertUser>,
  ): Promise<User | undefined>;

  getCafes(): Promise<Cafe[]>;
  getCafesByCity(city: string): Promise<Cafe[]>;
  getCafe(id: string): Promise<Cafe | undefined>;
  createCafe(cafe: InsertCafe): Promise<Cafe>;
  updateCafe(
    id: string,
    update: Partial<InsertCafe> & {
      lastFetchedAt?: number;
      google_place_id?: string;
    },
  ): Promise<Cafe | undefined>;
  // Populate optional Place Details fields (NULL-only) using a Google
  // Place Details object fetched server-side. The implementation must only
  // write columns that are currently NULL and validate inputs.
  upsertPlaceDetailsByPlaceId(
    placeId: string,
    placeDetails: any,
    opts?: { lang?: "en" | "ar" },
  ): Promise<void>;

  getRoasters(): Promise<Roaster[]>;
  getRoaster(id: string): Promise<Roaster | undefined>;
  createRoaster(roaster: InsertRoaster): Promise<Roaster>;

  getDrinks(): Promise<Drink[]>;
  getDrink(id: string): Promise<Drink | undefined>;
  createDrink(drink: InsertDrink): Promise<Drink>;

  getCheckIns(): Promise<CheckInWithDetails[]>;
  getCheckInsByUser(userId: string): Promise<CheckInWithDetails[]>;
  getCheckIn(id: string): Promise<CheckIn | undefined>;
  createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn>;
  getCheckInWithDetails(id: string): Promise<CheckInWithDetails | undefined>;
  updateCheckIn(
    id: string,
    update: Partial<InsertCheckIn>,
  ): Promise<CheckIn | undefined>;
  deleteCheckIn(id: string): Promise<boolean>;

  toggleLike(userId: string, checkInId: string): Promise<boolean>;
  getLikesCount(checkInId: string): Promise<number>;
  isLiked(userId: string, checkInId: string): Promise<boolean>;

  toggleFollow(followerId: string, followingId: string): Promise<boolean>;
  getFollowersCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  // friend requests
  sendFriendRequest(
    senderId: string,
    receiverId: string,
  ): Promise<FriendRequest>;
  getIncomingFriendRequests(userId: string): Promise<FriendRequest[]>;
  acceptFriendRequest(
    requestId: string,
    receiverId: string,
  ): Promise<FriendRequest | undefined>;
  declineFriendRequest(requestId: string, receiverId: string): Promise<boolean>;
  getFriendRequestBetween(
    userA: string,
    userB: string,
  ): Promise<FriendRequest | undefined>;
  isFollowing(userA: string, userB: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  // cafes are persisted in Supabase (no in-memory storage)
  private roasters: Map<string, Roaster>;
  private drinks: Map<string, Drink>;
  // checkIns persisted in Supabase (no in-memory storage)
  private likes: Map<string, Like>;
  private follows: Map<string, Follow>;
  private friendRequests: Map<string, FriendRequest>;
  private activities: Map<string, Activity>;
  // no implicit current user id; routes must pass authenticated user ids.
  // no in-memory cafesByCity; queries are served from Supabase

  constructor() {
    this.users = new Map();
    // no local cafes map
    // No seeded users in memory. Profiles for authenticated users come only
    // from Supabase. Keep in-memory collections empty for authenticated flows.
    this.roasters = new Map();
    this.drinks = new Map();
    // no local checkIns map
    this.likes = new Map();
    this.follows = new Map();
    this.friendRequests = new Map();
    this.activities = new Map();
    // no local cafesByCity map

    // no implicit current user id — routes must provide an authenticated
    // Supabase user id when required. No seeded users are present to avoid
    // identity mismatches; demo data (roasters/drinks) may remain read-only.
  }

  private seedData() {
    // No seeded users — profiles for authenticated users must come only
    // from Supabase. Keep demo roasters/drinks seeded for read-only demo UI.

    // Cafe data comes exclusively from the Google Places API (live). Local JSON seed removed.

    const roasters: Roaster[] = [
      {
        id: "roaster-1",
        name: "Counter Culture Coffee",
        location: "Durham, NC",
        imageUrl:
          "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&h=400&fit=crop",
        description: "Sustainable sourcing and precision roasting",
        specialty: "Light Roast",
      },
      {
        id: "roaster-2",
        name: "Heart Roasters",
        location: "Portland, OR",
        imageUrl:
          "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&h=400&fit=crop",
        description: "Nordic-style light roasts",
        specialty: "Nordic Roast",
      },
    ];
    roasters.forEach((r) => this.roasters.set(r.id, r));

    const drinks: Drink[] = [
      {
        id: "drink-1",
        name: "Espresso",
        type: "coffee",
        style: "espresso",
        description: "Classic Italian shot",
      },
      {
        id: "drink-2",
        name: "Cappuccino",
        type: "coffee",
        style: "espresso",
        description: "Espresso with steamed milk foam",
      },
      {
        id: "drink-3",
        name: "Pour Over",
        type: "coffee",
        style: "filter",
        description: "Hand-poured filter coffee",
      },
      {
        id: "drink-4",
        name: "Cold Brew",
        type: "coffee",
        style: "cold",
        description: "Slow-steeped cold coffee",
      },
      {
        id: "drink-5",
        name: "Flat White",
        type: "coffee",
        style: "espresso",
        description: "Espresso with microfoam",
      },
      {
        id: "drink-6",
        name: "Cortado",
        type: "coffee",
        style: "espresso",
        description: "Espresso cut with warm milk",
      },
      {
        id: "drink-7",
        name: "Latte",
        type: "coffee",
        style: "espresso",
        description: "Espresso with steamed milk",
      },
      {
        id: "drink-8",
        name: "Matcha Latte",
        type: "tea",
        style: "matcha",
        description: "Japanese green tea with milk",
      },
      {
        id: "drink-9",
        name: "Earl Grey",
        type: "tea",
        style: "black",
        description: "Black tea with bergamot",
      },
      {
        id: "drink-10",
        name: "Oolong",
        type: "tea",
        style: "oolong",
        description: "Traditional Chinese tea",
      },
      {
        id: "drink-11",
        name: "Chai Latte",
        type: "tea",
        style: "spiced",
        description: "Spiced tea with steamed milk",
      },
      {
        id: "drink-12",
        name: "Hojicha",
        type: "tea",
        style: "roasted",
        description: "Roasted Japanese green tea",
      },
    ];
    drinks.forEach((d) => this.drinks.set(d.id, d));

    const likes: Like[] = [
      { id: "like-1", userId: "user-2", checkInId: "checkin-1" },
      { id: "like-2", userId: "user-3", checkInId: "checkin-1" },
      { id: "like-3", userId: "user-1", checkInId: "checkin-2" },
    ];
    likes.forEach((l) => this.likes.set(l.id, l));

    // start with empty activity feed
    const activities: Activity[] = [];
    activities.forEach((a) => this.activities.set(a.id, a));

    const follows: Follow[] = [
      // start with no follows for `coffeeaddict` (user-1)
      // keep mutual follow between coffeesocial (user-8) and Muhannad (user-9)
      { id: "follow-8", followerId: "user-8", followingId: "user-9" },
      { id: "follow-9", followerId: "user-9", followingId: "user-8" },
    ];
    follows.forEach((f) => this.follows.set(f.id, f));
    // no initial friend requests
    const friendRequests: FriendRequest[] = [];
    friendRequests.forEach((r) => this.friendRequests.set(r.id, r));
  }

  // Cafe data is fetched live from Google Places; no local loader is provided.

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      displayName: insertUser.displayName,
      avatarUrl: insertUser.avatarUrl ?? null,
      bio: insertUser.bio ?? null,
      coverUrl: insertUser.coverUrl ?? null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(
    id: string,
    update: Partial<InsertUser>,
  ): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;

    const updated: User = {
      ...existing,
      username: update.username ?? existing.username,
      displayName: update.displayName ?? existing.displayName,
      avatarUrl: update.avatarUrl ?? existing.avatarUrl,
      bio: update.bio ?? existing.bio,
      coverUrl: update.coverUrl ?? existing.coverUrl,
    };

    this.users.set(id, updated);
    return updated;
  }

  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    const userCheckIns = await this.getCheckInsByUser(id).catch(() => []);
    // count unique cafes visited (use cafeId when available)
    const uniqueCafes = new Set(
      userCheckIns.map((c) => c.cafeId).filter((id): id is string => !!id),
    );
    const followersCount = await this.getFollowersCount(id);
    const followingCount = await this.getFollowingCount(id);

    return {
      ...user,
      checkInsCount: userCheckIns.length,
      followersCount,
      followingCount,
      // reuse the `uniqueDrinksCount` field for the profile UI but populate with
      // the number of unique cafés visited.
      uniqueDrinksCount: uniqueCafes.size,
    };
  }

  async addActivity(activity: Omit<Activity, "id">): Promise<Activity> {
    const id = randomUUID();
    const a: Activity = { id, ...activity };
    this.activities.set(id, a);
    return a;
  }

  async getActivity(): Promise<Activity[]> {
    return Array.from(this.activities.values()).sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  }

  async removeActivityByPredicate(predicate: (a: Activity) => boolean) {
    for (const [id, a] of Array.from(this.activities.entries())) {
      if (predicate(a)) this.activities.delete(id);
    }
  }

  async getCafes(): Promise<Cafe[]> {
    // Persisted in Supabase; fetch coffee_places and map to app `Cafe` shape.
    try {
      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from("coffee_places")
        .select(
          "id, google_place_id, name_en, name_ar, lat, lng, photo_reference, created_at",
        );
      if (error) throw error;
      return ((data || []) as any[]).map(
        (r) =>
          ({
            id: r.id,
            placeId: r.google_place_id ?? null,
            nameAr: r.name_ar ?? r.name_en ?? null,
            nameEn: r.name_en ?? r.name_ar ?? null,
            addressAr: "",
            addressEn: "",
            cityAr: "",
            cityEn: "",
            latitude: r.lat ?? null,
            longitude: r.lng ?? null,
            rating: null,
            reviews: null,
            imageUrl: null,
            description: null,
            specialty: null,
            photoReference: r.photo_reference ?? null,
          } as Cafe),
      );
    } catch (err) {
      return [];
    }
  }

  async getCafesByCity(city: string): Promise<Cafe[]> {
    const all = await this.getCafes();
    return all.filter(
      (c) => (c.cityEn || "").toLowerCase() === city.toLowerCase(),
    );
  }

  async getCafe(id: string): Promise<Cafe | undefined> {
    try {
      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient();
      // Try to find by google_place_id first, then by id (UUID)
      let row: any = null;
      try {
        const { data: byG, error: byGErr } = await supabase
          .from("coffee_places")
          .select(
            "id, google_place_id, name_en, name_ar, lat, lng, photo_reference, created_at",
          )
          .eq("google_place_id", id)
          .limit(1);
        if (!byGErr) row = Array.isArray(byG) ? byG[0] : byG;
      } catch (_) {
        // ignore
      }

      if (!row && isUuid(id)) {
        try {
          const { data: byId, error: byIdErr } = await supabase
            .from("coffee_places")
            .select(
              "id, google_place_id, name_en, name_ar, lat, lng, photo_reference, created_at",
            )
            .eq("id", id)
            .limit(1);
          if (!byIdErr) row = Array.isArray(byId) ? byId[0] : byId;
        } catch (_) {
          // ignore
        }
      }
      if (row) {
        return {
          id: row.id,
          placeId: row.google_place_id ?? null,
          nameAr: row.name_ar ?? row.name_en ?? null,
          nameEn: row.name_en ?? row.name_ar ?? null,
          addressAr: "",
          addressEn: "",
          cityAr: "",
          cityEn: "",
          latitude: row.lat ?? null,
          longitude: row.lng ?? null,
          rating: null,
          reviews: null,
          imageUrl: null,
          description: null,
          specialty: null,
        } as Cafe;
      }
      return undefined;
    } catch (err) {
      return undefined;
    }
  }

  async createCafe(insertCafe: InsertCafe): Promise<Cafe> {
    // Persist a minimal coffee_place row in Supabase and return a Cafe-shaped object.
    try {
      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient();
      const google_place_id =
        (insertCafe as any).placeId ??
        (insertCafe as any).google_place_id ??
        null;
      const name_en =
        (insertCafe as any).nameEn ?? (insertCafe as any).name ?? "";
      const name_ar = (insertCafe as any).nameAr ?? null;
      const lat =
        (insertCafe as any).lat ?? (insertCafe as any).latitude ?? null;
      const lng =
        (insertCafe as any).lng ?? (insertCafe as any).longitude ?? null;
      const photo_reference =
        (insertCafe as any).photo_reference ??
        (insertCafe as any).photoReference ??
        null;
      const last_fetched_at =
        (insertCafe as any).lastFetchedAt ??
        (insertCafe as any).last_fetched_at ??
        null;
      const last_fetched_at_ts = last_fetched_at
        ? new Date().toISOString()
        : null;

      // upsert by google_place_id
      const { data, error } = await supabase
        .from("coffee_places")
        .upsert(
          { google_place_id, name_en, name_ar, lat, lng, photo_reference },
          { onConflict: "google_place_id" },
        )
        .select(
          "id, google_place_id, name_en, name_ar, lat, lng, photo_reference, last_fetched_at, last_fetched_at_ts",
        )
        .limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const cafe: any = {
        id: row?.id ?? randomUUID(),
        placeId: row?.google_place_id ?? google_place_id ?? null,
        nameAr: row?.name_ar ?? name_ar ?? row?.name_en ?? null,
        nameEn: row?.name_en ?? name_en ?? row?.name_ar ?? null,
        addressAr: "",
        addressEn: "",
        cityAr: "",
        cityEn: "",
        latitude: row?.lat ?? lat ?? null,
        longitude: row?.lng ?? lng ?? null,
        photoReference: row?.photo_reference ?? photo_reference ?? null,
        rating: null,
        reviews: null,
        imageUrl: null,
        description: null,
        specialty: null,
      };
      // keep a lightweight in-memory copy for quick lookups
      return cafe as Cafe;
    } catch (err) {
      console.error("[storage] createCafe supabase error", err);
      // fallback to in-memory
      const id = randomUUID();
      const cafeAny: any = {
        id,
        placeId: (insertCafe as any).placeId ?? null,
        nameAr: (insertCafe as any).nameAr ?? null,
        nameEn: (insertCafe as any).nameEn ?? null,
        addressAr: (insertCafe as any).addressAr ?? null,
        addressEn: (insertCafe as any).addressEn ?? null,
        cityAr: (insertCafe as any).cityAr ?? null,
        cityEn: (insertCafe as any).cityEn ?? null,
        latitude: (insertCafe as any).latitude ?? null,
        longitude: (insertCafe as any).longitude ?? null,
        rating: (insertCafe as any).rating ?? null,
        reviews: (insertCafe as any).reviews ?? null,
        imageUrl: (insertCafe as any).imageUrl ?? null,
        description: (insertCafe as any).description ?? null,
        specialty: (insertCafe as any).specialty ?? null,
        google_place_id:
          (insertCafe as any).google_place_id ??
          (insertCafe as any).placeId ??
          null,
        lastFetchedAt: (insertCafe as any).lastFetchedAt ?? null,
      };
      return cafeAny as Cafe;
    }
  }

  async updateCafe(
    id: string,
    update: Partial<InsertCafe> & {
      lastFetchedAt?: number;
      google_place_id?: string;
    },
  ): Promise<Cafe | undefined> {
    const existing = await this.getCafe(id);
    if (!existing) return undefined;

    const google_place_id =
      (update as any).google_place_id ??
      (update as any).placeId ??
      existing.placeId;
    const name =
      (update as any).nameEn ??
      (update as any).nameAr ??
      existing.nameEn ??
      existing.nameAr ??
      null;
    const lat =
      (update as any).lat ??
      (update as any).latitude ??
      existing.latitude ??
      null;
    const lng =
      (update as any).lng ??
      (update as any).longitude ??
      existing.longitude ??
      null;
    const photo_reference_in =
      (update as any).photo_reference ??
      (update as any).photoReference ??
      undefined;

    try {
      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient();
      const match = existing.placeId || id;
      const name_en = (update as any).nameEn ?? existing.nameEn ?? null;
      const name_ar = (update as any).nameAr ?? existing.nameAr ?? null;

      const updateObj: any = { google_place_id, name_en, name_ar, lat, lng };
      if (photo_reference_in !== undefined)
        updateObj.photo_reference = photo_reference_in;

      try {
        console.log("[storage] updating coffee_places", { match, updateObj });
      } catch (_) {}

      // Match either by numeric UUID `id` or by `google_place_id` string
      try {
        let q: any = supabase.from("coffee_places").update(updateObj);
        if (isUuid(match)) q = q.eq("id", match);
        else q = q.eq("google_place_id", match);
        const { data: upData, error } = await q.select().limit(1);

        if (error) {
          console.error("[storage] supabase update error", {
            match,
            error,
            upData,
          });
        } else {
          try {
            console.log("[storage] supabase update success", {
              match,
              rows: upData,
            });
          } catch (_) {}
        }
      } catch (err) {
        console.error("[storage] supabase update exception", err);
      }
    } catch (err) {
      console.error("[storage] updateCafe exception", err);
    }

    const updated: any = {
      ...existing,
      placeId: (update as any).placeId ?? existing.placeId,
      nameAr: (update as any).nameAr ?? existing.nameAr,
      nameEn: (update as any).nameEn ?? existing.nameEn,
      addressAr: (update as any).addressAr ?? existing.addressAr,
      addressEn: (update as any).addressEn ?? existing.addressEn,
      cityAr: (update as any).cityAr ?? existing.cityAr,
      cityEn: (update as any).cityEn ?? existing.cityEn,
      latitude:
        (update as any).lat ?? (update as any).latitude ?? existing.latitude,
      longitude:
        (update as any).lng ?? (update as any).longitude ?? existing.longitude,
      rating: (update as any).rating ?? existing.rating,
      reviews: (update as any).reviews ?? existing.reviews,
      imageUrl: (update as any).imageUrl ?? existing.imageUrl,
      description: (update as any).description ?? existing.description,
      specialty: (update as any).specialty ?? existing.specialty,
      google_place_id:
        (update as any).google_place_id ??
        (existing as any).google_place_id ??
        existing.placeId,
      lastFetchedAt:
        typeof update.lastFetchedAt === "number"
          ? update.lastFetchedAt
          : (existing as any).lastFetchedAt ?? null,
    };

    return updated as Cafe;
  }

  // Populate optional Place Details fields (NULL-only) using the server-side
  // Place Details object fetched in the cafe detail flow. This method will
  // only write columns that are currently NULL and will validate values.
  async upsertPlaceDetailsByPlaceId(
    placeId: string,
    placeDetails: any,
    opts?: { lang?: "en" | "ar" },
  ): Promise<void> {
    try {
      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient();

      // Discover which optional columns exist on this deployment.
      const { data: colsData } = await supabase
        .from("information_schema.columns")
        .select("column_name")
        .eq("table_name", "coffee_places")
        .eq("table_schema", "public");
      const availCols = new Set<string>(
        (colsData || []).map((c: any) => c.column_name),
      );

      // Read authoritative DB row for this place_id (if present)
      const { data: dbRows } = await supabase
        .from("coffee_places")
        .select(
          "id, google_place_id, address_en, address_ar, city_en, city_ar, phone_number, website, opening_hours, types, price_level, lat, lng, photo_reference",
        )
        .eq("google_place_id", placeId)
        .limit(1);
      const dbRow = Array.isArray(dbRows) ? dbRows[0] : dbRows;
      try {
        const dbPreview = (() => {
          try {
            return JSON.stringify(dbRow || null);
          } catch (_) {
            return String(dbRow);
          }
        })();
        console.log(
          `[storage] upsertPlaceDetailsByPlaceId placeId=${placeId} dbRow=${dbPreview}`,
        );
      } catch (_) {}

      // Helper: extract city from address_components
      const extractCity = (components: any[] | undefined) => {
        if (!Array.isArray(components)) return null;
        const byType = (t: string) =>
          components.find(
            (c: any) => Array.isArray(c.types) && c.types.includes(t),
          );
        const pick =
          byType("locality") ||
          byType("administrative_area_level_2") ||
          byType("administrative_area_level_1");
        return pick ? pick.long_name ?? pick.short_name ?? null : null;
      };

      // Build the candidate fields to write only when DB value is currently NULL
      const toWrite: Record<string, any> = {};

      // address_en
      if (
        availCols.has("address_en") &&
        !(dbRow as any)?.address_en &&
        placeDetails?.formatted_address
      ) {
        toWrite.address_en = placeDetails.formatted_address;
      }

      // city_en (extract from address_components)
      if (availCols.has("city_en") && !(dbRow as any)?.city_en) {
        const city = extractCity(placeDetails?.address_components);
        if (city) toWrite.city_en = city;
      }

      // phone_number
      if (
        availCols.has("phone_number") &&
        !(dbRow as any)?.phone_number &&
        placeDetails?.formatted_phone_number
      ) {
        toWrite.phone_number = placeDetails.formatted_phone_number;
      }

      // website
      if (
        availCols.has("website") &&
        !(dbRow as any)?.website &&
        placeDetails?.website
      ) {
        toWrite.website = placeDetails.website;
      }

      // opening_hours (store as JSON string to match existing code paths)
      if (
        availCols.has("opening_hours") &&
        !(dbRow as any)?.opening_hours &&
        placeDetails?.opening_hours
      ) {
        try {
          toWrite.opening_hours = JSON.stringify(placeDetails.opening_hours);
        } catch (_) {
          // fallback: store as stringified safe form
          toWrite.opening_hours = String(placeDetails.opening_hours);
        }
      }

      // types (array -> JSON string)
      if (
        availCols.has("types") &&
        !(dbRow as any)?.types &&
        Array.isArray(placeDetails?.types)
      ) {
        try {
          toWrite.types = JSON.stringify(placeDetails.types);
        } catch (_) {
          toWrite.types = JSON.stringify([]);
        }
      }

      // price_level (validate 0..4 integer)
      if (availCols.has("price_level") && (dbRow as any)?.price_level == null) {
        const pl = placeDetails?.price_level;
        if (
          typeof pl === "number" &&
          Number.isInteger(pl) &&
          pl >= 0 &&
          pl <= 4
        ) {
          toWrite.price_level = pl;
        }
      }

      // lat/lng and photo_reference: only set if row exists and values are null
      if (
        availCols.has("lat") &&
        (dbRow == null || dbRow.lat == null) &&
        placeDetails?.geometry?.location?.lat
      )
        toWrite.lat = placeDetails.geometry.location.lat;
      if (
        availCols.has("lng") &&
        (dbRow == null || dbRow.lng == null) &&
        placeDetails?.geometry?.location?.lng
      )
        toWrite.lng = placeDetails.geometry.location.lng;
      if (
        availCols.has("photo_reference") &&
        !(dbRow as any)?.photo_reference &&
        Array.isArray(placeDetails?.photos) &&
        placeDetails.photos[0]?.photo_reference
      )
        toWrite.photo_reference = placeDetails.photos[0].photo_reference;

      // Always update last_fetched_at fields so callers can determine freshness
      if (availCols.has("last_fetched_at"))
        toWrite.last_fetched_at = Date.now();
      if (availCols.has("last_fetched_at_ts"))
        toWrite.last_fetched_at_ts = new Date().toISOString();

      // If no DB row exists, INSERT a new row with google_place_id and candidate fields
      if (!dbRow) {
        const insertObj: any = { google_place_id: placeId };
        // include only available columns
        for (const k of Object.keys(toWrite)) {
          if (availCols.has(k)) insertObj[k] = toWrite[k];
        }
        // include localized name when present (respect lang)
        if (opts?.lang === "ar") insertObj.name_ar = placeDetails?.name ?? null;
        else insertObj.name_en = placeDetails?.name ?? null;
        // include coords if available
        if (placeDetails?.geometry?.location?.lat)
          insertObj.lat = placeDetails.geometry.location.lat;
        if (placeDetails?.geometry?.location?.lng)
          insertObj.lng = placeDetails.geometry.location.lng;

        try {
          try {
            console.log(
              `[storage] upsertPlaceDetails insertObj keys=${Object.keys(
                insertObj,
              ).join(",")}`,
            );
          } catch (_) {}
          await supabase.from("coffee_places").insert(insertObj).select();
        } catch (err) {
          console.error("[storage] failed to insert place details", err);
        }

        return;
      }

      // If there are no optional fields to write beyond timestamps, write timestamps only
      const keysToWrite = Object.keys(toWrite).filter(
        (k) => !["last_fetched_at", "last_fetched_at_ts"].includes(k),
      );

      // Build update query only for columns that we intend to write. Add .is(col, null)
      // guards so we don't overwrite concurrently-updated fields.
      if (Object.keys(toWrite).length > 0) {
        try {
          console.log(
            `[storage] upsertPlaceDetails placeId=${placeId} toWriteKeys=${Object.keys(
              toWrite,
            ).join(",")}`,
          );
          try {
            const preview = JSON.stringify(toWrite);
            console.log(
              `[storage] upsertPlaceDetails placeId=${placeId} toWrite=${preview}`,
            );
          } catch (_) {}
        } catch (_) {}
        let q: any = supabase
          .from("coffee_places")
          .update(toWrite)
          .eq("google_place_id", placeId);
        // Add null-check guards for optional columns (excluding always-updated timestamps)
        for (const col of Object.keys(toWrite)) {
          if (["last_fetched_at", "last_fetched_at_ts"].includes(col)) continue;
          // Only add .is guard when the column existed in DB
          if (availCols.has(col)) q = q.is(col, null);
        }

        try {
          const { error } = await q.select().limit(1);
          if (error)
            console.error("[storage] upsertPlaceDetails update error", {
              placeId,
              error,
            });
        } catch (err) {
          console.error("[storage] upsertPlaceDetails update exception", err);
        }
      }
    } catch (err) {
      console.error("[storage] upsertPlaceDetailsByPlaceId exception", err);
    }
  }

  async getRoasters(): Promise<Roaster[]> {
    return Array.from(this.roasters.values());
  }

  async getRoaster(id: string): Promise<Roaster | undefined> {
    return this.roasters.get(id);
  }

  async createRoaster(insertRoaster: InsertRoaster): Promise<Roaster> {
    const id = randomUUID();
    const roaster: Roaster = {
      id,
      name: insertRoaster.name,
      location: insertRoaster.location,
      imageUrl: insertRoaster.imageUrl ?? null,
      description: insertRoaster.description ?? null,
      specialty: insertRoaster.specialty ?? null,
    };
    this.roasters.set(id, roaster);
    return roaster;
  }

  async getDrinks(): Promise<Drink[]> {
    return Array.from(this.drinks.values());
  }

  async getDrink(id: string): Promise<Drink | undefined> {
    return this.drinks.get(id);
  }

  async createDrink(insertDrink: InsertDrink): Promise<Drink> {
    const id = randomUUID();
    const drink: Drink = {
      id,
      name: insertDrink.name,
      type: insertDrink.type,
      style: insertDrink.style ?? null,
      description: insertDrink.description ?? null,
    };
    this.drinks.set(id, drink);
    return drink;
  }

  async getCheckIns(): Promise<CheckInWithDetails[]> {
    // Deprecated: global feed is not supported by persisted storage.
    // Prefer calling `getCheckInsByUser(userId, token)` which enforces RLS.
    return [];
  }

  async getCheckInsByUser(
    userId: string,
    supabaseToken?: string,
  ): Promise<CheckInWithDetails[]> {
    try {
      // Attempt to fetch from Supabase using server-side anon/service key
      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient(supabaseToken);
      const { data, error } = await supabase
        .from("check_ins")
        .select("id, user_id, place_id, drink_name, rating, notes, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows: any[] = data || [];
      const mapped = await Promise.all(
        rows.map(async (r) => {
          const checkIn: any = {
            id: r.id,
            userId: r.user_id,
            drinkId: r.drink_name || "",
            cafeId: r.place_id ?? null,
            roasterId: null,
            rating: r.rating ?? 0,
            notes: r.notes ?? null,
            photoUrl: null,
            tastingNotes: null,
            createdAt: r.created_at ? new Date(r.created_at) : new Date(),
          };
          return this.enrichCheckIn(checkIn as CheckIn);
        }),
      );
      return mapped;
    } catch (err) {
      return [];
    }
  }

  private async enrichCheckIn(checkIn: CheckIn): Promise<CheckInWithDetails> {
    const user = await this.getUser(checkIn.userId);
    const drink = await this.getDrink(checkIn.drinkId);
    const cafe = checkIn.cafeId
      ? await this.getCafe(checkIn.cafeId)
      : undefined;
    const roaster = checkIn.roasterId
      ? await this.getRoaster(checkIn.roasterId)
      : undefined;
    const likesCount = await this.getLikesCount(checkIn.id);
    // When there's no authenticated viewer, do not assume a default user.
    // `isLiked` is viewer-specific; routes that require viewer context
    // should compute it using `isLiked(viewerId, checkInId)`.
    const isLiked = false;

    return {
      ...checkIn,
      user: user!,
      drink: drink!,
      cafe,
      roaster,
      likesCount,
      isLiked,
    };
  }
  async getCheckIn(id: string): Promise<CheckIn | undefined> {
    try {
      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from("check_ins")
        .select(
          "id, user_id, place_id, drink_name, rating, notes, created_at, updated_at",
        )
        .eq("id", id)
        .limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return undefined;
      return {
        id: row.id,
        userId: row.user_id,
        drinkId: row.drink_name || "",
        cafeId: row.place_id ?? null,
        roasterId: null,
        rating: row.rating ?? 0,
        notes: row.notes ?? null,
        photoUrl: null,
        tastingNotes: null,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
      } as CheckIn;
    } catch (err) {
      return undefined;
    }
  }

  async getCheckInWithDetails(
    id: string,
  ): Promise<CheckInWithDetails | undefined> {
    const c = await this.getCheckIn(id);
    if (!c) return undefined;
    return this.enrichCheckIn(c);
  }

  async createCheckIn(insertCheckIn: InsertCheckIn): Promise<CheckIn> {
    // Persist check-in to Supabase `check_ins`. This expects that the route
    // passed a valid authenticated Supabase JWT via the request and that the
    // caller has been authorized. The route should call createCheckIn after
    // constructing `insertCheckIn` with `userId` set to the supabase user id.
    try {
      const supabaseToken = (insertCheckIn as any)._supabaseToken as
        | string
        | undefined;
      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient(supabaseToken);

      // Map application check-in to Supabase schema: use place_id (coffee_places.id)
      const payload: any = {
        user_id: insertCheckIn.userId,
        place_id: insertCheckIn.cafeId,
        drink_name: insertCheckIn.drinkId,
        rating: insertCheckIn.rating,
        notes: insertCheckIn.notes ?? null,
      };

      const { data, error } = await supabase
        .from("check_ins")
        .insert(payload)
        .select("id, user_id, place_id, drink_name, rating, notes, created_at");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const id = row?.id ?? randomUUID();
      const checkIn: CheckIn = {
        id,
        userId: row?.user_id ?? insertCheckIn.userId,
        drinkId: row?.drink_name ?? insertCheckIn.drinkId,
        cafeId: row?.place_id ?? insertCheckIn.cafeId ?? null,
        roasterId: null,
        rating: row?.rating ?? insertCheckIn.rating,
        notes: row?.notes ?? insertCheckIn.notes ?? null,
        photoUrl: insertCheckIn.photoUrl ?? null,
        tastingNotes: insertCheckIn.tastingNotes ?? null,
        createdAt: row?.created_at ? new Date(row.created_at) : new Date(),
      };
      // push activity for new check-in (non-blocking)
      (async () => {
        try {
          const user = await this.getUser(insertCheckIn.userId);
          const drink = await this.getDrink(insertCheckIn.drinkId);
          const cafe = insertCheckIn.cafeId
            ? await this.getCafe(insertCheckIn.cafeId)
            : undefined;
          const cafeName = cafe ? cafe.nameEn || cafe.nameAr || null : null;
          const targetText = drink
            ? cafeName
              ? `${drink.name} at ${cafeName}`
              : drink.name
            : cafeName;

          if (user) {
            await this.addActivity({
              type: "checkin",
              userId: user.id,
              userSnapshot: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl ?? null,
              },
              targetId: id,
              targetText,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.warn("Failed to record activity for check-in", err);
        }
      })();

      return checkIn;
    } catch (err) {
      throw err;
    }
  }

  async updateCheckIn(
    id: string,
    update: Partial<InsertCheckIn>,
  ): Promise<CheckIn | undefined> {
    const existing = await this.getCheckIn(id);
    if (!existing) return undefined;
    try {
      const supabaseToken = (update as any)._supabaseToken as
        | string
        | undefined;
      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient(supabaseToken);
      const payload: any = {
        drink_name: update.drinkId ?? existing.drinkId,
        place_id: update.cafeId ?? existing.cafeId,
        rating: update.rating ?? existing.rating,
        notes: update.notes ?? existing.notes,
      };
      const { data, error } = await supabase
        .from("check_ins")
        .update(payload)
        .eq("id", id)
        .select("id, user_id, place_id, drink_name, rating, notes, created_at");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const updated: CheckIn = {
        id,
        userId: row?.user_id ?? existing.userId,
        drinkId: row?.drink_name ?? update.drinkId ?? existing.drinkId,
        cafeId: row?.place_id ?? update.cafeId ?? existing.cafeId,
        roasterId: null,
        rating: row?.rating ?? update.rating ?? existing.rating,
        notes: row?.notes ?? update.notes ?? existing.notes,
        photoUrl: update.photoUrl ?? existing.photoUrl ?? null,
        tastingNotes: update.tastingNotes ?? existing.tastingNotes ?? null,
        createdAt: row?.created_at
          ? new Date(row.created_at)
          : existing.createdAt,
      };
      return updated;
    } catch (err) {
      throw err;
    }
  }

  async toggleLike(userId: string, checkInId: string): Promise<boolean> {
    const existingLike = Array.from(this.likes.values()).find(
      (l) => l.userId === userId && l.checkInId === checkInId,
    );

    if (existingLike) {
      this.likes.delete(existingLike.id);
      // remove corresponding like activity
      await this.removeActivityByPredicate(
        (a) =>
          a.type === "like" && a.userId === userId && a.targetId === checkInId,
      );
      return false;
    } else {
      const id = randomUUID();
      const like: Like = { id, userId, checkInId };
      this.likes.set(id, like);

      // add like activity (non-blocking)
      (async () => {
        try {
          const user = await this.getUser(userId);
          const checkIn = await this.getCheckInWithDetails(checkInId);
          let targetText = null as string | null;
          if (checkIn) {
            const drinkName = checkIn.drink?.name ?? null;
            const cafeName = checkIn.cafe
              ? checkIn.cafe.nameEn || checkIn.cafe.nameAr || null
              : null;
            targetText = drinkName
              ? cafeName
                ? `${drinkName} at ${cafeName}`
                : drinkName
              : cafeName;
          }
          if (user) {
            await this.addActivity({
              type: "like",
              userId: user.id,
              userSnapshot: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl ?? null,
              },
              targetId: checkInId,
              targetText,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.warn("Failed to record like activity", err);
        }
      })();

      return true;
    }
  }

  async deleteCheckIn(id: string): Promise<boolean> {
    try {
      const { createServerSupabaseClient } = await import("./supabaseClient");
      const supabase = createServerSupabaseClient();
      const { error } = await supabase.from("check_ins").delete().eq("id", id);
      if (error) throw error;
    } catch (err) {
      // ignore and fallback to in-memory
    }
    const existed = true;
    for (const [likeId, like] of Array.from(this.likes.entries())) {
      if (like.checkInId === id) this.likes.delete(likeId);
    }
    return existed;
  }

  async getLikesCount(checkInId: string): Promise<number> {
    return Array.from(this.likes.values()).filter(
      (l) => l.checkInId === checkInId,
    ).length;
  }

  async isLiked(userId: string, checkInId: string): Promise<boolean> {
    return Array.from(this.likes.values()).some(
      (l) => l.userId === userId && l.checkInId === checkInId,
    );
  }

  async toggleFollow(
    followerId: string,
    followingId: string,
  ): Promise<boolean> {
    const existingFollow = Array.from(this.follows.values()).find(
      (f) => f.followerId === followerId && f.followingId === followingId,
    );

    if (existingFollow) {
      this.follows.delete(existingFollow.id);
      return false;
    } else {
      const id = randomUUID();
      const follow: Follow = { id, followerId, followingId };
      this.follows.set(id, follow);
      return true;
    }
  }

  async sendFriendRequest(
    senderId: string,
    receiverId: string,
  ): Promise<FriendRequest> {
    // avoid duplicate pending requests
    const existing = Array.from(this.friendRequests.values()).find(
      (r) =>
        r.senderId === senderId &&
        r.receiverId === receiverId &&
        r.status === "pending",
    );
    if (existing) return existing;

    const id = randomUUID();
    const req: FriendRequest = {
      id,
      senderId,
      receiverId,
      status: "pending",
      createdAt: new Date(),
    };
    this.friendRequests.set(id, req);
    return req;
  }

  async getIncomingFriendRequests(userId: string): Promise<FriendRequest[]> {
    return Array.from(this.friendRequests.values()).filter(
      (r) => r.receiverId === userId && r.status === "pending",
    );
  }

  async acceptFriendRequest(
    requestId: string,
    receiverId: string,
  ): Promise<FriendRequest | undefined> {
    const req = this.friendRequests.get(requestId);
    if (!req) return undefined;
    if (req.receiverId !== receiverId) return undefined;
    req.status = "accepted";
    this.friendRequests.set(requestId, req);
    // optionally create mutual follow entries
    await this.toggleFollow(req.senderId, req.receiverId);
    await this.toggleFollow(req.receiverId, req.senderId);
    return req;
  }

  async declineFriendRequest(
    requestId: string,
    receiverId: string,
  ): Promise<boolean> {
    const req = this.friendRequests.get(requestId);
    if (!req) return false;
    if (req.receiverId !== receiverId) return false;
    req.status = "declined";
    this.friendRequests.set(requestId, req);
    return true;
  }

  async getFriendRequestBetween(
    userA: string,
    userB: string,
  ): Promise<FriendRequest | undefined> {
    return Array.from(this.friendRequests.values()).find(
      (r) =>
        (r.senderId === userA && r.receiverId === userB) ||
        (r.senderId === userB && r.receiverId === userA),
    );
  }

  async isFollowing(userA: string, userB: string): Promise<boolean> {
    return Array.from(this.follows.values()).some(
      (f) => f.followerId === userA && f.followingId === userB,
    );
  }

  async getFollowersCount(userId: string): Promise<number> {
    return Array.from(this.follows.values()).filter(
      (f) => f.followingId === userId,
    ).length;
  }

  async getFollowingCount(userId: string): Promise<number> {
    return Array.from(this.follows.values()).filter(
      (f) => f.followerId === userId,
    ).length;
  }
}

export const storage = new MemStorage();
