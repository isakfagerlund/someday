import { auth } from "@clerk/tanstack-react-start/server"
import { env } from "cloudflare:workers"

import { getBoardByOwnerId } from "../db/boards"

export async function getViewerId() {
  const { userId } = await auth()

  return userId ?? null
}

export async function requireOwnedBoard() {
  const userId = await getViewerId()

  if (!userId) throw new Error("Your session expired. Refresh and sign in again.")

  const board = await getBoardByOwnerId(env.DB, userId)

  if (!board) throw new Error("You do not own a board")

  return { board, userId }
}
