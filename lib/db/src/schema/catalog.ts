import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  parent_id: uuid("parent_id"),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  description: text("description"),
  sort_order: integer("sort_order").notNull().default(0),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parent_id],
    references: [categories.id],
    relationName: "category_children",
  }),
  children: many(categories, {
    relationName: "category_children",
  }),
  products: many(products),
}));

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  category_id: uuid("category_id").notNull(),
  name: varchar("name", { length: 220 }).notNull(),
  slug: varchar("slug", { length: 240 }).notNull().unique(),
  short_description: varchar("short_description", { length: 500 }),
  description: text("description"),
  brand: varchar("brand", { length: 120 }),
  material: varchar("material", { length: 120 }),
  wall_thickness_mm: varchar("wall_thickness_mm", { length: 20 }),
  diameter_mm: integer("diameter_mm"),
  application_tags: text("application_tags").array().notNull().default([]),
  compatibility_notes: text("compatibility_notes"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.category_id],
    references: [categories.id],
  }),
  skus: many(skus),
}));

export const skus = pgTable("skus", {
  id: uuid("id").primaryKey().defaultRandom(),
  product_id: uuid("product_id").notNull(),
  article: varchar("article", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 220 }).notNull(),
  price_rub: varchar("price_rub", { length: 20 }),
  stock_status: varchar("stock_status", { length: 40 }).notNull().default("unknown"),
  attributes: text("attributes").notNull().default("{}"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const skusRelations = relations(skus, ({ one }) => ({
  product: one(products, {
    fields: [skus.product_id],
    references: [products.id],
  }),
}));

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type SKU = typeof skus.$inferSelect;
