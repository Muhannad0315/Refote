import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  real,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  coverUrl: text("cover_url"),
});

export const cafes = pgTable("cafes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  placeId: text("place_id"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  addressAr: text("address_ar").notNull(),
  addressEn: text("address_en").notNull(),
  cityAr: text("city_ar").notNull(),
  cityEn: text("city_en").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  rating: real("rating"),
  reviews: integer("reviews"),
  imageUrl: text("image_url"),
  description: text("description"),
  specialty: text("specialty"),
});

export const roasters = pgTable("roasters", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location").notNull(),
  imageUrl: text("image_url"),
  description: text("description"),
  specialty: text("specialty"),
});

export const drinks = pgTable("drinks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  style: text("style"),
  description: text("description"),
});

export const checkIns = pgTable("check_ins", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  drinkId: varchar("drink_id").notNull(),
  cafeId: varchar("cafe_id"),
  roasterId: varchar("roaster_id"),
  rating: real("rating").notNull(),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  tastingNotes: text("tasting_notes").array(),
  temperature: text("temperature"), // "Hot" | "Cold" | null
  createdAt: timestamp("created_at").defaultNow(),
});

export const likes = pgTable("likes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  checkInId: varchar("check_in_id").notNull(),
});

export const follows = pgTable("follows", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull(),
  followingId: varchar("following_id").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertCafeSchema = createInsertSchema(cafes).omit({ id: true });
export const insertRoasterSchema = createInsertSchema(roasters).omit({
  id: true,
});
export const insertDrinkSchema = createInsertSchema(drinks).omit({ id: true });
export const insertCheckInSchema = createInsertSchema(checkIns).omit({
  id: true,
  createdAt: true,
});
export const insertLikeSchema = createInsertSchema(likes).omit({ id: true });
export const insertFollowSchema = createInsertSchema(follows).omit({
  id: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCafe = z.infer<typeof insertCafeSchema>;
export type Cafe = typeof cafes.$inferSelect;

export type InsertRoaster = z.infer<typeof insertRoasterSchema>;
export type Roaster = typeof roasters.$inferSelect;

export type InsertDrink = z.infer<typeof insertDrinkSchema>;
export type Drink = typeof drinks.$inferSelect;

export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type CheckIn = typeof checkIns.$inferSelect;

export type InsertLike = z.infer<typeof insertLikeSchema>;
export type Like = typeof likes.$inferSelect;

export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type Follow = typeof follows.$inferSelect;

// Extended types for frontend
export interface CheckInWithDetails extends CheckIn {
  user: User;
  drink: Drink;
  cafe?: Cafe;
  roaster?: Roaster;
  likesCount: number;
  isLiked: boolean;
}

export interface UserProfile extends User {
  checkInsCount: number;
  followersCount: number;
  followingCount: number;
  uniqueDrinksCount: number;
}

// Cafe with distance for nearby feature
export interface CafeWithDistance extends Cafe {
  distance?: number;
}

// Supported cities
export const SUPPORTED_CITIES = ["Jeddah", "Medina", "Riyadh"] as const;
export type SupportedCity = (typeof SUPPORTED_CITIES)[number];

export const CITY_TRANSLATIONS: Record<
  SupportedCity,
  { ar: string; en: string }
> = {
  Jeddah: { ar: "جدة", en: "Jeddah" },
  Medina: { ar: "المدينة المنورة", en: "Medina" },
  Riyadh: { ar: "الرياض", en: "Riyadh" },
};
