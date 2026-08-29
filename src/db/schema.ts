import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core"

import { categories } from "../domain/product"

export const defaultBoardId = "default"

const now = sql`(unixepoch() * 1000)`

export const boards = sqliteTable("boards", {
  id: text("id").notNull().primaryKey(),
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
    canonicalUrl: text("canonical_url").notNull().unique(),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    category: text("category", { enum: categories }).notNull(),
    imageKey: text("image_key").notNull(),
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
  ],
)
