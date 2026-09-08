import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { env } from "cloudflare:workers"

import { listBoardsByOwnerId, getBoardBySlug } from "../db/boards"
import { listProducts } from "../db/products"
import { isBoardSlug } from "../domain/board"
import { getViewerId } from "./viewer"

export const loadHome = createServerFn().handler(async () => {
  const userId = await getViewerId()
  const ownerBoards = userId
    ? await listBoardsByOwnerId(env.DB, userId)
    : []

  return {
    clerkPublishableKey: env.CLERK_PUBLISHABLE_KEY,
    ownerBoards,
    signedIn: userId !== null,
  }
})

export const loadBoard = createServerFn()
  .validator((input: { slug: string }) => input)
  .handler(async ({ data: { slug } }) => {
    const board = isBoardSlug(slug)
      ? await getBoardBySlug(env.DB, slug)
      : undefined

    if (!board) throw notFound()

    const userId = await getViewerId()
    const canManage = board.clerkOwnerId === userId
    const [products, ownerBoards] = await Promise.all([
      listProducts(env.DB, board.id),
      canManage && userId ? listBoardsByOwnerId(env.DB, userId) : Promise.resolve([]),
    ])

    return {
      board,
      canManage,
      hasMultipleBoards: ownerBoards.length > 1,
      clerkPublishableKey: env.CLERK_PUBLISHABLE_KEY,
      products,
      signedIn: userId !== null,
    }
  })

export const loadOwnerBoardPath = createServerFn().handler(async () => {
  const userId = await getViewerId()
  const boards = userId ? await listBoardsByOwnerId(env.DB, userId) : []

  return boards.length === 1 ? `/${encodeURIComponent(boards[0].slug)}` : "/"
})
