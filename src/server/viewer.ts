import { auth, clerkClient } from "@clerk/tanstack-react-start/server"
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

export async function getUserDisplayName(userId: string) {
  try {
    const user = await clerkClient().users.getUser(userId)

    return (
      user.fullName ??
      user.username ??
      user.primaryEmailAddress?.emailAddress ??
      "Signed in"
    )
  } catch {
    return "Signed in"
  }
}
