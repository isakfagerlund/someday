import { createServerFn } from "@tanstack/react-start"
import { env } from "cloudflare:workers"
import { z } from "zod"

import { purgeBoardCache } from "../catalog-cache"
import { getProductBoard } from "../db/boards"
import * as db from "../db/products"
import { categories } from "../domain/product"
import { deleteProductImage } from "../images"
import {
  createProduct as importProduct,
  previewProduct as importPreview,
} from "../import/import-product"
import { getViewerId, requireOwnedBoard } from "./viewer"

const productIdInput = z.object({ id: z.uuid() })

export const maxUploadBytes = 20_000_000

const createProductFields = z.object({
  sourceUrl: z.string().trim().min(1),
  canonicalUrl: z.string().trim().min(1),
  name: z.string().trim().min(1).max(300),
  brand: z.string().trim().min(1).max(150),
  category: z.enum(categories),
  imageUrl: z.string().trim(),
  method: z.enum(["direct", "fallback", "platform", "rendered", "search"]),
})

// Multipart so an uploaded image can travel with the fields. imageFile is
// absent when the curator picked one of the shop's images instead.
function parseCreateProductInput(form: FormData) {
  const imageFile = form.get("imageFile")

  form.delete("imageFile")

  const fields = createProductFields.parse(Object.fromEntries(form))

  if (imageFile instanceof File && imageFile.size > maxUploadBytes) {
    throw new Error("That image is larger than 20 MB.")
  }

  return { ...fields, imageFile: imageFile instanceof File ? imageFile : undefined }
}

export const previewProduct = createServerFn({ method: "POST" })
  .validator(z.object({ url: z.string().trim().min(1) }))
  .handler(async ({ data }) => {
    await requireOwnedBoard()

    return importPreview(data.url, env)
  })

export const createProduct = createServerFn({ method: "POST" })
  .validator((form: FormData) => parseCreateProductInput(form))
  .handler(async ({ data, context }) => {
    const { board } = await requireOwnedBoard()
    const product = await importProduct(data, board.id, env)

    await purgeBoardCache(context.ctx, board.id)

    return product
  })

export const updateProduct = createServerFn({ method: "POST" })
  .validator(
    productIdInput.extend({
      name: z.string().trim().min(1),
      brand: z.string().trim().min(1),
      category: z.enum(categories),
    }),
  )
  .handler(async ({ data: { id, ...updates }, context }) => {
    const boardId = await requireProductOwnership(id)
    const product = await db.updateProduct(env.DB, id, boardId, updates)

    if (!product) throw new Error("Product not found")

    await purgeBoardCache(context.ctx, boardId)

    return product
  })

export const deleteProduct = createServerFn({ method: "POST" })
  .validator(productIdInput)
  .handler(async ({ data: { id }, context }) => {
    const boardId = await requireProductOwnership(id)
    const deleted = await db.deleteProduct(env.DB, id, boardId)

    if (!deleted) throw new Error("Product not found")

    if (deleted.processedImageKey) {
      await deleteProductImage(env.IMAGE_BUCKET, deleted.processedImageKey).catch(
        (error: unknown) =>
          console.error(
            JSON.stringify({
              message: "failed to delete product image",
              productId: id,
              error: error instanceof Error ? error.message : String(error),
            }),
          ),
      )
    }

    await purgeBoardCache(context.ctx, boardId)
  })

async function requireProductOwnership(productId: string) {
  const userId = await getViewerId()
  const productBoard = await getProductBoard(env.DB, productId)

  if (!productBoard) throw new Error("Product not found")
  if (!userId || productBoard.clerkOwnerId !== userId) {
    throw new Error("You do not own this board")
  }

  return productBoard.boardId
}
