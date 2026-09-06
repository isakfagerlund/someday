import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { env } from "cloudflare:workers"

import { getBoardByOwnerId, getBoardBySlug } from "../db/boards"
import { listProducts } from "../db/products"
import { isBoardSlug } from "../domain/board"
import type { Category } from "../domain/product"
import { getViewerId } from "./viewer"

export const loadHome = createServerFn().handler(async () => {
  const userId = await getViewerId()
  const ownerBoard = userId
    ? await getBoardByOwnerId(env.DB, userId)
    : undefined

  return {
    clerkPublishableKey: env.CLERK_PUBLISHABLE_KEY,
    ownerBoard,
    signedIn: userId !== null,
  }
})

export const loadBoard = createServerFn()
  .validator((input: { slug: string; category: Category | null }) => input)
  .handler(async ({ data: { slug, category } }) => {
    const board = isBoardSlug(slug)
      ? await getBoardBySlug(env.DB, slug)
      : undefined

    if (!board) throw notFound()

    const userId = await getViewerId()
    const products = await listProducts(env.DB, board.id, category)

    return {
      board,
      canManage: board.clerkOwnerId === userId,
      clerkPublishableKey: env.CLERK_PUBLISHABLE_KEY,
      products,
      signedIn: userId !== null,
    }
  })

export const loadOwnerBoardPath = createServerFn().handler(async () => {
  const userId = await getViewerId()
  const board = userId ? await getBoardByOwnerId(env.DB, userId) : undefined

  return board ? `/${encodeURIComponent(board.slug)}` : "/"
})
