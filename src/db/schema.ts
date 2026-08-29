import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

import { categories, type SubjectPosition } from "../domain/product"

const now = sql`(unixepoch() * 1000)`

export const boards = sqliteTable("boards", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  clerkOwnerId: text("clerk_owner_id").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
})

export const products = sqliteTable(
  "products",
  {
    id: text("id").notNull().primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id),
    sourceUrl: text("source_url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    category: text("category", { enum: categories }).notNull(),
    originalImageUrl: text("original_image_url").notNull().default(""),
    processedImageKey: text("image_key").notNull(),
    backgroundRemoved: integer("background_removed", { mode: "boolean" })
      .notNull()
      .default(false),
    subjectScale: real("subject_scale").notNull().default(0.8),
    subjectPosition: text("subject_position", { mode: "json" })
      .$type<SubjectPosition>()
      .notNull()
      .default(sql`'{"x":0.5,"y":0.5}'`),
    importEvidence: text("import_evidence", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (table) => [
    check(
      "products_category_check",
      sql`${table.category} in ('Clothing', 'Accessories', 'Tech', 'Other')`,
    ),
    index("products_catalog_index").on(table.boardId, table.createdAt),
    index("products_category_catalog_index").on(
      table.boardId,
      table.category,
      table.createdAt,
    ),
    uniqueIndex("products_board_url_unique").on(
      table.boardId,
      table.canonicalUrl,
    ),
  ],
)
