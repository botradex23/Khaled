import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  password: text("password"),
  googleId: text("google_id").unique(),
  appleId: text("apple_id").unique(),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true })
  .extend({
    password: z.string().optional(),
    googleId: z.string().optional(),
    appleId: z.string().optional(),
    profilePicture: z.string().optional(),
  })
  .refine(data => {
    // User must authenticate with either password or OAuth
    return (
      (data.password !== undefined && data.password !== '') || 
      (data.googleId !== undefined && data.googleId !== '') ||
      (data.appleId !== undefined && data.appleId !== '')
    );
  }, {
    message: "User must authenticate with password or social login",
    path: ["authentication"]
  })
  .transform(data => ({
    ...data,
    firstName: data.firstName || "",
    lastName: data.lastName || ""
  }));

// Bots table schema
export const bots = pgTable("bots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  strategy: text("strategy").notNull(),
  description: text("description").notNull(),
  minInvestment: decimal("min_investment").notNull(),
  monthlyReturn: decimal("monthly_return").notNull(),
  riskLevel: integer("risk_level").notNull(),
  rating: decimal("rating").notNull(),
  isPopular: boolean("is_popular").notNull().default(false),
  userId: integer("user_id").notNull(),
});

export const botSchema = createInsertSchema(bots);

// Pricing plans table schema
export const pricingPlans = pgTable("pricing_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price").notNull(),
  features: text("features").array().notNull(),
  isPopular: boolean("is_popular").notNull().default(false),
});

export const pricingPlanSchema = createInsertSchema(pricingPlans);

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Bot = typeof bots.$inferSelect;
export type InsertBot = z.infer<typeof botSchema>;
export type PricingPlan = typeof pricingPlans.$inferSelect;
export type InsertPricingPlan = z.infer<typeof pricingPlanSchema>;
