import { eq, sql } from "drizzle-orm"

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

export function getBoardById(database: D1Database, id: string) {
  return createDb(database)
    .select(boardColumns)
    .from(boards)
    .where(eq(boards.id, id))
    .get()
}

export type BoardSummary = Awaited<ReturnType<typeof listBoardsByOwnerId>>[number]

export function listBoardsByOwnerId(database: D1Database, ownerId: string) {
  return createDb(database)
    .select({
      ...boardColumns,
      productCount: sql<number>`(
        select count(*) from products where products.board_id = boards.id
      )`.mapWith(Number),
      imageKey: sql<string | null>`(
        select image_key from products where products.board_id = boards.id
        order by created_at desc, id limit 1
      )`,
    })
    .from(boards)
    .where(eq(boards.clerkOwnerId, ownerId))
    .orderBy(boards.createdAt, boards.id)
    .all()
}

export async function insertBoard(
  database: D1Database,
  board: Pick<Board, "id" | "name" | "slug" | "clerkOwnerId">,
): Promise<Board> {
  const created = await createDb(database)
    .insert(boards)
    .values(board)
    .returning(boardColumns)
    .get()

  if (!created) throw new Error("D1 did not return the created board")

  return created
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
