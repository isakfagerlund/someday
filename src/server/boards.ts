import { createServerFn } from "@tanstack/react-start"
import { env } from "cloudflare:workers"
import { z } from "zod"

import { purgeBoardCache, purgeHomeCache } from "../catalog-cache"
import * as db from "../db/boards"
import { boardSlugFromName, uniqueBoardSlug } from "../domain/board"
import { getViewerId, requireOwnedBoard } from "./viewer"

const boardName = z.string().trim().min(1).max(80)
const boardIdInput = z.object({ boardId: z.string().min(1) })

export const createBoard = createServerFn({ method: "POST" })
  .validator(z.object({ name: boardName }))
  .handler(async ({ data, context }) => {
    const userId = await getViewerId()

    if (!userId) throw new Error("Your session expired. Refresh and sign in again.")

    const board = await db.insertBoard(env.DB, {
      id: crypto.randomUUID(),
      name: data.name,
      slug: await pickSlug(data.name),
      clerkOwnerId: userId,
    })

    await purgeHomeCache(context.ctx)

    return { slug: board.slug }
  })

export const renameBoard = createServerFn({ method: "POST" })
  .validator(boardIdInput.extend({ name: boardName }))
  .handler(async ({ data, context }) => {
    const { board } = await requireOwnedBoard(data.boardId)
    const slug = await pickSlug(data.name, board.slug)

    await db.renameBoard(env.DB, board, { name: data.name, slug })
    await purgeBoard(context.ctx, board.id)

    return { slug }
  })

export const deleteBoard = createServerFn({ method: "POST" })
  .validator(boardIdInput)
  .handler(async ({ data, context }) => {
    const { board } = await requireOwnedBoard(data.boardId)

    await db.archiveBoard(env.DB, board.id)
    await purgeBoard(context.ctx, board.id)
  })

// The board keeps its own slug, so renaming "Gifts" to "Gifts!" is a no-op.
async function pickSlug(name: string, ownSlug?: string) {
  if (!boardSlugFromName(name)) {
    throw new Error("Enter a name with at least one letter or number.")
  }

  const taken = await db.listTakenSlugs(env.DB)

  return uniqueBoardSlug(name, taken.filter((slug) => slug !== ownSlug))
}

function purgeBoard(ctx: ExecutionContext, boardId: string) {
  return Promise.all([purgeBoardCache(ctx, boardId), purgeHomeCache(ctx)])
}
