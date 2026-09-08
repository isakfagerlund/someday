import { auth } from "@clerk/tanstack-react-start/server"
import { env } from "cloudflare:workers"

import { getBoardById } from "../db/boards"

export async function getViewerId() {
  const { userId } = await auth()

  return userId ?? null
}

export async function requireOwnedBoard(boardId: string) {
  const userId = await getViewerId()

  if (!userId) throw new Error("Your session expired. Refresh and sign in again.")

  const board = await getBoardById(env.DB, boardId)

  if (!board || board.clerkOwnerId !== userId) throw new Error("You do not own this board")

  return { board, userId }
}
