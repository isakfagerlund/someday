import { eq } from "drizzle-orm"

import { createDb } from "./index"
import { boards, products } from "./schema"

const boardColumns = {
  id: boards.id,
  name: boards.name,
  slug: boards.slug,
  clerkOwnerId: boards.clerkOwnerId,
}

export type Board = Pick<
  typeof boards.$inferSelect,
  "id" | "name" | "slug" | "clerkOwnerId"
>

export function listBoards(database: D1Database) {
  return createDb(database)
    .select(boardColumns)
    .from(boards)
    .orderBy(boards.name)
    .all()
}

export function getBoardBySlug(database: D1Database, slug: string) {
  return createDb(database)
    .select(boardColumns)
    .from(boards)
    .where(eq(boards.slug, slug))
    .get()
}

export function getBoardByOwnerId(database: D1Database, ownerId: string) {
  return createDb(database)
    .select(boardColumns)
    .from(boards)
    .where(eq(boards.clerkOwnerId, ownerId))
    .get()
}

export function getProductBoard(database: D1Database, productId: string) {
  return createDb(database)
    .select({
      boardId: boards.id,
      boardSlug: boards.slug,
      clerkOwnerId: boards.clerkOwnerId,
    })
    .from(products)
    .innerJoin(boards, eq(products.boardId, boards.id))
    .where(eq(products.id, productId))
    .get()
}
