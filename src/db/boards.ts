import { and, eq, isNull, sql } from "drizzle-orm"

import { createDb } from "./index"
import { boardSlugs, boards, products } from "./schema"

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

// Every slug a new board has to avoid: the live ones and the renamed-away ones.
export async function listTakenSlugs(database: D1Database) {
  const db = createDb(database)
  const [live, past] = await Promise.all([
    db.select({ slug: boards.slug }).from(boards).all(),
    db.select({ slug: boardSlugs.slug }).from(boardSlugs).all(),
  ])

  return [...live, ...past].map((row) => row.slug)
}

export function getBoardBySlug(database: D1Database, slug: string) {
  return createDb(database)
    .select(boardColumns)
    .from(boards)
    .where(and(eq(boards.slug, slug), isNull(boards.archivedAt)))
    .get()
}

// The board a renamed-away slug should redirect to.
export function getBoardByPastSlug(database: D1Database, slug: string) {
  return createDb(database)
    .select(boardColumns)
    .from(boardSlugs)
    .innerJoin(boards, eq(boardSlugs.boardId, boards.id))
    .where(and(eq(boardSlugs.slug, slug), isNull(boards.archivedAt)))
    .get()
}

export function getBoardById(database: D1Database, id: string) {
  return createDb(database)
    .select(boardColumns)
    .from(boards)
    .where(and(eq(boards.id, id), isNull(boards.archivedAt)))
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
    .where(and(eq(boards.clerkOwnerId, ownerId), isNull(boards.archivedAt)))
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

export async function renameBoard(
  database: D1Database,
  board: Board,
  rename: { name: string; slug: string },
) {
  const db = createDb(database)

  await db.batch([
    // Keep the old slug pointing here, and stop redirecting the new one.
    db.insert(boardSlugs).values({ slug: board.slug, boardId: board.id }).onConflictDoNothing(),
    db.delete(boardSlugs).where(eq(boardSlugs.slug, rename.slug)),
    db.update(boards).set(rename).where(eq(boards.id, board.id)),
  ])
}

export function archiveBoard(database: D1Database, id: string) {
  return createDb(database)
    .update(boards)
    .set({ archivedAt: new Date() })
    .where(eq(boards.id, id))
    .run()
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
