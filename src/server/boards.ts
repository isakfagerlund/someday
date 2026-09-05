import { createServerFn } from "@tanstack/react-start"
import { env } from "cloudflare:workers"
import { z } from "zod"

import { purgeHomeCache } from "../catalog-cache"
import { getBoardByOwnerId, insertBoard, listBoards } from "../db/boards"
import { boardSlugFromName, uniqueBoardSlug } from "../domain/board"
import { getViewerId } from "./viewer"

const createBoardInput = z.object({ name: z.string().trim().min(1).max(80) })

export const createBoard = createServerFn({ method: "POST" })
  .validator(createBoardInput)
  .handler(async ({ data, context }) => {
    const userId = await getViewerId()

    if (!userId) throw new Error("Your session expired. Refresh and sign in again.")

    const ownedBoard = await getBoardByOwnerId(env.DB, userId)

    if (ownedBoard) return { slug: ownedBoard.slug }
    if (!boardSlugFromName(data.name)) {
      throw new Error("Enter a name with at least one letter or number.")
    }

    const boards = await listBoards(env.DB)
    const board = await insertBoard(env.DB, {
      id: crypto.randomUUID(),
      name: data.name,
      slug: uniqueBoardSlug(data.name, boards.map((board) => board.slug)),
      clerkOwnerId: userId,
    })

    await purgeHomeCache(context.ctx)

    return { slug: board.slug }
  })
